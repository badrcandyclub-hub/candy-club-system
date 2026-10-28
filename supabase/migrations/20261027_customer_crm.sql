-- Customer relationship metadata only. Existing customers, orders, gifts and totals are untouched.
-- Apply once through the Supabase SQL editor / normal migration process before enabling CRM writes.
-- Access follows the application's existing username/password login; no public table access is granted.
BEGIN;

CREATE OR REPLACE FUNCTION public.crm_normalize_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog
AS $$
DECLARE
    v_phone text;
BEGIN
    v_phone := regexp_replace(translate(btrim(p_phone), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[[:space:]().-]', '', 'g');
    IF v_phone !~ '^\+?[0-9]+$' THEN
        RAISE EXCEPTION 'Invalid customer phone' USING ERRCODE = '22023';
    END IF;
    IF left(v_phone, 1) = '+' THEN v_phone := substr(v_phone, 2); END IF;
    IF v_phone LIKE '00%' THEN v_phone := substr(v_phone, 3); END IF;
    IF v_phone ~ '^01[0125][0-9]{8}$' THEN v_phone := '2' || v_phone; END IF;
    IF v_phone ~ '^1[0125][0-9]{8}$' THEN v_phone := '20' || v_phone; END IF;
    IF v_phone LIKE '201%' AND v_phone !~ '^201[0125][0-9]{8}$' THEN
        RAISE EXCEPTION 'Invalid Egyptian mobile number' USING ERRCODE = '22023';
    END IF;
    IF v_phone !~ '^[1-9][0-9]{7,14}$' THEN
        RAISE EXCEPTION 'Invalid customer phone' USING ERRCODE = '22023';
    END IF;
    RETURN v_phone;
END;
$$;

CREATE TABLE IF NOT EXISTS public.customer_crm_profiles (
    phone text PRIMARY KEY CHECK (phone = public.crm_normalize_phone(phone)),
    customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 1 AND 160),
    governorate text NOT NULL DEFAULT '' CHECK (char_length(governorate) <= 100),
    address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 1000),
    relationship text NOT NULL DEFAULT 'customer' CHECK (relationship IN ('customer', 'prospect')),
    sources text[] NOT NULL DEFAULT '{}' CHECK (cardinality(sources) <= 20),
    interests text[] NOT NULL DEFAULT '{}' CHECK (cardinality(interests) <= 20),
    lifecycle text NOT NULL DEFAULT 'new' CHECK (lifecycle IN ('new', 'contacted', 'interested', 'follow_up', 'inactive')),
    contact_permission text NOT NULL DEFAULT 'unknown' CHECK (contact_permission IN ('unknown', 'allowed', 'declined')),
    notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 4000),
    next_follow_up date,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text NOT NULL,
    revision integer NOT NULL DEFAULT 1 CHECK (revision > 0)
);

ALTER TABLE public.customer_crm_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_crm_profiles FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.crm_assert_access(p_user text, p_pass text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    IF p_user IS NULL OR p_pass IS NULL OR p_user = '' OR p_pass = '' OR NOT EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.username = p_user AND u.password = p_pass AND u.status = 'نشط'
          AND (btrim(u.permissions) = 'ALL' OR 'customers' = ANY(regexp_split_to_array(btrim(coalesce(u.permissions, '')), '\s*,\s*')))
    ) THEN
        RAISE EXCEPTION 'CRM access denied. Sign in with customer permission.' USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_list_profiles(p_user text, p_pass text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 500)
