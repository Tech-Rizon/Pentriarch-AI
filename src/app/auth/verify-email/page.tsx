'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EmailVerification from '@/components/auth/EmailVerification'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    // Get email from URL params or local storage
    const emailParam = searchParams.get('email')
    const storedEmail = localStorage.getItem('verificationEmail')

    if (emailParam) {
      setEmail(emailParam)
    } else if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [searchParams])

  return <EmailVerification email={email} />
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
