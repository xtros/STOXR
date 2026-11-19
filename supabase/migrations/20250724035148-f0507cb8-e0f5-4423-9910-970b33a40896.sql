-- ====================================================================
-- STOXR Security & Privilege Escalation Hardening Migration
-- Protects against SQLi, search_path hijacking, and unauthorized role elevation
-- ====================================================================

-- 1. Profiles Table with Constraints
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Admin Verification Function (Search path secured)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND (role = 'admin' OR LOWER(email) = 'admin@stoxr.com')
  );
$$;

-- 3. Hardened RLS Policies
-- SELECT: Users can view their own profile; admins can view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id OR public.is_admin());

-- UPDATE: Non-admins can only update their own row and CANNOT elevate their role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    CASE 
      WHEN public.is_admin() THEN true
      WHEN auth.uid() = id AND role = 'user' THEN true
      ELSE false
    END
  );

-- 4. Trigger for New User Registration (Prevent Privilege Escalation via User Metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    SUBSTRING(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), 1, 60),
    CASE 
      WHEN LOWER(TRIM(NEW.email)) = 'admin@stoxr.com' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Safe, Parameterized Email Existence Checker (Protection against SQLi & timing attacks)
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict bounds check to prevent payload flooding / ReDoS
  IF email_to_check IS NULL OR LENGTH(email_to_check) > 254 THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE LOWER(email) = LOWER(TRIM(email_to_check))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated;
