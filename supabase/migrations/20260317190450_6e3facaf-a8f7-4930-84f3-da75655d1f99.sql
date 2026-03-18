
-- Apartments table
CREATE TABLE public.apartments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor INTEGER NOT NULL,
  position TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view apartments" ON public.apartments FOR SELECT TO authenticated USING (true);

-- Tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  move_in_date DATE NOT NULL,
  rent_price NUMERIC NOT NULL,
  payment_period_months INTEGER NOT NULL DEFAULT 1 CHECK (payment_period_months >= 1 AND payment_period_months <= 12),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view tenants" ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tenants" ON public.tenants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tenants" ON public.tenants FOR DELETE TO authenticated USING (true);

-- Electricity bills
CREATE TABLE public.electricity_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kwh_used NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  service_fee NUMERIC NOT NULL DEFAULT 16,
  tv_fee NUMERIC NOT NULL DEFAULT 10,
  tax_rate NUMERIC NOT NULL DEFAULT 0.155,
  total NUMERIC NOT NULL,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.electricity_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view elec bills" ON public.electricity_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert elec bills" ON public.electricity_bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update elec bills" ON public.electricity_bills FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete elec bills" ON public.electricity_bills FOR DELETE TO authenticated USING (true);

-- Water bills
CREATE TABLE public.water_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.water_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view water bills" ON public.water_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert water bills" ON public.water_bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update water bills" ON public.water_bills FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete water bills" ON public.water_bills FOR DELETE TO authenticated USING (true);

-- Profiles with admin approval
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed apartments
INSERT INTO public.apartments (floor, position, label) VALUES
  (2, 'front', '2nd Floor - Front House'),
  (2, 'back', '2nd Floor - Back House'),
  (3, 'front', '3rd Floor - Front House'),
  (3, 'back', '3rd Floor - Back House'),
  (4, 'front', '4th Floor - Front House'),
  (4, 'back', '4th Floor - Back House'),
  (5, 'single', '5th Floor');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CLEAR ALL RECORDED DATA (SAFE VERSION)
-- ============================================

-- Remove all electricity bills
TRUNCATE TABLE public.electricity_bills RESTART IDENTITY CASCADE;

-- Remove all water bills
TRUNCATE TABLE public.water_bills RESTART IDENTITY CASCADE;

-- Remove all tenants
TRUNCATE TABLE public.tenants RESTART IDENTITY CASCADE;

-- Optional: Remove profiles and user roles
TRUNCATE TABLE public.user_roles RESTART IDENTITY;
TRUNCATE TABLE public.profiles RESTART IDENTITY;

-- Optional: Remove apartments (uncomment only if needed)
-- TRUNCATE TABLE public.apartments RESTART IDENTITY;