-- Run once in the Supabase SQL editor (or through your normal migration process).
-- Keep the original registrant immutable for every client, including older app versions.
-- No existing rows are changed. All other transfer fields remain editable.
BEGIN;

CREATE OR REPLACE FUNCTION public.inventory_logs_keep_reg_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.reg_name IS DISTINCT FROM OLD.reg_name THEN
        RAISE EXCEPTION 'The original transfer registrant cannot be changed'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_logs_keep_reg_name ON public.inventory_logs;
CREATE TRIGGER inventory_logs_keep_reg_name
BEFORE UPDATE ON public.inventory_logs
FOR EACH ROW EXECUTE FUNCTION public.inventory_logs_keep_reg_name();

COMMIT;
