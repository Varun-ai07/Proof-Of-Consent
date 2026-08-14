-- Supabase SQL Setup for PoC (Proof of Consent)
-- Run this in Supabase SQL Editor

-- 1. Create signed_consents table (for PDF storage)
CREATE TABLE IF NOT EXISTS signed_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consent_id TEXT UNIQUE NOT NULL,
    doctor_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    procedure TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdf_url TEXT,
    pdf_path TEXT,
    status TEXT DEFAULT 'signed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create consents table (for all consent data)
CREATE TABLE IF NOT EXISTS consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consent_id TEXT UNIQUE NOT NULL,
    doctor_id TEXT,
    patient_name TEXT,
    procedure TEXT,
    status TEXT DEFAULT 'PENDING_PATIENT',
    emergency_mode BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_consents_doctor ON consents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status);
CREATE INDEX IF NOT EXISTS idx_signed_consents_doctor ON signed_consents(doctor_id);

-- 5. Enable Row Level Security (optional)
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Create policies (allow all for demo, restrict in production)
CREATE POLICY "Allow all consents" ON consents FOR ALL USING (true);
CREATE POLICY "Allow all signed_consents" ON signed_consents FOR ALL USING (true);
CREATE POLICY "Allow all users" ON users FOR ALL USING (true);

-- 7. Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('consent-pdfs', 'consent-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies
CREATE POLICY "Public read PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'consent-pdfs');
CREATE POLICY "Authenticated upload PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'consent-pdfs');
CREATE POLICY "Authenticated delete PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'consent-pdfs');

-- 9. Updated_at trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_consents_updated_at ON consents;
DROP TRIGGER IF EXISTS update_signed_consents_updated_at ON signed_consents;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consents_updated_at BEFORE UPDATE ON consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signed_consents_updated_at BEFORE UPDATE ON signed_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
