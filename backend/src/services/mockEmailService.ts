import type { ContactFormData } from './email'

/**
 * Mock email service for local development
 * Logs email data to console instead of sending actual emails
 */
class MockEmailService {
  async sendContactEmail(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Mock Email Service - Would send email:')
      console.log('From:', process.env.LOCAL_SES_FROM_EMAIL || 'noreply@example.com')
      console.log('To:', process.env.LOCAL_SES_TO_EMAIL || 'admin@example.com')
      console.log('Subject:', `New Contact Form Submission from ${data.name}`)
      console.log('Message:', {
        name: data.name,
        email: data.email,
        message: data.message
      })
      console.log('✅ Mock email "sent" successfully')
      
      return { success: true }
    } catch (error) {
      console.error('❌ Mock email service error:', error)
      return {
        success: false,
        error: 'Mock email service error'
      }
    }
  }
}

export const mockEmailService = new MockEmailService()