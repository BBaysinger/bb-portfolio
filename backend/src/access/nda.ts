/**
 * Shared helpers for NDA-aware field access in Payload collections.
 * Ensures any field decorated with these guards only resolves for authenticated requests.
 */
import type { PayloadRequest } from 'payload'

export interface NdaAwareDoc {
  nda?: boolean | null
}

export type NdaAccessArgs = {
  req: PayloadRequest
  doc?: NdaAwareDoc
}

/**
 * Permit reads when the document is not NDA, otherwise require an authenticated user.
 */
export const canReadNdaField = ({ req, doc }: NdaAccessArgs) => {
  if (!doc?.nda) return true
  return !!req.user
}

/**
 * Alias for clarity when guarding brand assets or other NDA references.
 */
export const canReadNdaBrandAsset = canReadNdaField
