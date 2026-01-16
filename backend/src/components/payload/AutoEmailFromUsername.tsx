'use client'

import { EmailField, useField, useFormFields } from '@payloadcms/ui'
import type { EmailFieldClientComponent } from 'payload'
import React, { useEffect } from 'react'

/**
 * Payload Admin custom Email field for the Users collection.
 *
 * Goal
 * - Let admins create a user by typing Username first, without needing a real email yet.
 * - While the Email field is still "auto-managed" (empty or placeholder), keep it in sync
 *   with Username as: no-email+<username>@placeholder.invalid.
 *
 * Override rules
 * - If Email is empty OR ends with @placeholder.invalid: auto-populate + keep updating.
 * - If Email looks like a real address (not @placeholder.invalid): never overwrite it.
 * - If Username is cleared and Email is a placeholder: clear Email too.
 */

const isPlaceholderEmail = (email: string) => {
  const trimmed = email.trim().toLowerCase()
  return trimmed.endsWith('@placeholder.invalid')
}

const makePlaceholderEmail = (rawUsername: string) => {
  const normalized = rawUsername.trim().toLowerCase()
  // Keep the local-part URL/email safe-ish:
  // - allow alnum + . _ -
  // - collapse other runs into a single '-'
  // - trim leading/trailing '-'
  const safeLocalPart = normalized
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!safeLocalPart) return undefined
  return `no-email+${safeLocalPart}@placeholder.invalid`
}

export const AutoEmailFromUsername: EmailFieldClientComponent = (props) => {
  const { path } = props

  // Current email field state
  const { value: emailValue, setValue: setEmailValue } = useField<string>({ path })

  // Watch the sibling Username field without re-rendering on every field change
  const usernameField = useFormFields(([fields]) => fields.username)
  const usernameValue = typeof usernameField?.value === 'string' ? usernameField.value : ''

  useEffect(() => {
    const currentEmail = typeof emailValue === 'string' ? emailValue.trim() : ''

    // Two-way behavior:
    // - If email is empty OR using our placeholder domain, keep it synced with username.
    // - If email is a "real" email (not placeholder), do not override.
    const shouldAutoPopulate = currentEmail.length === 0 || isPlaceholderEmail(currentEmail)
    if (!shouldAutoPopulate) return

    const trimmedUsername = usernameValue.trim()

    // If username was cleared and email is a placeholder, clear email too.
    if (!trimmedUsername) {
      if (currentEmail.length > 0 && isPlaceholderEmail(currentEmail)) {
        setEmailValue('')
      }
      return
    }

    const desired = makePlaceholderEmail(trimmedUsername)
    if (desired && desired !== currentEmail) {
      setEmailValue(desired)
    }
  }, [emailValue, setEmailValue, usernameValue])

  return <EmailField {...props} />
}
