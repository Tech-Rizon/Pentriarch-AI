// Helper functions for user authentication and metadata access
import { type NextRequest } from 'next/server'
import { getCurrentUserClient, getCurrentUserServer } from './supabase'

export interface ExtendedUser {
  id: string
  email: string
  raw_user_meta_data?: {
    role?: string
    plan?: string
    organization?: string
    [key: string]: any
  }
  [key: string]: any
}

export async function getSafeUser(): Promise<ExtendedUser | null> {
  try {
    const user = await getCurrentUserClient()
    return user as ExtendedUser
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function getSafeUserServer(request?: NextRequest): Promise<ExtendedUser | null> {
  try {
    const user = await getCurrentUserServer(request)
    return user as ExtendedUser
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

export function getUserPlan(user: any): string {
  return user?.raw_user_meta_data?.plan || user?.plan || 'free'
}

export function getUserRole(user: any): string {
  return user?.raw_user_meta_data?.role || user?.role || 'user'
}

export function getUserOrganization(user: any): string {
  return user?.raw_user_meta_data?.organization || user?.organization || 'Individual'
}

export function isAdmin(user: any): boolean {
  const role = getUserRole(user)
  const email = user?.email || ''
  return role === 'admin' || role === 'super_admin' || email.includes('admin') || email.includes('@pentriarch.ai')
}

export async function requireAdmin(request?: NextRequest) {
  const user = request ? await getSafeUserServer(request) : await getSafeUser()
  if (!user || !isAdmin(user)) {
    throw new Error('Admin access required')
  }
  return user
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error occurred'
}
