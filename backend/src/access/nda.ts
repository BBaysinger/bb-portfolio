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
    const rec = brandId as Record<string, unknown> | null
    const maybeNda = rec?.nda
    if (maybeNda === true) return false
    if (maybeNda === false) return true

    // If we cannot confidently determine NDA state from the populated object,
    // try to resolve by ID/value (Payload relationship shapes vary by depth).
    const relId = (() => {
      const id = rec?.id
      if (typeof id === 'string' && id.length > 0) return id
      const value = rec?.value
      if (typeof value === 'string' && value.length > 0) return value
      return undefined
    })()

    if (!relId) return false

    try {
      const brand = await req.payload.findByID({
        collection: 'brands',
        id: relId,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
      })
      if (!brand) return false
      return brand.nda !== true
    } catch {
      return false
    }
  }

  // If brand is an ID, resolve it.
  if (typeof brandId === 'string') {
    try {
      // IMPORTANT: Use overrideAccess so we can safely detect NDA brands even when
      // unauthenticated requests cannot read brand documents.
      const brand = await req.payload.findByID({
        collection: 'brands',
        id: brandId,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
      })
      // Fail closed if the brand can't be fetched.
      if (!brand) return false
      return brand.nda !== true
    } catch {
      return false
    }
  }

  return true
}

/**
 * Alias for clarity when guarding brand assets or other NDA references.
 */
export const canReadNdaBrandAsset = canReadNdaField
