-- ============================================================
-- Latansa Laundry — Supabase SQL Migration (Idempotent / Aman Dijalankan Berulang Kali)
-- Salin dan jalankan seluruh isi file ini di Supabase SQL Editor
-- ============================================================

-- ─── 1. Profiles (extends auth.users) ────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'supervisor', 'admin')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Orders ───────────────────────────────────────────────
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
    payment_method     TEXT NOT NULL DEFAULT 'cash',
    payment_status     TEXT NOT NULL DEFAULT 'paid',
    payment_proof_url  TEXT,
    customer_note      TEXT,
    status             TEXT NOT NULL DEFAULT 'new',
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

-- Safe update constraint for payment_method (allows cash, qris, transfer)
DO $$
BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash', 'qris', 'transfer'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Safe update constraint for order status
DO $$
BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN (
        'waiting_confirmation', 'new', 'received',
        'processing', 'ready', 'completed', 'cancelled'
    ));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status           ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_submitted_at     ON public.orders(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id   ON public.orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_student_reg_num  ON public.orders(student_reg_number);

-- ─── 3. Order Events (Audit Trail) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.order_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type     TEXT NOT NULL,
    actor_id       UUID REFERENCES auth.users(id),
    description    TEXT NOT NULL,
    metadata       JSONB,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);

-- ─── 4. Laundry Notes (Staff internal notes) ─────────────────
CREATE TABLE IF NOT EXISTS public.laundry_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    staff_id   UUID REFERENCES auth.users(id),
    note       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL UNIQUE,
    value       TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Device Sources (optional, track origin stand) ────────
CREATE TABLE IF NOT EXISTS public.device_sources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code TEXT NOT NULL UNIQUE,
    stand_name  TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
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
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Orders: authenticated staff can read all orders
DROP POLICY IF EXISTS "orders_select_authenticated" ON public.orders;
CREATE POLICY "orders_select_authenticated"
    ON public.orders FOR SELECT
    TO authenticated
    USING (TRUE);

-- Orders: anonymous users can read order tracking data
DROP POLICY IF EXISTS "orders_select_anon_tracking" ON public.orders;
CREATE POLICY "orders_select_anon_tracking"
    ON public.orders FOR SELECT
    TO anon
    USING (TRUE);

-- Order Events: anon can read events for tracking purposes
DROP POLICY IF EXISTS "order_events_select_anon_tracking" ON public.order_events;
CREATE POLICY "order_events_select_anon_tracking"
    ON public.order_events FOR SELECT
    TO anon
    USING (TRUE);

-- Order Events: authenticated staff can read
DROP POLICY IF EXISTS "order_events_select_authenticated" ON public.order_events;
CREATE POLICY "order_events_select_authenticated"
    ON public.order_events FOR SELECT
    TO authenticated
    USING (TRUE);

-- Order Events: authenticated staff can insert
DROP POLICY IF EXISTS "order_events_insert_authenticated" ON public.order_events;
CREATE POLICY "order_events_insert_authenticated"
    ON public.order_events FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Laundry Notes: authenticated staff only
DROP POLICY IF EXISTS "laundry_notes_all_authenticated" ON public.laundry_notes;
CREATE POLICY "laundry_notes_all_authenticated"
    ON public.laundry_notes FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- Settings: authenticated staff can read
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;
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
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE: Bucket payment_proofs (untuk foto bukti transfer/QRIS)
-- ============================================================
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('payment_proofs', 'payment_proofs', true, 8388608)
    ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Policy Storage: Boleh dibaca oleh publik (untuk preview bukti)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access Payment Proofs" ON storage.objects;
    CREATE POLICY "Public Access Payment Proofs"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'payment_proofs');
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Policy Storage: Boleh diupload oleh siapapun (anon / authenticated)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Upload Payment Proofs" ON storage.objects;
    CREATE POLICY "Public Upload Payment Proofs"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'payment_proofs');
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
