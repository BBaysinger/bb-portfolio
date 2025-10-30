import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // must evaluate auth per request
export const revalidate = 0;

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

async function presignIfExists(
  bucket: string,
  key: string,
): Promise<string | null> {
  const s3 = getS3Client();
  if (debug) console.info(`Checking S3 object: bucket=${bucket}, key=${key}`);

  try {
    // Ensure the object exists to avoid redirecting to a 404
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (debug) console.info(`HeadObject succeeded for ${key}`);
  } catch (err: unknown) {
    if (debug) console.info(`HeadObject failed for ${key}:`, err);
    const status = getHttpStatus(err);
    if (debug) console.info(`HTTP status: ${status}`);
    if (status === 404) return null;
    // For access denied or other transient errors, treat as not found to avoid leaking
    return null;
  }

  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 60 },
    );
    if (debug) console.info(`Generated presigned URL for ${key}`);
    return url;
  } catch (err: unknown) {
    if (debug)
      console.info(`Failed to generate presigned URL for ${key}:`, err);
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

  const url = await presignIfExists(bucket, key);
  if (debug)
    console.info(
      `presignIfExists result: ${url ? "URL generated" : "null (not found)"}`,
    );

  if (!url) return new Response("Not found", { status: 404 });

  // Short-lived redirect to the private object
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store, private",
    },
  });
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
