import type { User } from '../payload-types'

declare module 'payload' {
  export interface PayloadRequest {
    user: User & {
      role?: 'admin' | 'user'
    }
  }
}
