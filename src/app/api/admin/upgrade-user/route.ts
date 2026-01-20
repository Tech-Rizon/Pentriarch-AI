import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUserServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Only allow admins to upgrade users
    // Debug: log headers and cookies
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    try {
      const cookieHeader = request.headers.get('cookie');
      console.log('Cookie header:', cookieHeader);
    } catch (e) {
      console.log('Error reading cookie header:', e);
    }
    // Get current user
    const adminUser = await getCurrentUserServer(request);
    console.log('Fetched adminUser:', adminUser);
    // Check both role and plan for admin access
    const role = (adminUser && 'role' in adminUser) ? adminUser.role : undefined;
    const plan = (adminUser && 'plan' in adminUser) ? adminUser.plan : undefined;
    const isAdmin = role === 'admin';
    const isEnterprise = plan === 'enterprise';
    const isPro = plan === 'pro';
    // Allow access for admin role, enterprise plan, or pro plan
    if (!adminUser || (!isAdmin && !isEnterprise && !isPro)) {
      console.log('Access denied. role:', role, 'plan:', plan);
      return NextResponse.json({ error: 'Forbidden: Admin/Pro/Enterprise access required' }, { status: 403 });
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
