import { NextResponse } from "next/server";

export async function GET() {
  // Get required environment values (no email from env; email is sourced from CMS via backend)
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL!;
  const expires = process.env.SECURITY_TXT_EXPIRES!;

  // Fetch obfuscated contact email through the frontend proxy -> backend API
  let contactEmail: string | undefined;
  try {
    const res = await fetch(`${baseUrl}/api/contact-info/`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const l = data?.data?.l as string | undefined;
      const d = data?.data?.d as string | undefined;
      if (l && d) {
        const local = Buffer.from(l, "base64").toString("utf8");
        const domain = Buffer.from(d, "base64").toString("utf8");
        contactEmail = `${local}@${domain}`;
      }
    }
  } catch {
    // Ignore; fall back to URL-only Contact line
  }

  const contactLines = [
    contactEmail ? `Contact: mailto:${contactEmail}` : undefined,
    `Contact: ${baseUrl}/contact`,
  ]
    .filter(Boolean)
    .join("\n");

  const securityTxt = `
${contactLines}
Expires: ${expires}
Encryption: ${baseUrl}/pgp-key.txt
Acknowledgments: ${baseUrl}/security-acknowledgments
Preferred-Languages: en
Canonical: ${baseUrl}/.well-known/security.txt
Policy: ${baseUrl}/security-policy
`;

  return new NextResponse(securityTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400", // Cache for 24 hours
    },
  });
}
