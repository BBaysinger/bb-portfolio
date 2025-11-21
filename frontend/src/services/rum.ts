/**
 * AWS CloudWatch RUM Service
 *
 * Provides centralized Real User Monitoring (RUM) functionality for tracking visitor
 * behavior, performance metrics, and errors in production. Automatically disabled
 * in development/local environments when environment variables are not configured.
 *
 * Core Features:
 * - Automatic page view tracking via RUMInitializer component
 * - Custom event recording for user interactions (clicks, form submissions, etc.)
 * - Performance monitoring (LCP, FID, CLS)
 * - JavaScript error tracking
 * - HTTP request monitoring
 * - Dynamic module loading to minimize bundle size
 * - Graceful degradation when not configured
 *
 * Environment Configuration:
 * - NEXT_PUBLIC_RUM_APP_MONITOR_ID - CloudWatch app monitor identifier
 * - NEXT_PUBLIC_RUM_IDENTITY_POOL_ID - Cognito identity pool for unauthenticated access
 * - NEXT_PUBLIC_RUM_GUEST_ROLE_ARN - IAM role with PutRumEvents permission
 * - NEXT_PUBLIC_RUM_REGION - AWS region (defaults to us-west-2)
 *
 * Usage:
 * - Initialize via <RUMInitializer /> component in app layout
 * - Record custom events with recordEvent() or recordClick()
 * - See docs/rum-usage-examples.md for implementation patterns
 *
 * Related Files:
 * - `src/components/RUMInitializer.tsx` - Initialization component
 * - `docs/rum-usage-examples.md` - Usage patterns and examples
 * - `infra/main.tf` - Infrastructure definitions (Cognito, IAM, RUM monitor)
 *
 * @module services/rum
 */

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
      telemetries: [], // Empty array means enable all default telemetries including page views
      allowCookies: true,
      enableXRay: false, // Set to true if you want X-Ray tracing
      guestRoleArn,
      // Enable debug mode to see what's being sent
      ...(typeof window !== "undefined" && {
        eventPluginsToLoad: [],
        enableRumClient: true,
      }),
    };
    // Dynamically import the library only when needed (browser + configured)
    // This defers loading until initialization runs, avoiding build-time failures
    const { AwsRum } = await import("aws-rum-web");
    rumInstance = new AwsRum(appMonitorId, "1.0.0", region, config);

    // Intercept dispatch to log what's being sent
    const originalDispatch = (rumInstance as any).dispatch;
    if (originalDispatch) {
      (rumInstance as any).dispatch = function (...args: any[]) {
        console.info("[RUM] Dispatching events:", args);
        return originalDispatch.apply(this, args);
      };
    }

    console.info("[RUM] CloudWatch RUM initialized successfully");
    console.info("[RUM] Config:", {
      endpoint: config.endpoint,
      identityPoolId: config.identityPoolId,
      appMonitorId,
      region,
    });

    // Record initial page view
    if (typeof window !== "undefined") {
      rumInstance.recordPageView(window.location.pathname);
      console.info(
        "[RUM] Initial page view recorded:",
        window.location.pathname,
      );
    }
  } catch (error) {
    console.error("[RUM] Failed to initialize CloudWatch RUM:", error);
    if (error instanceof Error) {
      console.error("[RUM] Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

export function getRUM(): AwsRum | null {
  return rumInstance;
}

/**
 * Set user identity for RUM session tracking.
 * Associates all events in the current session with the provided user ID.
 * Call this after successful login to track authenticated user behavior.
 *
 * @param userId - Unique user identifier (e.g., Payload user ID)
 *
 * @example
 * ```typescript
 * // After successful login
 * if (user?.id) {
 *   setRUMUser(user.id);
 * }
 * ```
 */
export function setRUMUser(userId: string) {
  if (rumInstance) {
    try {
      rumInstance.addSessionAttributes({ userId });
      console.info("[RUM] User ID set:", userId);
    } catch (error) {
      console.error("[RUM] Failed to set user ID:", error);
    }
  }
}

/**
 * Clear user identity from RUM session.
 * Call this after logout to stop associating events with the user.
 *
 * @example
 * ```typescript
 * // After logout
 * clearRUMUser();
 * ```
 */
export function clearRUMUser() {
  if (rumInstance) {
    try {
      rumInstance.addSessionAttributes({ userId: "" });
      console.info("[RUM] User ID cleared");
    } catch (error) {
      console.error("[RUM] Failed to clear user ID:", error);
    }
  }
}

// Optional: Add custom metadata or attributes
export function recordPageView(pageName: string) {
  if (rumInstance) {
    try {
      rumInstance.recordPageView(pageName);
      console.info("[RUM] Page view recorded:", pageName);
    } catch (error) {
      console.error("[RUM] Failed to record page view:", error);
    }
  }
}

/**
 * Record custom events like button clicks, form submissions, etc.
 *
 * @param eventType - Event category (e.g., "click", "navigation", "interaction")
 * @param data - Event metadata (element ID, label, page, etc.)
 *
 * @example
 * ```typescript
 * recordEvent("click", {
 *   elementId: "cta-button",
 *   label: "Get Started",
 *   page: "/pricing"
 * });
 * ```
 */
export function recordEvent(eventType: string, data?: Record<string, unknown>) {
  if (rumInstance) {
    try {
      rumInstance.recordEvent(eventType, data || {});
    } catch (error) {
      console.error("[RUM] Failed to record event:", error);
    }
  }
}

/**
 * Convenience function to record click events
 * Automatically captures common click metadata
 *
 * @param elementId - ID of the clicked element
 * @param label - Human-readable label for the element
 * @param additionalData - Any extra context about the click
 *
 * @example
 * ```typescript
 * <button onClick={() => recordClick("hero-cta", "Sign Up Now")}>
 *   Sign Up
 * </button>
 * ```
 */
export function recordClick(
  elementId: string,
  label: string,
  additionalData?: Record<string, unknown>,
) {
  recordEvent("click", {
    elementId,
    label,
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
}
