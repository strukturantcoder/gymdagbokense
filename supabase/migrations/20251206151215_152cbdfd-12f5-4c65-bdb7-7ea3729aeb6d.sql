-- Create function to notify admins on new user signup
CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
  new_user_name TEXT;
BEGIN
  -- Get display name from user metadata
  new_user_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email, 'Ny användare');
  
  -- Loop through all admin users and create notifications
  FOR admin_user IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      admin_user.user_id,
      'new_user_signup',
      'Ny användare registrerad',
      new_user_name || ' har registrerat sig på Gymdagboken!',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
CREATE TRIGGER on_new_user_notify_admins
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_user();