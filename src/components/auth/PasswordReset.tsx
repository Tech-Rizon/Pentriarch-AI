'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface PasswordResetProps {
  mode?: 'request' | 'reset'
  accessToken?: string
}

export default function PasswordReset({ mode = 'request', accessToken }: PasswordResetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const [resetData, setResetData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) throw error

      setMessage('Password reset email sent! Check your inbox.')
      setIsComplete(true)
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    if (resetData.password !== resetData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (resetData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: resetData.password
      })

      if (error) throw error

      setMessage('Password updated successfully! You can now sign in.')
      setIsComplete(true)
    } catch (error: any) {
      setError(error.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              {mode === 'request' ? 'Email Sent!' : 'Password Updated!'}
            </CardTitle>
            <CardDescription>
              {mode === 'request'
                ? 'Check your email for the password reset link.'
                : 'Your password has been successfully updated.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link href="/auth">
                <Button className="w-full" variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {mode === 'request' ? (
              <Mail className="w-6 h-6 text-blue-600" />
            ) : (
              <Lock className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {mode === 'request' ? 'Reset Password' : 'Set New Password'}
          </CardTitle>
          <CardDescription>
            {mode === 'request'
              ? 'Enter your email address and we\'ll send you a reset link.'
              : 'Enter your new password below.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={mode === 'request' ? handleRequestReset : handlePasswordUpdate} className="space-y-4">
            {mode === 'request' ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetData.email}
                  onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    value={resetData.password}
                    onChange={(e) => setResetData({ ...resetData, password: e.target.value })}
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={resetData.confirmPassword}
                    onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                </div>
              </>
            )}

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

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : mode === 'request' ? 'Send Reset Email' : 'Update Password'}
            </Button>

            <div className="text-center">
              <Link href="/auth" className="text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4 mr-1 inline" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
