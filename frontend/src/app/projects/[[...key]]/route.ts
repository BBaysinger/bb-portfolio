import { Readable } from "stream";

import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // must evaluate auth per request
export const revalidate = 0;

const PUBLIC_CACHE_CONTROL = "public, max-age=0, s-maxage=0, must-revalidate";

// Debug flag for S3 route logging
const debug =
  process.env.DEBUG_S3_ROUTES === "1" || process.env.NODE_ENV !== "production";

function sanitizeKey(parts: string[], prefix = ""): string | null {
  const joined = (parts || []).join("/");
  if (joined.includes("..")) return null; // prevent path traversal
  let key =
    (prefix ? prefix.replace(/\/$/, "") + "/" : "") +
    joined.replace(/^\/+/, "");

  // Add index.html for directory paths (no file extension) or empty paths
  if (!joined || joined.endsWith("/") || !joined.includes(".")) {
    key += (key && !key.endsWith("/") ? "/" : "") + "index.html";
  }

  return key;
}

function getS3Client() {
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
  if (debug) console.info(`S3 client region: ${region}`);
  if (debug)
    console.info(
      `AWS region env: AWS_REGION=${process.env.AWS_REGION}, AWS_DEFAULT_REGION=${process.env.AWS_DEFAULT_REGION}`,
    );
  return new S3Client({ region });
}

function getHttpStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const meta = (err as { $metadata?: { httpStatusCode?: number } }).$metadata;
    return meta?.httpStatusCode;
  }
  return undefined;
}

function isWebReadableStream(x: unknown): x is ReadableStream<Uint8Array> {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as { getReader?: unknown }).getReader === "function"
  );
}

function toWebStream(body: unknown): ReadableStream<Uint8Array> | null {
  if (body == null) return null;
  if (isWebReadableStream(body)) return body;
  if (body instanceof Readable) {
    try {
      return Readable.toWeb(body) as ReadableStream<Uint8Array>;
    } catch {
      return null;
    }
  }
  return null;
}

async function headObject(bucket: string, key: string) {
  const s3 = getS3Client();
  return s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

function isUnmodified(
  req: NextRequest,
  etag?: string | undefined,
  lastModified?: Date | undefined,
): boolean {
  if (!etag && !lastModified) return false;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && etag && ifNoneMatch.split(/\s*,\s*/).includes(etag))
    return true;
  const ifModifiedSince = req.headers.get("if-modified-since");
  if (ifModifiedSince && lastModified) {
    const since = new Date(ifModifiedSince).getTime();
    if (!isNaN(since) && lastModified.getTime() <= since) return true;
  }
  return false;
}

async function streamObject(
  req: NextRequest,
  bucket: string,
  key: string,
  meta: Awaited<ReturnType<typeof headObject>>,
): Promise<Response | null> {
  const s3 = getS3Client();
  const range = req.headers.get("range") || undefined;
  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ...(range ? { Range: range } : {}),
      }),
    );
    const bodyStream = toWebStream(res.Body);
    if (!bodyStream) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    const etag = meta.ETag || res.ETag;
    if (res.ContentType) headers.set("Content-Type", res.ContentType);
    if (etag) headers.set("ETag", etag);
    if (meta.LastModified || res.LastModified)
      headers.set(
        "Last-Modified",
        (meta.LastModified || res.LastModified)!.toUTCString(),
      );
    if (res.ContentLength != null)
      headers.set("Content-Length", String(res.ContentLength));
    if (res.ContentRange) headers.set("Content-Range", res.ContentRange);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    headers.set("X-Content-Type-Options", "nosniff");
    const status = res.ContentRange ? 206 : 200;
    return new Response(bodyStream, { status, headers });
  } catch (err: unknown) {
    if (debug) console.info(`GetObject failed for ${key}:`, err);
    const status = getHttpStatus(err);
    if (status === 404) return null;
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key?: string[] }> },
) {
  // Public projects - no authentication required

  // Use public projects bucket for /projects route (no auth required)
  const bucket = process.env.PUBLIC_PROJECTS_BUCKET || "";
  const prefix = process.env.PUBLIC_PROJECTS_PREFIX || "";
  if (debug)
    console.info(`GET /projects - bucket: ${bucket}, prefix: ${prefix}`);

  if (!bucket) {
    if (debug) console.info("No bucket configured");
    return new Response("Public projects bucket not configured", {
      status: 500,
    });
  }

  const { key: keyParts } = await context.params;
  const key = sanitizeKey(keyParts || [], prefix);
  if (debug)
    console.info(
      `Sanitized key: ${key}, keyParts: ${JSON.stringify(keyParts)}`,
    );

  if (!key) return new Response("Bad path", { status: 400 });

  // Metadata first (cheaper + supports conditional)
  let meta;
  try {
    meta = await headObject(bucket, key);
  } catch (err: unknown) {
    if (debug) console.info(`HeadObject failed for ${key}:`, err);
    const status = getHttpStatus(err);
    if (status === 404) return new Response("Not found", { status: 404 });
    return new Response("Not found", { status: 404 });
  }

  const etag = meta.ETag;
  const lastMod = meta.LastModified;
  if (isUnmodified(req, etag, lastMod)) {
    const headers = new Headers();
    if (etag) headers.set("ETag", etag);
    if (lastMod) headers.set("Last-Modified", lastMod.toUTCString());
    headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(null, { status: 304, headers });
  }

  const resp = await streamObject(req, bucket, key, meta);
  return resp || new Response("Not found", { status: 404 });
}

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ key?: string[] }> },
) {
  // Public projects - no authentication required

  // Use public projects bucket for /projects route (no auth required)
  const bucket = process.env.PUBLIC_PROJECTS_BUCKET || "";
  const prefix = process.env.PUBLIC_PROJECTS_PREFIX || "";
  if (!bucket)
    return new Response("Public projects bucket not configured", {
      status: 500,
    });

  const { key: keyParts } = await context.params;
  const key = sanitizeKey(keyParts || [], prefix);
  if (!key) return new Response("Bad path", { status: 400 });

  const s3 = getS3Client();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return new Response(null, {
      status: 200,
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
