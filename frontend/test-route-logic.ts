// Test route logic directly
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

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
  const region = "us-west-2";
  return new S3Client({ region });
}

async function testRouteLogic() {
  const bucket = "bb-portfolio-projects-public";
  const prefix = "";

  // Test the exact logic from the route
  const testCases = [
    ["data-calculator"],
    ["data-calculator", "index.html"],
    [], // Empty - should add index.html
  ];

  for (const keyParts of testCases) {
    console.info(`\nTesting keyParts: [${keyParts.join(", ")}]`);

    const key = sanitizeKey(keyParts, prefix);
    console.info(`Generated key: "${key}"`);

    if (!key) {
      console.info("Key generation failed (null)");
      continue;
    }

    try {
      const s3 = getS3Client();
      const result = await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      console.info(`✅ SUCCESS: ${key} exists (${result.ContentType})`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      console.info(`❌ FAILED: ${key} - ${errorMessage}`);
    }
  }
}

testRouteLogic().catch(console.error);
