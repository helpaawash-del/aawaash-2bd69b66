
-- Recreate handle_new_user + trigger (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name TEXT := COALESCE(meta->>'full_name', '');
  v_mobile TEXT := COALESCE(meta->>'mobile_number', '');
  v_login_id TEXT := COALESCE(meta->>'login_id', '');
  v_team_letter TEXT := meta->>'team_letter';
  v_role public.app_role := COALESCE((meta->>'role')::public.app_role, 'member');
  v_team_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF v_mobile = '' THEN
    v_mobile := regexp_replace(split_part(NEW.email, '@', 1), '[^0-9]', '', 'g');
    IF length(v_mobile) < 10 THEN
      v_mobile := lpad(v_mobile, 10, '0');
    END IF;
  END IF;

  IF v_login_id = '' THEN
    v_login_id := COALESCE(v_team_letter, '') || v_mobile;
  END IF;

  IF v_team_letter IS NOT NULL THEN
    SELECT id INTO v_team_id FROM public.teams WHERE letter = v_team_letter;
  END IF;

  INSERT INTO public.profiles (id, full_name, mobile_number, login_id, email, team_id)
  VALUES (NEW.id, v_full_name, v_mobile, v_login_id, NEW.email, v_team_id);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth.users missing a public.profiles row
INSERT INTO public.profiles (id, full_name, mobile_number, login_id, email, team_id)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'mobile_number', ''),
    lpad(regexp_replace(split_part(u.email, '@', 1), '[^0-9]', '', 'g'), 10, '0')
  ),
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'login_id', ''),
    COALESCE(u.raw_user_meta_data->>'team_letter', '')
      || COALESCE(NULLIF(u.raw_user_meta_data->>'mobile_number', ''),
                  lpad(regexp_replace(split_part(u.email, '@', 1), '[^0-9]', '', 'g'), 10, '0'))
  ),
  u.email,
  (SELECT t.id FROM public.teams t WHERE t.letter = u.raw_user_meta_data->>'team_letter')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Ensure a default role exists for every user
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, COALESCE((u.raw_user_meta_data->>'role')::public.app_role, 'member')
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign team ownership for team leaders based on their metadata team_letter
UPDATE public.teams t
SET leader_id = sub.user_id
FROM (
  SELECT u.id AS user_id, u.raw_user_meta_data->>'team_letter' AS letter
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'team_leader'
  WHERE u.raw_user_meta_data->>'team_letter' IS NOT NULL
) sub
WHERE t.letter = sub.letter AND (t.leader_id IS NULL OR t.leader_id = sub.user_id);
