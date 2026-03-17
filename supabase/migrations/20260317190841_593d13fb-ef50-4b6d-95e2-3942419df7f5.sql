
-- Auto-assign admin role and approve for the specified admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'nahomteme5@gmail.com' THEN true ELSE false END
  );
  
  IF NEW.email = 'nahomteme5@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;
