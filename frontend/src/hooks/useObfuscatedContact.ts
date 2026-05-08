import { useState, useEffect } from "react";

interface ContactInfoResponse {
  success: boolean;
  data?: {
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

        const response = await fetch(`/api/contact-info/`, {
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
 * Email hook.
 */
export const useContactEmail = () => {
  const { data, isLoading, error } = useObfuscatedContact();
  let email: string | null = null;
  let derivedError = error;
  if (data) {
    try {
      const localPart = atob(data.l);
      const domain = atob(data.d);
      email = `${localPart}@${domain}`;
      const expected = (data.l.length + data.d.length).toString(16);
      if (data.checksum !== expected) {
        derivedError = "Email data integrity check failed.";
      }
    } catch (decodeError) {
      derivedError =
        decodeError instanceof Error
          ? decodeError.message
          : "Failed to decode contact email.";
    }
  }
  return { email, isLoading, error: derivedError } as const;
};

export const useContactPhone = () => {
  const { data, isLoading, error } = useObfuscatedContact();
  let phoneE164: string | null = null;
  let phoneDisplay: string | null = null;
  let derivedError = error;
  if (data?.phone) {
    try {
      phoneE164 = atob(data.phone.e);
      phoneDisplay = data.phone.d ? atob(data.phone.d) : phoneE164;
      const expected = (data.phone.e.length + data.phone.d.length).toString(16);
      if (data.phone.checksum !== expected) {
        derivedError = "Phone data integrity check failed.";
      }
    } catch (decodeError) {
      derivedError =
        decodeError instanceof Error
          ? decodeError.message
          : "Failed to decode contact phone.";
    }
  }
  return { phoneE164, phoneDisplay, isLoading, error: derivedError } as const;
};

export default useObfuscatedContact;
