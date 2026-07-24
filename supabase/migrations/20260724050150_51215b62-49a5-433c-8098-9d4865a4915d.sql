
CREATE OR REPLACE FUNCTION public.flats_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, previous_value, new_value, metadata)
    VALUES (
      auth.uid(),
      'flat_status_changed',
      'flat',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      jsonb_build_object(
        'project_id', NEW.project_id,
        'building_id', NEW.building_id,
        'floor_id', NEW.floor_id,
        'unit_code', NEW.unit_code
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flats_log_status_change ON public.flats;
CREATE TRIGGER trg_flats_log_status_change
AFTER UPDATE OF status ON public.flats
FOR EACH ROW EXECUTE FUNCTION public.flats_log_status_change();
