import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses'

interface ContactFormData {
  name: string
  email: string
  message: string
}

interface EmailService {
  sendContactEmail(
    data: ContactFormData,
  ): Promise<{ success: boolean; error?: string; reasonCode?: string }>
}

class AWSEmailService implements EmailService {
  private sesClient: SESClient | null = null
  private fromEmail: string | null = null
  private toEmail: string | null = null
  private isConfigured: boolean = false
  private configError: string | null = null
  private usedKeys: { region?: string; from?: string; to?: string } = {}
  private lastStatus: {
    updatedAt: number
    ok: boolean
    reasonCode?: string
    error?: string
    ses?: { code?: string; requestId?: string; statusCode?: number }
  } | null = null

  constructor() {
    try {
      const { value: region, usedKey: regionKey } = this.getEnvVarWithKey('AWS_REGION')

      const { value: fromEmail, usedKey: fromKey } = this.getEnvVarWithKey('SES_FROM_EMAIL')
      const { value: toEmail, usedKey: toKey } = this.getEnvVarWithKey('SES_TO_EMAIL')
      this.fromEmail = fromEmail
      this.toEmail = toEmail
      this.usedKeys = { region: regionKey, from: fromKey, to: toKey }

      // Prefer the default AWS credential provider chain.
      // If AWS_ACCESS_KEY_ID/SECRET are present, SDK will pick them up automatically.
      // If running on EC2/ECS with an IAM role, the SDK will use role credentials.
      this.sesClient = new SESClient({ region })

      // Minimal, non-secret debug to help diagnose prod config (no values printed)
      console.info(
        `[email] SES configured using keys: region=${regionKey}, from=${fromKey}, to=${toKey}; ENV_PROFILE=${
          process.env.ENV_PROFILE || ''
        }`,
      )

      this.isConfigured = true
    } catch (error) {
      this.configError = error instanceof Error ? error.message : 'AWS SES configuration failed'
    }
  }

  private getOptionalEnvVarWithKey(key: string): { value?: string; usedKey?: string } {
    const value = process.env[key]
    const usedKey = value ? key : undefined
    return { value, usedKey }
  }

  private getEnvVarWithKey(key: string): { value: string; usedKey: string } {
    const value = process.env[key]
    const usedKey = value ? key : ''

    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }

    return { value, usedKey }
  }

  async sendContactEmail(
    data: ContactFormData,
  ): Promise<{ success: boolean; error?: string; reasonCode?: string }> {
    try {
      // Check if AWS is properly configured
      if (!this.isConfigured || !this.sesClient || !this.fromEmail || !this.toEmail) {
        const res = {
          success: false,
          error: this.configError || 'Email service not configured',
          reasonCode: 'CONTACT_EMAIL_NOT_CONFIGURED',
        } as const
        this.lastStatus = {
          updatedAt: Date.now(),
          ok: false,
          reasonCode: res.reasonCode,
          error: res.error,
        }
        return { ...res }
      }

      const { name, email, message } = data

      // Subject/heading customization via env (profile-aware). Fallback to default.
      const subjectPrefix =
        this.getOptionalEnvVarWithKey('CONTACT_EMAIL_SUBJECT_PREFIX').value ||
        'New Contact Form Submission'
      const headingText =
        this.getOptionalEnvVarWithKey('CONTACT_EMAIL_HEADING').value || subjectPrefix

      const emailParams: SendEmailCommandInput = {
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [this.toEmail],
        },
        Message: {
          Subject: {
            Data: `${subjectPrefix} from ${name}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: `
                <html>
                  <body>
                    <h2>${this.escapeHtml(headingText)}</h2>
                    <p><strong>Name:</strong> ${this.escapeHtml(name)}</p>
                    <p><strong>Email:</strong> ${this.escapeHtml(email)}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007cba; margin: 10px 0;">
                      ${this.escapeHtml(message).replace(/\n/g, '<br>')}
                    </div>
                    <hr>
                    <p><small>This message was sent via your portfolio contact form.</small></p>
                  </body>
                </html>
              `,
              Charset: 'UTF-8',
            },
            Text: {
              Data: `
${headingText}

Name: ${name}
Email: ${email}

Message:
${message}

---
This message was sent via your portfolio contact form.
              `,
              Charset: 'UTF-8',
            },
          },
        },
        ReplyToAddresses: [email], // Allow you to reply directly to the sender
      }

      const command = new SendEmailCommand(emailParams)
      await this.sesClient!.send(command)

      this.lastStatus = { updatedAt: Date.now(), ok: true }
      return { success: true }
    } catch (error: unknown) {
      // Log structured, non-secret SES diagnostics for faster triage in prod
      const err = (error || {}) as {
        name?: string
        message?: string
        Code?: string
        code?: string
        $metadata?: { requestId?: string; httpStatusCode?: number }
      }
      const meta = err.$metadata || {}
      const logPayload = {
        name: err.name,
        code: err.Code || err.code,
        message: err.message,
        requestId: meta?.requestId,
        statusCode: meta?.httpStatusCode,
      }
      console.error('AWS SES Error:', logPayload)
      // Map common SES/AWS error patterns to stable, non-sensitive reason codes
      const code = (err.Code || err.code || '').toString()
      const msg = (err.message || '').toString()
      let reasonCode: string | undefined
      if (/MessageRejected/i.test(code) || /MessageRejected/i.test(msg)) {
        reasonCode = 'SES_MESSAGE_REJECTED'
      } else if (/AccessDenied/i.test(code) || /AccessDenied/i.test(msg)) {
        reasonCode = 'SES_ACCESS_DENIED'
      } else if (/InvalidClientTokenId|UnrecognizedClientException/i.test(code + msg)) {
        reasonCode = 'SES_BAD_CREDENTIALS'
      } else if (/SignatureDoesNotMatch/i.test(code + msg)) {
        reasonCode = 'SES_BAD_SIGNATURE'
      } else if (/Throttling|ThrottlingException/i.test(code)) {
        reasonCode = 'SES_THROTTLED'
      } else if (/not verified|is not verified|Email address not verified/i.test(msg)) {
        reasonCode = 'SES_IDENTITY_NOT_VERIFIED'
      } else {
        reasonCode = 'SES_UNKNOWN'
      }
      this.lastStatus = {
        updatedAt: Date.now(),
        ok: false,
        reasonCode,
        error:
          typeof err.message === 'string' && err.message.length > 0
            ? err.message
            : 'Unknown error occurred',
        ses: {
          code: code || undefined,
          requestId: meta?.requestId,
          statusCode: meta?.httpStatusCode,
        },
      }
      return {
        success: false,
        error:
          typeof err.message === 'string' && err.message.length > 0
            ? err.message
            : 'Unknown error occurred',
        reasonCode,
      }
    }
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }

    return text.replace(/[&<>"']/g, (m) => map[m])
  }
}

import { mockEmailService } from './mockEmailService'

// Export a singleton instance - use mock for local development
const envProfile = (process.env.ENV_PROFILE || '').toLowerCase()
const isLocal = envProfile === 'local' || process.env.NODE_ENV === 'development'

// Use mock email service for local development if AWS credentials are not available
const awsService = new AWSEmailService()
export const emailService = isLocal && !awsService['isConfigured'] ? mockEmailService : awsService

export type { ContactFormData }

// Expose safe diagnostics without secrets/values
export function getContactEmailDiagnostics() {
  const profile = (process.env.ENV_PROFILE || process.env.NODE_ENV || '').toLowerCase()
  const normalized = profile.startsWith('prod')
    ? 'prod'
    : profile === 'development' || profile.startsWith('dev')
      ? 'dev'
      : profile.startsWith('local')
        ? 'local'
        : profile || 'unknown'

  const pick = (keys: string[]) => keys.find((k) => !!process.env[k]) || ''

  let configured = false
  let usedKeys: { region?: string | null; from?: string | null; to?: string | null } = {}
  let last: {
    updatedAt: number
    ok: boolean
    reasonCode?: string
    ses?: { code?: string; requestId?: string; statusCode?: number }
    error?: string
  } | null = null

  if (emailService instanceof AWSEmailService) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const impl = emailService as unknown as Record<string, any>
    configured = Boolean(impl['isConfigured'] && impl['fromEmail'] && impl['toEmail'])
    usedKeys = (impl['usedKeys'] as typeof usedKeys) || {}
    last = (impl['lastStatus'] as typeof last) || null
  } else {
    // Fallback for mock
    usedKeys = {
      region: pick(['AWS_REGION']) || null,
      from: pick(['SES_FROM_EMAIL']) || null,
      to: pick(['SES_TO_EMAIL']) || null,
    }
    configured = false
    last = null
  }

  return {
    profile: normalized,
    configured,
    keys: {
      region: usedKeys.region || null,
      from: usedKeys.from || null,
      to: usedKeys.to || null,
    },
    last,
    now: Date.now(),
  }
}