RETURNS SETOF public.customer_crm_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    PERFORM public.crm_assert_access(p_user, p_pass);
    IF p_offset IS NULL OR p_offset < 0 OR p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
        RAISE EXCEPTION 'Invalid CRM page bounds' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY SELECT c.* FROM public.customer_crm_profiles AS c ORDER BY c.phone LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_save_profiles(p_user text, p_pass text, p_profiles jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_input jsonb;
    v_key text;
    v_phone text;
    v_seen text[] := '{}';
    v_expected integer;
    v_profile public.customer_crm_profiles%ROWTYPE;
    v_saved public.customer_crm_profiles%ROWTYPE;
    v_results jsonb := '[]'::jsonb;
BEGIN
    PERFORM public.crm_assert_access(p_user, p_pass);
    IF p_profiles IS NULL OR jsonb_typeof(p_profiles) <> 'array' THEN
        RAISE EXCEPTION 'CRM profiles must be an array' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_profiles) < 1 OR jsonb_array_length(p_profiles) > 200 THEN
        RAISE EXCEPTION 'Save between 1 and 200 CRM profiles per request' USING ERRCODE = '22023';
    END IF;

    FOR v_input IN SELECT value FROM jsonb_array_elements(p_profiles) LOOP
        IF jsonb_typeof(v_input) <> 'object' THEN
            RAISE EXCEPTION 'Each CRM profile must be an object' USING ERRCODE = '22023';
        END IF;
        FOR v_key IN SELECT jsonb_object_keys(v_input) LOOP
            IF v_key <> ALL(ARRAY['phone','customer_name','governorate','address','relationship','sources','interests','lifecycle','contact_permission','notes','next_follow_up','expected_revision']) THEN
                RAISE EXCEPTION 'Unexpected CRM field' USING ERRCODE = '22023';
            END IF;
        END LOOP;
        FOREACH v_key IN ARRAY ARRAY['phone','customer_name','governorate','address','relationship','lifecycle','contact_permission','notes','next_follow_up'] LOOP
            IF v_input ? v_key AND jsonb_typeof(v_input -> v_key) NOT IN ('string','null') THEN
                RAISE EXCEPTION 'CRM text fields must be strings' USING ERRCODE = '22023';
            END IF;
        END LOOP;
        IF coalesce(v_input ->> 'phone', '') = '' OR coalesce(v_input ->> 'customer_name', '') = '' THEN
            RAISE EXCEPTION 'Customer name and phone are required' USING ERRCODE = '22023';
        END IF;
        v_phone := public.crm_normalize_phone(v_input ->> 'phone');
        IF v_phone = ANY(v_seen) THEN
            RAISE EXCEPTION 'Duplicate phone in CRM batch' USING ERRCODE = '22023';
        END IF;
        v_seen := array_append(v_seen, v_phone);
        IF coalesce(jsonb_typeof(v_input -> 'expected_revision'), '') <> 'number'
           OR coalesce(v_input ->> 'expected_revision', '') !~ '^[0-9]{1,9}$' THEN
            RAISE EXCEPTION 'A nonnegative expected_revision is required' USING ERRCODE = '22023';
        END IF;
        v_expected := (v_input ->> 'expected_revision')::integer;

        FOREACH v_key IN ARRAY ARRAY['sources','interests'] LOOP
            IF v_input ? v_key THEN
                IF jsonb_typeof(v_input -> v_key) <> 'array' THEN
                    RAISE EXCEPTION 'CRM tags must be arrays' USING ERRCODE = '22023';
                END IF;
                IF jsonb_array_length(v_input -> v_key) > 20 OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(v_input -> v_key) AS t(value)
                    WHERE jsonb_typeof(t.value) <> 'string' OR char_length(btrim(t.value #>> '{}')) NOT BETWEEN 1 AND 80
                ) THEN
                    RAISE EXCEPTION 'Use at most 20 nonempty CRM tags, each up to 80 characters' USING ERRCODE = '22023';
                END IF;
            END IF;
        END LOOP;

        v_profile.phone := v_phone;
        v_profile.customer_name := btrim(v_input ->> 'customer_name');
        v_profile.governorate := btrim(coalesce(v_input ->> 'governorate', ''));
        v_profile.address := btrim(coalesce(v_input ->> 'address', ''));
        v_profile.relationship := coalesce(v_input ->> 'relationship', 'customer');
        v_profile.lifecycle := coalesce(v_input ->> 'lifecycle', 'new');
        v_profile.contact_permission := coalesce(v_input ->> 'contact_permission', 'unknown');
        v_profile.notes := coalesce(v_input ->> 'notes', '');
        SELECT coalesce(array_agg(DISTINCT btrim(t.value) ORDER BY btrim(t.value)), '{}') INTO v_profile.sources
            FROM jsonb_array_elements_text(coalesce(v_input -> 'sources', '[]'::jsonb)) AS t(value);
        SELECT coalesce(array_agg(DISTINCT btrim(t.value) ORDER BY btrim(t.value)), '{}') INTO v_profile.interests
            FROM jsonb_array_elements_text(coalesce(v_input -> 'interests', '[]'::jsonb)) AS t(value);
        IF nullif(v_input ->> 'next_follow_up', '') IS NOT NULL AND (v_input ->> 'next_follow_up') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
            RAISE EXCEPTION 'Follow-up date must use YYYY-MM-DD' USING ERRCODE = '22023';
        END IF;
        v_profile.next_follow_up := nullif(v_input ->> 'next_follow_up', '')::date;
        v_profile.updated_at := clock_timestamp();
        v_profile.updated_by := p_user;

        IF v_expected = 0 THEN
            BEGIN
                INSERT INTO public.customer_crm_profiles (
                    phone, customer_name, governorate, address, relationship, sources, interests,
                    lifecycle, contact_permission, notes, next_follow_up, updated_at, updated_by, revision
                ) VALUES (
                    v_profile.phone, v_profile.customer_name, v_profile.governorate, v_profile.address,
                    v_profile.relationship, v_profile.sources, v_profile.interests, v_profile.lifecycle,
                    v_profile.contact_permission, v_profile.notes, v_profile.next_follow_up,
                    v_profile.updated_at, v_profile.updated_by, 1
                ) RETURNING * INTO v_saved;
            EXCEPTION WHEN unique_violation THEN
                RAISE EXCEPTION 'CRM profile already exists; refresh before editing' USING ERRCODE = '40001';
            END;
        ELSE
            UPDATE public.customer_crm_profiles AS c SET
                customer_name = v_profile.customer_name, governorate = v_profile.governorate,
                address = v_profile.address, relationship = v_profile.relationship,
                sources = v_profile.sources, interests = v_profile.interests, lifecycle = v_profile.lifecycle,
                contact_permission = v_profile.contact_permission, notes = v_profile.notes,
                next_follow_up = v_profile.next_follow_up, updated_at = v_profile.updated_at,
                updated_by = v_profile.updated_by, revision = c.revision + 1
            WHERE c.phone = v_phone AND c.revision = v_expected
            RETURNING c.* INTO v_saved;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'CRM profile changed; refresh before saving' USING ERRCODE = '40001';
            END IF;
        END IF;
        v_results := v_results || jsonb_build_array(to_jsonb(v_saved));
    END LOOP;
    RETURN jsonb_build_object('profiles', v_results, 'count', jsonb_array_length(v_results));
END;
$$;

REVOKE ALL ON FUNCTION public.crm_normalize_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_assert_access(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_list_profiles(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_save_profiles(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_list_profiles(text, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_save_profiles(text, text, jsonb) TO anon, authenticated;

COMMIT;
