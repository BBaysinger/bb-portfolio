/**
 * AWS CloudWatch RUM Service
 *
 * Provides centralized Real User Monitoring (RUM) functionality for tracking visitor
 * behavior, performance metrics, and errors in production. Automatically disabled
 * outside production and on non-HTTPS origins, and also disabled when environment
 * variables are not configured.
 *
 * Core Features:
 * - Automatic page view tracking via RUMInitializer component
 * - Custom event recording for user interactions (clicks, form submissions, etc.)
 * - Performance monitoring (LCP, FID, CLS)
 * - JavaScript error tracking
 * - HTTP request monitoring
 * - Dynamic module loading to avoid SSR/build-time coupling
 * - Graceful degradation when not configured
 *
 * Environment Configuration:
 * - NEXT_PUBLIC_RUM_APP_MONITOR_ID - CloudWatch RUM App Monitor UUID (AppMonitor.Id)
 * - NEXT_PUBLIC_RUM_PUBLIC_RESOURCE_POLICY - Optional: set to "true" to send unsigned PutRumEvents (public resource-based policy mode)
 * - NEXT_PUBLIC_RUM_IDENTITY_POOL_ID - Cognito Identity Pool for unauthenticated access (required unless using public-policy mode)
 * - NEXT_PUBLIC_RUM_GUEST_ROLE_ARN - IAM role with PutRumEvents permission (required unless using public-policy mode)
 * - NEXT_PUBLIC_RUM_REGION - Optional: AWS region (falls back to NEXT_PUBLIC_AWS_REGION, then us-west-2)
 * - NEXT_PUBLIC_RUM_DEBUG - Optional: enable extra console logging (non-production only)
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

const RUM_DEBUG =
  process.env.NEXT_PUBLIC_RUM_DEBUG === "true" &&
  process.env.NODE_ENV !== "production";

// Use eager dynamic import (webpackMode: "eager") inside initializer to bundle without runtime resolution issues.
type AwsRumConfig = {
  sessionSampleRate?: number;
  identityPoolId?: string;
  guestRoleArn?: string;
  endpoint?: string;
  telemetries?: string[];
  allowCookies?: boolean;
  enableXRay?: boolean;
  signing?: boolean;
  eventPluginsToLoad?: string[];
  enableRumClient?: boolean;
};

type AwsRumLike = {
  recordPageView: (pageName: string) => void;
  recordEvent: (type: string, data?: Record<string, unknown>) => void;
  addSessionAttributes: (attrs: Record<string, unknown>) => void;
  // Optional dispatch hook present in implementation; use index signature to avoid any
  [key: string]: unknown;
};

/** Singleton instance of AWS CloudWatch RUM client */
let rumInstance: AwsRumLike | null = null;

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
 * Configuration:
 * See the "Environment Configuration" section at the top of this file.
 * At minimum, you must set NEXT_PUBLIC_RUM_APP_MONITOR_ID plus either:
 * - public-policy mode: NEXT_PUBLIC_RUM_PUBLIC_RESOURCE_POLICY=true, or
 * - signed mode: NEXT_PUBLIC_RUM_IDENTITY_POOL_ID and NEXT_PUBLIC_RUM_GUEST_ROLE_ARN
 *
 * Features:
 * - Singleton pattern prevents duplicate initialization
 * - Graceful degradation when not configured
 * - Samples 100% of sessions for comprehensive monitoring
 * - Tracks performance, errors, and HTTP requests
 */
