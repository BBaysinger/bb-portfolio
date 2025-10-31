import { NextResponse } from "next/server";

export async function GET() {
  // Get required environment values (no fallbacks - these are required)
  const contactEmail = process.env.SECURITY_CONTACT_EMAIL!;
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL!;
  const expires = process.env.SECURITY_TXT_EXPIRES!;

  const securityTxt = `
Contact: mailto:${contactEmail}
Contact: ${baseUrl}/contact
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
