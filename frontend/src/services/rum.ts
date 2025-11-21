"use client";

// Use type-only import so the aws-rum-web package is loaded dynamically in the browser.
import type { AwsRum, AwsRumConfig } from "aws-rum-web";

/** Singleton instance of AWS CloudWatch RUM client */
let rumInstance: AwsRum | null = null;

/**
 * Initializes AWS CloudWatch Real User Monitoring (RUM) for the application.
 *
 * Uses dynamic import to load aws-rum-web only when needed in the browser,
 * reducing bundle size and avoiding build-time dependency coupling.
 * Gracefully skips initialization if required environment variables are missing
 * or if running in non-browser context (SSR).
 *
 * @async
 * @returns {Promise<void>}
 *
 * @example
 * ```tsx
 * // In a client component
 * useEffect(() => {
 *   initializeRUM();
 * }, []);
 * ```
 *
 * Environment variables required:
 * - NEXT_PUBLIC_RUM_APP_MONITOR_ID - CloudWatch RUM app monitor ID
 * - NEXT_PUBLIC_RUM_IDENTITY_POOL_ID - Cognito identity pool ID
 * - NEXT_PUBLIC_RUM_GUEST_ROLE_ARN - IAM role ARN for guest access
 * - NEXT_PUBLIC_RUM_REGION (optional) - AWS region, defaults to us-west-2
 *
 * Features:
 * - Singleton pattern prevents duplicate initialization
 * - Browser-only execution (no SSR initialization)
 * - Dynamic module loading for optimal bundle size
 * - Graceful degradation when not configured
 * - Samples 100% of sessions for comprehensive monitoring
 * - Tracks performance, errors, and HTTP requests
 */
export async function initializeRUM() {
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

  // Debug logging to verify environment variables are present
  console.info("[RUM] Configuration check:", {
    appMonitorId: appMonitorId
      ? `${appMonitorId.substring(0, 10)}...`
      : "NOT SET",
    identityPoolId: identityPoolId
      ? `${identityPoolId.substring(0, 20)}...`
      : "NOT SET",
    region: region || "NOT SET",
    guestRoleArn: guestRoleArn
      ? `${guestRoleArn.substring(0, 30)}...`
      : "NOT SET",
  });

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
    // Dynamically import the library only when needed (browser + configured)
    // This defers loading until initialization runs, avoiding build-time failures
    const { AwsRum } = await import("aws-rum-web");
    rumInstance = new AwsRum(appMonitorId, "1.0.0", region, config);

    console.info("[RUM] CloudWatch RUM initialized successfully");
    
    // Record initial page view
    if (typeof window !== "undefined") {
      rumInstance.recordPageView(window.location.pathname);
      console.info("[RUM] Initial page view recorded:", window.location.pathname);
    }
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
