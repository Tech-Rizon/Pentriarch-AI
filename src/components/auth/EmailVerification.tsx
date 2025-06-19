'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface EmailVerificationProps {
  email?: string
  mode?: 'verify' | 'resend'
}

export default function EmailVerification({ email, mode = 'verify' }: EmailVerificationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCooldown])

  useEffect(() => {
    // Check if user is already verified
    const checkVerificationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email_confirmed_at) {
          setIsVerified(true)
          setMessage('Email already verified! Redirecting to dashboard...')
          setTimeout(() => router.push('/dashboard'), 2000)
        }
      } catch (error) {
        console.error('Error checking verification status:', error)
      }
    }

    checkVerificationStatus()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          setIsVerified(true)
          setMessage('Email verified successfully! Redirecting to dashboard...')
          setTimeout(() => router.push('/dashboard'), 2000)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        throw new Error('No user email found. Please sign in again.')
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`
        }
      })

      if (error) throw error

      setMessage('Verification email sent! Check your inbox.')
      setResendCooldown(60) // 60 second cooldown
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) throw error

      if (user?.email_confirmed_at) {
        setIsVerified(true)
        setMessage('Email verified successfully! Redirecting to dashboard...')
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to check verification status')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You'll be redirected to the dashboard shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to <strong>{email}</strong>.
            Please check your inbox and click the link to verify your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleCheckVerification}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've Verified My Email
                </>
              )}
            </Button>

            <Button
              onClick={handleResendVerification}
              variant="outline"
              className="w-full"
              disabled={isLoading || resendCooldown > 0}
            >
              {resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or try a different email address.
              </p>
              <Link href="/auth" className="text-sm text-primary hover:underline">
                <ArrowLeft className="w-4 h-4 mr-1 inline" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
