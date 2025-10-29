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

function getBackendBase(): string {
  const env = (
    process.env.ENV_PROFILE ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  const prefix = env ? `${env.toUpperCase()}_` : "";
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = process.env[n];
      if (v) return v;
    }
    return "";
  };
  const base =
    pick(`${prefix}BACKEND_INTERNAL_URL`, `${prefix}NEXT_PUBLIC_BACKEND_URL`) ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8081";
  return base.replace(/\/$/, "");
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const backend = getBackendBase();

    const tryFetch = async (url: string) =>
      fetch(url, {
        method: "GET",
        headers: {
          ...(cookieHeader && { Cookie: cookieHeader }),
          Accept: "application/json",
        },
        cache: "no-store",
      });

    let res = await tryFetch(`${backend}/api/users/me`);
    if (!res.ok && res.status === 401) {
      res = await tryFetch(`${backend}/api/users/me/`);
    }
    return res.ok;
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
  if (!joined || joined.endsWith("/")) key += "index.html";
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

async function presignIfExists(
  bucket: string,
  key: string,
): Promise<string | null> {
  const s3 = getS3Client();
  try {
    // Ensure the object exists to avoid redirecting to a 404
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err: unknown) {
    const status = getHttpStatus(err);
    if (status === 404) return null;
    // For access denied or other transient errors, treat as not found to avoid leaking
    return null;
  }
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 60 },
  );
  return url;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key?: string[] }> },
) {
  // Gate by the same login used for NDA pages
  const authed = await isAuthenticated(req);
  if (!authed) {
    // Hide existence to unauthenticated users
    return new Response("Not found", { status: 404 });
  }

  const bucket = process.env.PROJECTS_S3_BUCKET || "";
  const prefix = process.env.PROJECTS_S3_PREFIX || "";
  if (!bucket) {
    return new Response("Projects bucket not configured", { status: 500 });
  }

  const { key: keyParts } = await context.params;
  const key = sanitizeKey(keyParts || [], prefix);
  if (!key) return new Response("Bad path", { status: 400 });

  const url = await presignIfExists(bucket, key);
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
  // Align HEAD with GET behavior (useful for media players)
  const authed = await isAuthenticated(req);
  if (!authed) return new Response("Not found", { status: 404 });

  const bucket = process.env.PROJECTS_S3_BUCKET || "";
  const prefix = process.env.PROJECTS_S3_PREFIX || "";
  if (!bucket)
    return new Response("Projects bucket not configured", { status: 500 });

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
