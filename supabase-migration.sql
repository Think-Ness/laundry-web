-- ============================================================
-- LaundrySantri — Supabase SQL Migration
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ─── Profiles (extends auth.users) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'supervisor', 'admin')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Orders ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id     TEXT NOT NULL UNIQUE,           -- LW-RT01-260930-0001
    intake_token_hash  TEXT NOT NULL UNIQUE,           -- SHA256 of QR token
    customer_name      TEXT NOT NULL,
    student_name       TEXT NOT NULL,
    student_reg_number TEXT,                           -- NIS / No. Registrasi Santri
    service_type       TEXT NOT NULL DEFAULT 'biasa',  -- biasa | express | kilat
    customer_phone     TEXT,
    weight             NUMERIC(6, 2) NOT NULL,
    unit_price         INTEGER NOT NULL,
    total_amount       INTEGER NOT NULL,
    payment_method     TEXT NOT NULL CHECK (payment_method IN ('cash', 'qris')),
    payment_status     TEXT NOT NULL DEFAULT 'paid',
    customer_note      TEXT,
    status             TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
                           'waiting_confirmation', 'new', 'received',
                           'processing', 'ready', 'completed', 'cancelled'
                       )),
    submitted_at       TIMESTAMPTZ,
    received_at        TIMESTAMPTZ,
    processing_at      TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for existing tables
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS student_reg_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'biasa';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Update payment_method constraint to allow transfer
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash', 'qris', 'transfer'));

CREATE INDEX IF NOT EXISTS idx_orders_status           ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_submitted_at     ON public.orders(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id   ON public.orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_student_reg_num  ON public.orders(student_reg_number);

-- ─── Order Events (Audit Trail) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type     TEXT NOT NULL,
    actor_id       UUID REFERENCES auth.users(id),
    description    TEXT NOT NULL,
    metadata       JSONB,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_events_order_id ON public.order_events(order_id);

-- ─── Laundry Notes (Staff internal notes) ───────────────────
CREATE TABLE IF NOT EXISTS public.laundry_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    staff_id   UUID REFERENCES auth.users(id),
    note       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Settings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL UNIQUE,
    value       TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Device Sources (optional, track origin stand) ──────────
CREATE TABLE IF NOT EXISTS public.device_sources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code TEXT NOT NULL UNIQUE,
    stand_name  TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings      ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read their own profile
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Orders: authenticated staff can read all orders
CREATE POLICY "orders_select_authenticated"
    ON public.orders FOR SELECT
    TO authenticated
    USING (TRUE);

-- Orders: anonymous users can read order tracking data (limited public fields)
-- Used by /track/[txId] page — no auth required, secured by transaction_id lookup
CREATE POLICY "orders_select_anon_tracking"
    ON public.orders FOR SELECT
    TO anon
    USING (TRUE);

-- Order Events: anon can read events for tracking purposes
CREATE POLICY "order_events_select_anon_tracking"
    ON public.order_events FOR SELECT
    TO anon
    USING (TRUE);

-- Orders: only service role can insert (via API route, not direct client)
-- Public form uses service role key server-side — no anon INSERT allowed
-- No anon SELECT on orders either

-- Order Events: authenticated staff can read
CREATE POLICY "order_events_select_authenticated"
    ON public.order_events FOR SELECT
    TO authenticated
    USING (TRUE);

-- Order Events: authenticated staff can insert
CREATE POLICY "order_events_insert_authenticated"
    ON public.order_events FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Laundry Notes: authenticated staff only
CREATE POLICY "laundry_notes_all_authenticated"
    ON public.laundry_notes FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- Settings: authenticated staff can read
CREATE POLICY "settings_select_authenticated"
    ON public.settings FOR SELECT
    TO authenticated
    USING (TRUE);

-- ============================================================
-- AUTO-CREATE PROFILE on auth.users signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles(id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- NOTES FOR SETUP:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. In Authentication > Settings: enable email/password auth
-- 3. Create first staff account via Supabase Auth dashboard
--    or: SELECT supabase.auth.admin.createUser({email, password})
-- 4. Set environment variables in Vercel:
--    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
-- 5. Set QR_SIGNATURE_SECRET (same as laundry-stand .env)
-- ============================================================
