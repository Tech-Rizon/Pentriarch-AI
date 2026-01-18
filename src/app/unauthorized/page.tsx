'use client'

export const dynamic = 'force-dynamic'

import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex flex-col items-center justify-center text-center px-6">
      <ShieldOff className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
      <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-slate-400 mb-6 max-w-md">
        You don’t have the required role to view this page. Please contact your administrator or upgrade your access.
      </p>
      <div className="flex space-x-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Go Back
        </Button>
        <Button onClick={() => router.push('/')}>
          Return Home
        </Button>
      </div>
    </div>
  )
}
