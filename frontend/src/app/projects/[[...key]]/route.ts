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

function sanitizeKey(parts: string[], prefix = ""): string | null {
  const joined = (parts || []).join("/");
  if (joined.includes("..")) return null; // prevent path traversal
  let key =
    (prefix ? prefix.replace(/\/$/, "") + "/" : "") +
    joined.replace(/^\/+/, "");
  if (!joined || joined.endsWith("/")) key += "index.html";
  return key;
}

function getS3Client() {
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
  console.log(`[DEBUG] Creating S3 client with region: ${region}`);
  console.log(
    `[DEBUG] Environment: AWS_REGION=${process.env.AWS_REGION}, AWS_DEFAULT_REGION=${process.env.AWS_DEFAULT_REGION}`
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
  key: string
): Promise<string | null> {
  const s3 = getS3Client();
  console.log(`[DEBUG] Checking S3 object: bucket=${bucket}, key=${key}`);

  try {
    // Ensure the object exists to avoid redirecting to a 404
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`[DEBUG] HeadObject succeeded for ${key}`);
  } catch (err: unknown) {
    console.log(`[DEBUG] HeadObject failed:`, err);
    const status = getHttpStatus(err);
    console.log(`[DEBUG] HTTP status: ${status}`);
    if (status === 404) return null;
    // For access denied or other transient errors, treat as not found to avoid leaking
    return null;
  }

  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 60 }
    );
    console.log(`[DEBUG] Generated presigned URL for ${key}`);
    return url;
  } catch (err: unknown) {
    console.log(`[DEBUG] Failed to generate presigned URL:`, err);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key?: string[] }> }
) {
  // Public projects - no authentication required

  // Use public projects bucket for /projects route (no auth required)
  const bucket = process.env.PUBLIC_PROJECTS_BUCKET || "";
  const prefix = process.env.PUBLIC_PROJECTS_PREFIX || "";
  console.log(`[DEBUG] GET /projects - bucket: ${bucket}, prefix: ${prefix}`);

  if (!bucket) {
    console.log("[DEBUG] No bucket configured");
    return new Response("Public projects bucket not configured", {
      status: 500,
    });
  }

  const { key: keyParts } = await context.params;
  console.log(`[DEBUG] keyParts type: ${typeof keyParts}, value: ${JSON.stringify(keyParts)}, length: ${keyParts?.length}`);
  
  // Debug route: return debug info if no key parts provided or if debug flag is present
  const isDebugRequest = !keyParts || keyParts.length === 0 || (keyParts && keyParts[0] === 'debug');
  
  if (isDebugRequest) {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      message: "Debug info for /projects route",
      keyParts: keyParts,
      keyPartsType: typeof keyParts,
      keyPartsLength: keyParts?.length,
      environment: {
        PUBLIC_PROJECTS_BUCKET: process.env.PUBLIC_PROJECTS_BUCKET || "NOT_SET",
        NDA_PROJECTS_BUCKET: process.env.NDA_PROJECTS_BUCKET || "NOT_SET",
        AWS_REGION: process.env.AWS_REGION || "NOT_SET",
        AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || "NOT_SET",
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "SET" : "NOT_SET",
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "NOT_SET",
        NODE_ENV: process.env.NODE_ENV || "NOT_SET",
        ENV_PROFILE: process.env.ENV_PROFILE || "NOT_SET",
      },
      bucket,
      prefix,
    };
    
    return Response.json(debugInfo, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
  const key = sanitizeKey(keyParts || [], prefix);
  console.log(
    `[DEBUG] Sanitized key: ${key}, keyParts: ${JSON.stringify(keyParts)}`
  );

  if (!key) return new Response("Bad path", { status: 400 });

  const url = await presignIfExists(bucket, key);
  console.log(
    `[DEBUG] presignIfExists result: ${url ? "URL generated" : "null (not found)"}`
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
  context: { params: Promise<{ key?: string[] }> }
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
