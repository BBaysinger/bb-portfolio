import { useState, useEffect } from "react";

interface ContactInfoResponse {
  success: boolean;
  data?: {
    // Backward-compat email fields (top-level)
    l: string; // encoded local part
    d: string; // encoded domain
    timestamp: number;
    checksum: string;
    // Extended payloads for other contact fields
    phone?: {
      e: string; // encoded E.164
      d: string; // encoded display value
      checksum: string;
    };
  };
  error?: string;
}

/**
 * Generic contact info hook: fetch once, decode email or phone.
 * Keeps the same endpoint and adds support for additional fields.
 */
const useObfuscatedContact = () => {
  const [data, setData] = useState<ContactInfoResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchContactInfo = async () => {
      try {
        const delay = Math.random() * 1000 + 500; // 500-1500ms
        await new Promise((resolve) => setTimeout(resolve, delay));

        const basePath = (process.env.NEXT_PUBLIC_BACKEND_BASE_PATH || "/admin").replace(/\/$/, "");
        const response = await fetch(`${basePath}/api/contact-info/`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result: ContactInfoResponse = await response.json();
        if (!result.success || !result.data)
          throw new Error(result.error || "Invalid response format");

        if (!isMounted) return;
        setTimeout(() => {
          if (!isMounted) return;
          setData(result.data!);
          setIsLoading(false);
        }, 200);
      } catch (err) {
        console.error("Failed to fetch contact info:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      }
    };
    const timeoutId = setTimeout(fetchContactInfo, 1000);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return { data, isLoading, error } as const;
};

/**
 * Backward-compatible email hook.
 */
export const useContactEmail = () => {
  const { data, isLoading, error } = useObfuscatedContact();
  let email = "Loading...";
  if (data) {
    try {
      const localPart = atob(data.l);
      const domain = atob(data.d);
      email = `${localPart}@${domain}`;
      const expected = (data.l.length + data.d.length).toString(16);
      if (data.checksum !== expected) {
        console.warn("Email data integrity check failed");
      }
    } catch {
      // noop, stay with default
    }
  }
  return { email, isLoading, error } as const;
};

export const useContactPhone = () => {
  const { data, isLoading, error } = useObfuscatedContact();
  let phoneE164 = "";
  let phoneDisplay = "";
  if (data?.phone) {
    try {
      phoneE164 = atob(data.phone.e);
      phoneDisplay = data.phone.d ? atob(data.phone.d) : phoneE164;
      const expected = (data.phone.e.length + data.phone.d.length).toString(16);
      if (data.phone.checksum !== expected) {
        console.warn("Phone data integrity check failed");
      }
    } catch {
      // noop
    }
  }
  return { phoneE164, phoneDisplay, isLoading, error } as const;
};

export default useObfuscatedContact;