export async function initializeRUM() {
  // Only initialize in browser environment
  if (typeof window === "undefined") {
    return;
  }

  // CloudWatch RUM ingestion is intended for production traffic.
  // In local/dev (Next.js NODE_ENV=development) this frequently produces 403s
  // due to App Monitor domain restrictions and/or HTTP origins.
  if (process.env.NODE_ENV !== "production") {
    if (RUM_DEBUG) {
      console.info(
        "[RUM] Skipping initialization (NODE_ENV is not production)",
      );
    }
    return;
  }

  // RUM ingestion expects HTTPS origins (production). Avoid noisy console 403s
  // when running the site over HTTP (local/proxy/test environments).
  if (window.location.protocol !== "https:") {
    if (RUM_DEBUG) {
      console.info(
        "[RUM] Skipping initialization (non-HTTPS origin):",
        window.location.origin,
      );
    }
    return;
  }

  // Skip if already initialized
  if (rumInstance) {
    return;
  }

  // Skip if RUM is not configured (optional in local dev)
  const appMonitorId = process.env.NEXT_PUBLIC_RUM_APP_MONITOR_ID;
  const identityPoolId = process.env.NEXT_PUBLIC_RUM_IDENTITY_POOL_ID;
  const guestRoleArn = process.env.NEXT_PUBLIC_RUM_GUEST_ROLE_ARN;
  const usePublicResourcePolicy =
    process.env.NEXT_PUBLIC_RUM_PUBLIC_RESOURCE_POLICY === "true";
  const region =
    process.env.NEXT_PUBLIC_RUM_REGION ||
    process.env.NEXT_PUBLIC_AWS_REGION ||
    "us-west-2";

  if (!appMonitorId) {
    if (RUM_DEBUG) {
      console.info(
        "[RUM] CloudWatch RUM not configured - skipping initialization",
      );
    }
    return;
  }

  // Default (safe) behavior is to require Cognito signing inputs.
  // If you're using an App Monitor with a *public resource-based policy* (common for public sites),
  // set NEXT_PUBLIC_RUM_PUBLIC_RESOURCE_POLICY=true to send unsigned requests.
  if (!usePublicResourcePolicy && (!identityPoolId || !guestRoleArn)) {
    if (RUM_DEBUG) {
      console.info(
        "[RUM] CloudWatch RUM missing identity pool / guest role; set NEXT_PUBLIC_RUM_PUBLIC_RESOURCE_POLICY=true for public-policy mode.",
      );
    }
    return;
  }

  // CloudWatch RUM PutRumEvents expects the UUID app monitor ID (AppMonitor.Id), not the monitor name.
  // A common misconfiguration is passing the monitor name (e.g. "bb-portfolio"), which yields 403s.
  const looksLikeUuid =
    /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(
      appMonitorId,
    );
  if (!looksLikeUuid) {
    console.error(
      "[RUM] Invalid NEXT_PUBLIC_RUM_APP_MONITOR_ID; expected UUID app monitor ID (AppMonitor.Id).",
      { appMonitorId },
    );
    return;
  }

  try {
    // Eager dynamic import guarantees inclusion in main bundle under webpack
    const rumModule = await import(/* webpackMode: "eager" */ "aws-rum-web");
    const moduleRecord = rumModule as Record<string, unknown>;
    const maybeAwsRum =
      moduleRecord["AwsRum"] ?? moduleRecord["default"] ?? rumModule;
    if (typeof maybeAwsRum !== "function") {
      throw new Error("aws-rum-web did not export a constructor");
    }
    const AwsRumCtor = maybeAwsRum as new (
      appMonitorId: string,
      version: string,
      region: string,
      config: AwsRumConfig,
    ) => AwsRumLike;
    const config: AwsRumConfig = {
      sessionSampleRate: 1, // Sample 100% of sessions
      endpoint: `https://dataplane.rum.${region}.amazonaws.com`,
      telemetries: ["errors", "performance", "http"],
      allowCookies: true,
      enableXRay: false, // Set to true if you want X-Ray tracing
      ...(typeof window !== "undefined" && {
        eventPluginsToLoad: [],
        enableRumClient: true,
      }),
    };

    if (usePublicResourcePolicy) {
      config.signing = false;
    } else {
      config.signing = true;
      config.identityPoolId = identityPoolId;
      config.guestRoleArn = guestRoleArn;
    }
    // Static import path bundling already ensured; construct directly
    rumInstance = new AwsRumCtor(appMonitorId, "1.0.0", region, config);

    // Intercept dispatch to log what's being sent

    const originalDispatch = (rumInstance as { [k: string]: unknown })[
      "dispatch"
    ] as ((...args: unknown[]) => unknown) | undefined;
    if (RUM_DEBUG && originalDispatch) {
      (
        rumInstance as unknown as { dispatch: (...args: unknown[]) => unknown }
      ).dispatch = function (...args: unknown[]) {
        console.info("[RUM] Dispatching events:", args);
        return originalDispatch.apply(this, args);
      };
    }

    if (RUM_DEBUG) {
      console.info("[RUM] CloudWatch RUM initialized successfully");
      console.info("[RUM] Config:", {
        endpoint: config.endpoint,
        identityPoolId: config.identityPoolId,
        guestRoleArn: config.guestRoleArn,
        appMonitorId,
        region,
      });
    }

    // Record initial page view
    if (typeof window !== "undefined") {
      rumInstance.recordPageView(window.location.pathname);
      if (RUM_DEBUG) {
        console.info(
          "[RUM] Initial page view recorded:",
          window.location.pathname,
        );
      }
    }
  } catch (error) {
    // Safely stringify any thrown value (some bundlers/exports throw non-Error objects)
    const details = (() => {
      try {
        return JSON.stringify(
          error,
          Object.getOwnPropertyNames(error as Error),
        );
      } catch {
        try {
          return String(error);
        } catch {
          return "[unserializable error]";
        }
      }
    })();
    console.error("[RUM] Failed to initialize CloudWatch RUM:", details);
    if (error && typeof error === "object") {
      const e = error as unknown as { message?: string; stack?: string };
      if (e.message) {
        console.error("[RUM] Error details:", {
          message: e.message,
          stack: e.stack,
        });
      }
    }
  }
}

export function getRUM(): AwsRumLike | null {
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
      if (RUM_DEBUG) {
        console.info("[RUM] User ID set:", userId);
      }
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
      if (RUM_DEBUG) {
        console.info("[RUM] User ID cleared");
      }
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
      if (RUM_DEBUG) {
        console.info("[RUM] Page view recorded:", pageName);
      }
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
