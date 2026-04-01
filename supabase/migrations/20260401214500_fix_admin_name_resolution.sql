-- Fix 1: Ensure clients can see the profiles of system admins so their names render in comments
CREATE POLICY "Users can view system admins" ON public.users
  FOR SELECT TO authenticated USING (is_system_admin = true);

-- Fix 2: Update the user creation trigger to properly sync full_name from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Backfill any existing users (like the current admin) whose full_name was missed
UPDATE public.users u
SET full_name = au.raw_user_meta_data->>'full_name'
FROM auth.users au
WHERE u.id = au.id AND u.full_name IS NULL AND au.raw_user_meta_data->>'full_name' IS NOT NULL;
