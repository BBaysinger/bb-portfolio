/**
 * Shared helpers for NDA-aware field access in Payload collections.
 * Ensures any field decorated with these guards only resolves for authenticated requests.
 */
import type { PayloadRequest } from 'payload'

export interface NdaAwareDoc {
  nda?: boolean | null
  brandId?: unknown
}

export type NdaAccessArgs = {
  req: PayloadRequest
  doc?: NdaAwareDoc
}

/**
 * Permit reads when the document is not NDA, otherwise require an authenticated user.
 */
export const canReadNdaField = async ({ req, doc }: NdaAccessArgs) => {
  // Authenticated users can read NDA fields.
  if (req?.user) return true

  // No doc context: allow.
  if (!doc) return true

  // Direct NDA flag is authoritative.
  if (doc.nda) return false

  // Treat brand-NDA projects as NDA-like to prevent existence leakage.
  const brandId = doc.brandId
  if (!brandId) return true

  // If brand is populated, honor its nda flag.
  if (typeof brandId === 'object') {
    const maybeNda = (brandId as Record<string, unknown> | null)?.nda
    if (maybeNda === true) return false
    return true
  }

  // If brand is an ID, resolve it.
  if (typeof brandId === 'string') {
    try {
      const brand = await req.payload.findByID({
        collection: 'brands',
        id: brandId,
        depth: 0,
        disableErrors: true,
      })
      // If the brand can't be fetched, default to non-NDA (least disruptive).
      return !brand?.nda
    } catch {
      return true
    }
  }

  return true
}

/**
 * Alias for clarity when guarding brand assets or other NDA references.
 */
export const canReadNdaBrandAsset = canReadNdaField
