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
  private sesClient: SESClient
  private fromEmail: string
  private toEmail: string

  constructor() {
    const region = this.getEnvVar('AWS_REGION')
    const accessKeyId = this.getEnvVar('AWS_ACCESS_KEY_ID')
    const secretAccessKey = this.getEnvVar('AWS_SECRET_ACCESS_KEY')

    this.fromEmail = this.getEnvVar('SES_FROM_EMAIL')
    this.toEmail = this.getEnvVar('SES_TO_EMAIL')

    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  private getEnvVar(key: string): string {
    const envProfile = process.env.ENV_PROFILE || 'local'
    const prefixedKey = `${envProfile.toUpperCase()}_${key}`
    const value = process.env[prefixedKey]

    if (!value) {
      throw new Error(`Missing required environment variable: ${prefixedKey}`)
    }

    return value
  }

  async sendContactEmail(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
    try {
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
      await this.sesClient.send(command)

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

// Export a singleton instance
export const emailService = new AWSEmailService()
export type { ContactFormData }
