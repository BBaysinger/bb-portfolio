/**
 * Payload request type augmentation.
 *
 * Adds the authenticated `user` shape used by the app.
 */
import 'payload'

declare module 'payload' {
  export interface PayloadRequest {
    user?: {
      id?: string
      role?: 'admin' | 'user'
      [key: string]: unknown
    }
  }
}
