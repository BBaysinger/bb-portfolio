import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
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
    s3Test: null as any,
  };

  // Test S3 access
  const bucket = process.env.PUBLIC_PROJECTS_BUCKET;
  const testKey = "data-calculator/index.html";
  
  if (bucket) {
    try {
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
      const s3 = new S3Client({ region });
      
      const result = await s3.send(new HeadObjectCommand({ 
        Bucket: bucket, 
        Key: testKey 
      }));
      
      debugInfo.s3Test = {
        success: true,
        bucket,
        key: testKey,
        region,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
      };
    } catch (error: any) {
      debugInfo.s3Test = {
        success: false,
        bucket,
        key: testKey,
        error: {
          name: error.name,
          message: error.message,
          code: error.Code || error.code,
          statusCode: error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId,
        },
      };
    }
  } else {
    debugInfo.s3Test = {
      success: false,
      error: "No PUBLIC_PROJECTS_BUCKET configured",
    };
  }

  return Response.json(debugInfo, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}