-- Create types
CREATE TYPE custom_role AS ENUM ('owner', 'member');

-- Create tables
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  role custom_role,
  is_system_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
  SELECT is_system_admin FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's client_id
CREATE OR REPLACE FUNCTION public.get_user_client()
RETURNS UUID AS $$
  SELECT client_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for clients
CREATE POLICY "System admins can manage all clients" ON public.clients
  FOR ALL TO authenticated USING (public.is_system_admin());

CREATE POLICY "Users can view their own client" ON public.clients
  FOR SELECT TO authenticated USING (id = public.get_user_client());

-- RLS Policies for users
CREATE POLICY "System admins can manage all users" ON public.users
  FOR ALL TO authenticated USING (public.is_system_admin());

CREATE POLICY "Users can view members of their own client" ON public.users
  FOR SELECT TO authenticated USING (client_id = public.get_user_client());

CREATE POLICY "Users can read their own row" ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Owners can manage members of their own client" ON public.users
  FOR UPDATE TO authenticated USING (
    client_id = public.get_user_client() AND 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
  );

-- RLS Policies for projects
CREATE POLICY "System admins can manage all projects" ON public.projects
  FOR ALL TO authenticated USING (public.is_system_admin());

CREATE POLICY "Users can manage projects for their own client" ON public.projects
  FOR ALL TO authenticated USING (client_id = public.get_user_client());

-- Trigger to create a user record automatically after a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
