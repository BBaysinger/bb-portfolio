/**
 * Payload request type augmentation.
 *
 * Adds the authenticated `user` shape used by the app.
 */
import type { User } from '../payload-types'

declare module 'payload' {
  export interface PayloadRequest {
    user: User & {
      role?: 'admin' | 'user'
    }
  }
}
