// __tests__/api/settings/route.test.ts
import request from 'supertest'
import { createMocks } from 'node-mocks-http'
import { GET, POST, PATCH } from '@/app/api/settings/route'
import { getCurrentUserServer } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

import '@types/jest'

jest.mock('@/lib/supabase')

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  created_at: '2025-01-01T00:00:00Z',
  role: 'authenticated',
  user_metadata: { plan: 'pro', full_name: 'Collin Ambani' }
}

beforeEach(() => {
  jest.resetAllMocks()
  ;(getCurrentUserServer as jest.Mock).mockResolvedValue(mockUser)
})

describe('GET /api/settings', () => {
  it('returns user settings for pro user', async () => {
    ;(supabase.from as any).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    })

    const { req, res } = createMocks({ method: 'GET' })
    await GET(req as any)
    expect(res._getStatusCode()).toBe(200)
    const json = JSON.parse(res._getData())
    expect(json.user.email).toBe(mockUser.email)
    expect(json.availableModels).toBeInstanceOf(Array)
  })

  it('returns 401 if user not authenticated', async () => {
    ;(getCurrentUserServer as jest.Mock).mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'GET' })
    await GET(req as any)
    expect(res._getStatusCode()).toBe(401)
  })
})

describe('POST /api/settings', () => {
  it('rejects DeepSeek model for pro users', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { preferred_ai_model: 'deepseek-v2' }
    })
    req.headers['content-type'] = 'application/json'
    await POST(req as any)
    expect(res._getStatusCode()).toBe(403)
  })
})

describe('PATCH /api/settings', () => {
  it('toggles a notification feature', async () => {
    ;(supabase.from as any).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { notification_preferences: { email: true } } }),
      upsert: jest.fn().mockResolvedValue({ error: null })
    })

    const { req, res } = createMocks({
      method: 'PATCH',
      body: { action: 'toggle_feature', data: { feature: 'browser', enabled: true } }
    })
    req.headers['content-type'] = 'application/json'
    await PATCH(req as any)
    expect(res._getStatusCode()).toBe(200)
    const json = JSON.parse(res._getData())
    expect(json.message).toContain('enabled')
  })
})
