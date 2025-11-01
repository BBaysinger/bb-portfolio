import { useState, useEffect } from "react";

interface ContactInfoResponse {
  success: boolean;
  data?: {
    l: string; // encoded local part
    d: string; // encoded domain
    timestamp: number;
    checksum: string;
  };
  error?: string;
}

/**
 * Custom hook to fetch and deobfuscate contact email to protect
 * from web scrapers. Loads the email address from .env variables.
 * Implements multiple layers of obfuscation to deter crawlers
 */
export const useContactEmail = () => {
  const [email, setEmail] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchContactInfo = async () => {
      try {
        // Add random delay to make automated scraping harder
        const delay = Math.random() * 1000 + 500; // 500-1500ms
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Use relative path to leverage Next.js API routes
        const response = await fetch("/api/contact-info/", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          // Disable caching to prevent email from being cached
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result: ContactInfoResponse = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error || "Invalid response format");
        }

        // Decode the obfuscated email
        const localPart = atob(result.data.l);
        const domain = atob(result.data.d);
        const decodedEmail = `${localPart}@${domain}`;

        // Verify checksum as basic integrity check
        const expectedChecksum = (
          result.data.l.length + result.data.d.length
        ).toString(16);
        if (result.data.checksum !== expectedChecksum) {
          console.warn("Email data integrity check failed");
        }

        // Only update if component is still mounted
        if (isMounted) {
          // Add another small delay before revealing the email
          setTimeout(() => {
            if (isMounted) {
              setEmail(decodedEmail);
              setIsLoading(false);
            }
          }, 200);
        }
      } catch (err) {
        console.error("Failed to fetch contact email:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setEmail("Contact info unavailable");
          setIsLoading(false);
        }
      }
    };

    // Start fetching after component mount with additional delay
    const timeoutId = setTimeout(fetchContactInfo, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return { email, isLoading, error };
};
