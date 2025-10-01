-- ============================================================
-- Complete Supabase Setup for Integra Markets
-- ============================================================
-- This script sets up all necessary tables for the application
-- Run this in your Supabase SQL editor

-- ============================================================
-- 1. USER PREFERENCES TABLE (for personalized news feeds)
-- ============================================================

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    commodities TEXT[] DEFAULT ARRAY['oil', 'gold', 'wheat'],
    sources TEXT[] DEFAULT ARRAY['reuters', 'bloomberg', 'cnbc'],
    regions TEXT[] DEFAULT ARRAY['US', 'EU', 'Asia'],
    keywords TEXT[] DEFAULT '{}',
    websiteURLs TEXT[] DEFAULT '{}',
    alertThreshold TEXT DEFAULT 'medium' CHECK (alertThreshold IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
-- Allow users to view their own preferences
CREATE POLICY "Users can view own preferences" 
    ON public.user_preferences FOR SELECT 
    USING (true); -- For now, allow all reads

-- Allow users to insert their own preferences
CREATE POLICY "Users can insert own preferences" 
    ON public.user_preferences FOR INSERT 
    WITH CHECK (true); -- For now, allow all inserts

-- Allow users to update their own preferences
CREATE POLICY "Users can update own preferences" 
    ON public.user_preferences FOR UPDATE 
    USING (true); -- For now, allow all updates

-- Allow users to delete their own preferences
CREATE POLICY "Users can delete own preferences" 
    ON public.user_preferences FOR DELETE 
    USING (true); -- For now, allow all deletes

-- ============================================================
-- 2. NOTIFICATIONS SYSTEM TABLES
-- ============================================================

-- Push tokens table for storing device tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    device_info JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Alert preferences table (more comprehensive than user_preferences)
CREATE TABLE IF NOT EXISTS public.alert_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    commodities TEXT[] DEFAULT '{}',
    regions TEXT[] DEFAULT '{}',
    currencies TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    website_urls TEXT[] DEFAULT '{}',
    alert_frequency TEXT DEFAULT 'real-time' CHECK (alert_frequency IN ('real-time', 'hourly', 'daily', 'weekly')),
    alert_threshold TEXT DEFAULT 'medium' CHECK (alert_threshold IN ('low', 'medium', 'high')),
    push_notifications BOOLEAN DEFAULT true,
    email_alerts BOOLEAN DEFAULT false,
    market_alerts BOOLEAN DEFAULT true,
    breaking_news BOOLEAN DEFAULT true,
    price_alerts BOOLEAN DEFAULT true,
    weekend_updates BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Notifications table for storing all notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('market_alert', 'breaking_news', 'price_alert', 'threshold_alert', 'system')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    commodity TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Market alerts table for commodity-specific alerts
CREATE TABLE IF NOT EXISTS public.market_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    commodity TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('price_change', 'volume_spike', 'news_event', 'technical_indicator')),
    current_price DECIMAL(10, 2),
    previous_price DECIMAL(10, 2),
    change_percent DECIMAL(5, 2),
    volume BIGINT,
    trigger_value TEXT,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================

-- Indexes for push_tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON public.push_tokens(token);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Indexes for market_alerts
CREATE INDEX IF NOT EXISTS idx_market_alerts_commodity ON public.market_alerts(commodity);
CREATE INDEX IF NOT EXISTS idx_market_alerts_created_at ON public.market_alerts(created_at DESC);

-- ============================================================
-- 4. TRIGGER FUNCTIONS
-- ============================================================

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER update_push_tokens_updated_at 
    BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_preferences_updated_at ON public.alert_preferences;
CREATE TRIGGER update_alert_preferences_updated_at 
    BEFORE UPDATE ON public.alert_preferences
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;

-- Push tokens policies
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" ON public.push_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens" ON public.push_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Alert preferences policies
CREATE POLICY "Users can view their own alert preferences" ON public.alert_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert preferences" ON public.alert_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert preferences" ON public.alert_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Market alerts policies (public read for all authenticated users)
CREATE POLICY "Authenticated users can view market alerts" ON public.market_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- 6. UTILITY FUNCTIONS
-- ============================================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.notifications
        WHERE user_id = p_user_id
        AND is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true,
        read_at = TIMEZONE('utc', NOW())
    WHERE id = p_notification_id
    AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. SAMPLE TEST DATA (Optional - Remove in production)
-- ============================================================

-- Insert test data for user_preferences
INSERT INTO public.user_preferences (user_id, commodities, sources, regions, keywords, websiteURLs, alertThreshold)
VALUES 
    ('test-user', 
     ARRAY['oil', 'gold'], 
     ARRAY['reuters', 'bloomberg'], 
     ARRAY['US', 'EU'], 
     ARRAY['OPEC', 'Federal Reserve', 'inflation'],
     ARRAY['https://oilprice.com/', 'https://www.kitco.com/'],
     'medium'),
    ('demo-user', 
     ARRAY['wheat', 'corn', 'soybeans'], 
     ARRAY['cnbc', 'marketwatch'], 
     ARRAY['US', 'Asia'], 
     ARRAY['agriculture', 'drought', 'harvest'],
     ARRAY['https://www.agriculture.com/', 'https://www.farms.com/'],
     'high')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- END OF SETUP SCRIPT
-- ============================================================

-- To verify everything was created successfully, run:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
