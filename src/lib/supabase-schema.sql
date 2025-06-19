-- Pentriarch AI Database Schema
-- Run this in your Supabase SQL Editor
-- Create custom user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT CHECK (plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
    usage_tokens INTEGER DEFAULT 0,
    max_tokens INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create scans table
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    target TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    ai_model TEXT NOT NULL,
    tool_used TEXT,
    command_executed TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    metadata JSONB
);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
    findings JSONB NOT NULL DEFAULT '[]',
    summary TEXT,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 10),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ai_analysis TEXT,
    recommendations TEXT[],
    export_url TEXT
);

-- Create scan_logs table
CREATE TABLE IF NOT EXISTS public.scan_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    level TEXT CHECK (level IN ('info', 'warning', 'error', 'debug')) DEFAULT 'info',
    message TEXT NOT NULL,
    raw_output TEXT
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('scan_complete', 'vulnerability_found', 'system_alert', 'ai_fallback')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    preferred_ai_model TEXT DEFAULT 'gpt-4-mini',
    notification_preferences JSONB DEFAULT '{"email": true, "browser": true, "scan_complete": true, "vulnerabilities": true}',
    api_keys JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for scans
CREATE POLICY "Users can view own scans" ON public.scans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON public.scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" ON public.scans
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can view own reports" ON public.reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scans
            WHERE scans.id = reports.scan_id
            AND scans.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert reports" ON public.reports
    FOR INSERT WITH CHECK (true);

-- RLS Policies for scan_logs
CREATE POLICY "Users can view own scan logs" ON public.scan_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scans
            WHERE scans.id = scan_logs.scan_id
            AND scans.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert scan logs" ON public.scan_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);