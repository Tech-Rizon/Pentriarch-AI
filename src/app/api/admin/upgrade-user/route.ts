import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUserServer } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Only allow admins to upgrade users
    const adminUser = await getCurrentUserServer(request);
    // Only check properties that exist on the User type
    const role = (adminUser && 'role' in adminUser) ? adminUser.role : undefined;
    const plan = (adminUser && 'plan' in adminUser) ? adminUser.plan : undefined;
    const isAdmin = role === 'admin';
    const isEnterprise = plan === 'enterprise';
    if (!adminUser || (!isAdmin && !isEnterprise)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { email, newPlan } = body || {};
    if (!email || !newPlan || !['free', 'pro', 'enterprise'].includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // Update user_profiles table
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ plan: newPlan })
      .eq('email', email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
