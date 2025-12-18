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

function getBackendBase(): string {
  const rawProfile = (
    process.env.ENV_PROFILE ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  const profile = rawProfile.startsWith("prod")
    ? "prod"
    : rawProfile === "development" || rawProfile.startsWith("dev")
      ? "dev"
      : rawProfile.startsWith("local")
        ? "local"
        : rawProfile;
  const preferred = process.env.BACKEND_INTERNAL_URL || "";
  if (preferred) return preferred.replace(/\/$/, "");

  // Compose service DNS fallbacks by profile (works inside the docker network).
  if (profile === "prod") return "http://bb-portfolio-backend-prod:3000";
  if (profile === "dev") return "http://bb-portfolio-backend-dev:3000";
  if (profile === "local") return "http://bb-portfolio-backend-local:3001";

  // Host fallback (works when running backend on host or exposed compose port).
  return "http://localhost:8081";
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const backend = getBackendBase();

    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null;
    const hasIdentity = (u: unknown): boolean => {
      if (!isRecord(u)) return false;
      const id = u["id"];
      const email = u["email"];
      return (
        (typeof id === "string" && id.length > 0) ||
        (typeof email === "string" && email.length > 0)
      );
    };

    const parseUser = async (res: Response): Promise<unknown> => {
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return null;
      try {
        const payload: unknown = await res.json();
        if (isRecord(payload) && "user" in payload) return payload.user;
        return payload;
      } catch {
        return null;
      }
    };

    const tryFetch = async (url: string) =>
      fetch(url, {
        method: "GET",
        headers: {
          ...(cookieHeader && { Cookie: cookieHeader }),
          Accept: "application/json",
        },
        cache: "no-store",
      });

    console.log("[private] auth attempt", {
      hasCookie: Boolean(cookieHeader),
      cookie: cookieHeader,
      backend,
    });

    let res = await tryFetch(`${backend}/api/users/me`);
    console.log("[private] auth response", {
      url: `${backend}/api/users/me`,
      status: res.status,
      ok: res.ok,
    });
    if (!res.ok && res.status === 401) {
      res = await tryFetch(`${backend}/api/users/me/`);
      console.log("[private] auth response", {
        url: `${backend}/api/users/me/`,
        status: res.status,
        ok: res.ok,
      });
    }

    if (!res.ok) return false;
    const user = await parseUser(res);
    return hasIdentity(user);
  } catch {
    return false;
  }
}

function sanitizeKey(parts: string[], prefix = ""): string | null {
  const joined = (parts || []).join("/");
  if (joined.includes("..")) return null; // prevent path traversal
  let key =
    (prefix ? prefix.replace(/\/$/, "") + "/" : "") +
    joined.replace(/^\/+/, "");
  if (!joined || joined.endsWith("/") || !joined.includes("."))
    key += (key && !key.endsWith("/") ? "/" : "") + "index.html";
  return key;
}

function getS3Client() {
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
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
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    headers.set("X-Content-Type-Options", "nosniff");
    const status = res.ContentRange ? 206 : 200;
    return new Response(bodyStream, { status, headers });
  } catch (err: unknown) {
    const status = getHttpStatus(err);
    if (status === 404) return null;
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key?: string[] }> },
) {
  // Gate by the same login used for NDA pages
  const authed = await isAuthenticated(req);
  if (!authed) {
    // Conventional: reveal need for auth without leaking object existence
    return new Response("Unauthorized", { status: 401 });
  }

  // Use NDA projects bucket specifically for /private route
  const bucket = process.env.NDA_PROJECTS_BUCKET || "";
  const prefix = process.env.NDA_PROJECTS_PREFIX || "";
  if (!bucket) {
    return new Response("NDA projects bucket not configured", { status: 500 });
  }

  const { key: keyParts } = await context.params;
  const key = sanitizeKey(keyParts || [], prefix);
  if (!key) return new Response("Bad path", { status: 400 });

  // Metadata first to support conditional requests
  let meta;
  try {
    meta = await headObject(bucket, key);
  } catch (err: unknown) {
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
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");
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
  // Align HEAD with GET behavior (useful for media players)
  const authed = await isAuthenticated(req);
  if (!authed) return new Response("Unauthorized", { status: 401 });

  // Use NDA projects bucket specifically for /private route
  const bucket = process.env.NDA_PROJECTS_BUCKET || "";
  const prefix = process.env.NDA_PROJECTS_PREFIX || "";
  if (!bucket)
    return new Response("NDA projects bucket not configured", { status: 500 });

  const { key: keyParts } = await context.params;
  const key = sanitizeKey(keyParts || [], prefix);
  if (!key) return new Response("Bad path", { status: 400 });

  try {
    const meta = await headObject(bucket, key);
    const headers = new Headers();
    if (meta.ETag) headers.set("ETag", meta.ETag);
    if (meta.LastModified)
      headers.set("Last-Modified", meta.LastModified.toUTCString());
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(null, { status: 200, headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
