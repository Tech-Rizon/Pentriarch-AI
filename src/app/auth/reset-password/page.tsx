'use client';

export const dynamic = 'force-dynamic';

import PasswordReset from '@/components/auth/PasswordReset';

export default function ForgotPasswordPage() {
  return <PasswordReset mode="request" />;
}
