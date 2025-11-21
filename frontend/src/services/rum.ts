"use client";

import { AwsRum, AwsRumConfig } from "aws-rum-web";

let rumInstance: AwsRum | null = null;

export function initializeRUM() {
  // Only initialize in browser environment
  if (typeof window === "undefined") {
    return;
  }

  // Skip if already initialized
  if (rumInstance) {
    return;
  }

  // Skip if RUM is not configured (optional in local dev)
  const appMonitorId = process.env.NEXT_PUBLIC_RUM_APP_MONITOR_ID;
  const identityPoolId = process.env.NEXT_PUBLIC_RUM_IDENTITY_POOL_ID;
  const region =
    process.env.NEXT_PUBLIC_RUM_REGION ||
    process.env.NEXT_PUBLIC_AWS_REGION ||
    "us-west-2";
  const guestRoleArn = process.env.NEXT_PUBLIC_RUM_GUEST_ROLE_ARN;

  if (!appMonitorId || !identityPoolId || !guestRoleArn) {
    console.info(
      "[RUM] CloudWatch RUM not configured - skipping initialization",
    );
    return;
  }

  try {
    const config: AwsRumConfig = {
      sessionSampleRate: 1, // Sample 100% of sessions
      identityPoolId,
      endpoint: `https://dataplane.rum.${region}.amazonaws.com`,
      telemetries: ["performance", "errors", "http"], // Track page load, JS errors, HTTP requests
      allowCookies: true,
      enableXRay: false, // Set to true if you want X-Ray tracing
      guestRoleArn,
    };

    rumInstance = new AwsRum(
      appMonitorId,
      "1.0.0", // Application version
      region,
      config,
    );

    console.info("[RUM] CloudWatch RUM initialized successfully");
  } catch (error) {
    console.error("[RUM] Failed to initialize CloudWatch RUM:", error);
  }
}

export function getRUM(): AwsRum | null {
  return rumInstance;
}

// Optional: Add custom metadata or attributes
export function recordPageView(pageName: string) {
  if (rumInstance) {
    try {
      rumInstance.recordPageView(pageName);
    } catch (error) {
      console.error("[RUM] Failed to record page view:", error);
    }
  }
}

// Optional: Record custom events
export function recordEvent(eventType: string, data?: Record<string, unknown>) {
  if (rumInstance && data) {
    try {
      rumInstance.recordEvent(eventType, data);
    } catch (error) {
      console.error("[RUM] Failed to record event:", error);
    }
  }
}
