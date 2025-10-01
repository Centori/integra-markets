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
    USING (true); -- For now, allow all reads (you can restrict to auth.uid() = user_id::uuid if needed)

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

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data
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
