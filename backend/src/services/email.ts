import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses'

interface ContactFormData {
  name: string
  email: string
  message: string
}

interface EmailService {
  sendContactEmail(data: ContactFormData): Promise<{ success: boolean; error?: string }>
}

class AWSEmailService implements EmailService {
  private sesClient: SESClient | null = null
  private fromEmail: string | null = null
  private toEmail: string | null = null
  private isConfigured: boolean = false
  private configError: string | null = null

  constructor() {
    try {
      const { value: region, usedKey: regionKey } = this.getEnvVarWithKey('AWS_REGION')

      const { value: fromEmail, usedKey: fromKey } = this.getEnvVarWithKey('SES_FROM_EMAIL')
      const { value: toEmail, usedKey: toKey } = this.getEnvVarWithKey('SES_TO_EMAIL')
      this.fromEmail = fromEmail
      this.toEmail = toEmail

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

  private getEnvVarWithKey(key: string): { value: string; usedKey: string } {
    const envProfile = process.env.ENV_PROFILE || 'local'
    const prefixedKey = `${envProfile.toUpperCase()}_${key}`
    // Prefer profile-prefixed, but gracefully fall back to unprefixed for runtime environments
    // where only AWS_REGION/SES_* may be provided.
    const value = process.env[prefixedKey] || process.env[key]
    const usedKey = process.env[prefixedKey] ? prefixedKey : process.env[key] ? key : ''

    if (!value) {
      throw new Error(`Missing required environment variable: ${prefixedKey} (or ${key})`)
    }

    return { value, usedKey }
  }

  async sendContactEmail(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if AWS is properly configured
      if (!this.isConfigured || !this.sesClient || !this.fromEmail || !this.toEmail) {
        return {
          success: false,
          error: this.configError || 'Email service not configured',
        }
      }

      const { name, email, message } = data

      const emailParams: SendEmailCommandInput = {
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [this.toEmail],
        },
        Message: {
          Subject: {
            Data: `New Contact Form Submission from ${name}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: `
                <html>
                  <body>
                    <h2>New Contact Form Submission</h2>
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
New Contact Form Submission

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

      return { success: true }
    } catch (error) {
      console.error('AWS SES Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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
