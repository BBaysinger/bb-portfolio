/**
 * NDA projects file proxy route: `/nda-projects/[[...key]]`.
 *
 * Serves NDA project assets from a private S3 bucket, enforcing authentication per request.
 *
 * Security model:
 * - Auth is checked server-side by calling the backend session endpoint (`/api/users/me`) with the
 *   incoming request cookies.
 * - Responses are marked `Cache-Control: private` to avoid CDN/proxy/shared cache leakage.
 * - URL/key existence is not treated as sensitive in this app; file contents are.
 *
 * Behavior:
 * - Supports `GET` streaming (including `Range` requests when provided by the client).
 * - Supports `HEAD` for metadata checks.
 * - Supports conditional requests via `ETag` / `Last-Modified` (returns 304 when unmodified).
 *
 * Runtime:
 * - Uses Node.js runtime because we may receive an AWS SDK Node `Readable` stream and convert it to
 *   a Web `ReadableStream` for the Next.js response.
 */

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

/**
 * Resolves the backend base URL for auth checks.
 *
 * Prefers `BACKEND_INTERNAL_URL` when provided, otherwise falls back to profile-based Docker
 * service names (prod/dev/local) and finally localhost.
 */
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

  if (profile === "prod") return "http://bb-portfolio-backend-prod:3000";
  if (profile === "dev") return "http://bb-portfolio-backend-dev:3000";
  if (profile === "local") return "http://bb-portfolio-backend-local:3001";

  return "http://localhost:8081";
}

/**
 * Validates that the request is authenticated by forwarding cookies to the backend session endpoint.
 *
 * This is intentionally conservative:
 * - Treats any fetch/parsing failure as unauthenticated.
 * - Avoids caching (`no-store`) because auth is per-request.
 */
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

    let res = await tryFetch(`${backend}/api/users/me`);
    if (!res.ok && res.status === 401) {
      res = await tryFetch(`${backend}/api/users/me/`);
    }

    if (!res.ok) return false;
    const user = await parseUser(res);
    return hasIdentity(user);
  } catch {
    return false;
  }
}

/**
 * Sanitizes and normalizes a catch-all route param into an S3 object key.
 *
 * - Rejects path traversal (`..`).
 * - Applies an optional prefix.
 * - If the path is empty/"directory-like" (no extension), defaults to `index.html`.
 */
function sanitizeKey(parts: string[], prefix = ""): string | null {
  const joined = (parts || []).join("/");
  if (joined.includes("..")) return null;
  let key =
    (prefix ? prefix.replace(/\/$/, "") + "/" : "") +
    joined.replace(/^\/+/, "");
  if (!joined || joined.endsWith("/") || !joined.includes("."))
    key += (key && !key.endsWith("/") ? "/" : "") + "index.html";
  return key;
}

/**
 * Builds an AWS S3 client using the configured region.
 */
function getS3Client() {
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
  return new S3Client({ region });
}

/**
 * Extracts an AWS SDK HTTP status code (when present).
 */
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

/**
 * Best-effort content-type inference for common static asset extensions.
 *
 * S3 may return `application/octet-stream` depending on upload metadata; this keeps rendering sane
 * for simple cases.
 */
function guessContentType(key: string): string | null {
  const k = key.toLowerCase();
  if (k.endsWith(".html") || k.endsWith(".htm"))
    return "text/html; charset=utf-8";
  if (k.endsWith(".js") || k.endsWith(".mjs"))
    return "text/javascript; charset=utf-8";
  if (k.endsWith(".css")) return "text/css; charset=utf-8";
  if (k.endsWith(".json")) return "application/json; charset=utf-8";
  if (k.endsWith(".svg")) return "image/svg+xml";
  if (k.endsWith(".png")) return "image/png";
  if (k.endsWith(".jpg") || k.endsWith(".jpeg")) return "image/jpeg";
  if (k.endsWith(".gif")) return "image/gif";
  if (k.endsWith(".webp")) return "image/webp";
  if (k.endsWith(".ico")) return "image/x-icon";
  if (k.endsWith(".mp3")) return "audio/mpeg";
  if (k.endsWith(".mp4")) return "video/mp4";
  if (k.endsWith(".woff")) return "font/woff";
  if (k.endsWith(".woff2")) return "font/woff2";
  if (k.endsWith(".ttf")) return "font/ttf";
  return null;
}

/**
 * Retrieves object metadata from S3 (ETag, LastModified, ContentType, etc.).
 */
async function headObject(bucket: string, key: string) {
  const s3 = getS3Client();
  return s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Determines whether the client has a fresh cached copy based on request conditional headers.
 */
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

/**
 * Streams an S3 object to the caller.
 *
 * - Supports `Range` requests.
 * - Sets private cache headers and basic hardening headers.
 * - Returns `null` when the object is not found.
 */
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

    const contentType = res.ContentType || meta.ContentType;
    const inferred = guessContentType(key);
    if (contentType && contentType !== "application/octet-stream") {
      headers.set("Content-Type", contentType);
    } else if (inferred) {
      headers.set("Content-Type", inferred);
    }

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

/**
 * Computes an optional S3 prefix for NDA project assets.
 *
 * Keep this in sync with upload/sync scripts.
 */
function computeProjectsPrefix(): string {
  // Keep this identical to how upload scripts lay out keys in S3:
  // - By default, project files are synced to the bucket root.
  // - If an optional prefix is configured, it should be used verbatim.
  return (process.env.NDA_PROJECTS_PREFIX || "").replace(/\/+$/, "");
}

/**
 * `GET` handler for NDA project assets.
 *
 * Authenticates per-request, normalizes the URL path into an S3 key, serves 304 on conditional
 * hits, and otherwise streams the object with private cache headers.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key?: string[] }> },
) {
  const authed = await isAuthenticated(req);
  if (!authed) {
    return new Response("Unauthorized", { status: 401 });
  }

  const bucket = process.env.NDA_PROJECTS_BUCKET || "";
  if (!bucket) {
    return new Response("NDA projects bucket not configured", { status: 500 });
  }

  const { key: keyParts } = await context.params;
  const key = sanitizeKey(keyParts || [], computeProjectsPrefix());
  if (!key) return new Response("Bad path", { status: 400 });

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

/**
 * `HEAD` handler for NDA project assets.
 *
 * Uses the same auth model as `GET` but returns only headers (ETag/Last-Modified) when available.
 */
export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ key?: string[] }> },
) {
  const authed = await isAuthenticated(req);
  if (!authed) return new Response("Unauthorized", { status: 401 });

  const bucket = process.env.NDA_PROJECTS_BUCKET || "";
  if (!bucket)
    return new Response("NDA projects bucket not configured", { status: 500 });

  const { key: keyParts } = await context.params;
  const key = sanitizeKey(keyParts || [], computeProjectsPrefix());
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
