-- ============================================================================
-- BASELINE SCHEMA — Govbidder Challenge Dashboard
-- ============================================================================
-- Generado: 2026-05-27 a partir de pg_dump del proyecto fsawwhvdsqmxgxrpuwos
-- Refleja el estado REAL de producción al momento del audit.
--
-- ADVERTENCIA: este baseline incluye GRANTs peligrosos (EXECUTE TO PUBLIC
-- en funciones SECURITY DEFINER) que son vulnerabilidades documentadas
-- en el audit. Los REVOKEs correctivos vienen en migrations del Día 2.
--
-- SI RESTAURAS ESTE BASELINE EN STAGING o en un proyecto nuevo, asegurate
-- de correr TODAS las migrations posteriores antes de exponer el ambiente.
-- Restaurar solo el baseline reproduce los bugs de seguridad de producción.
-- ============================================================================

-- Disable function body validation during baseline restore.
-- Required because PL/pgSQL functions reference tables that are created
-- later in the same file. pg_dump emits this by default; awk cleanup removed it.
SET check_function_bodies = false;

CREATE FUNCTION public.admin_uncomplete_day(p_user_id uuid, p_day integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_start_xp    int := 0;
  v_complete_xp int := 0;
  v_video_xp    int := 0;
  v_calljoin_xp int := 0;
  v_total_xp    int;
  v_new_points  int;
  v_progress    record;
BEGIN
  SELECT is_completed, is_unlocked INTO v_progress
    FROM public.day_progress
   WHERE user_id = p_user_id AND day_number = p_day;

  IF v_progress.is_unlocked THEN
    v_start_xp := 25;
  END IF;

  IF v_progress.is_completed THEN
    v_complete_xp := 50;
  END IF;

  SELECT COALESCE(SUM(vc.points_reward), 0) INTO v_video_xp
    FROM public.video_capsule_completions vcc
    JOIN public.video_capsules vc ON vc.id = vcc.capsule_id
   WHERE vcc.user_id = p_user_id AND vc.day_number = p_day;

  IF EXISTS (
    SELECT 1 FROM public.user_events
     WHERE user_id = p_user_id
       AND event_type = 'call_join_day_' || p_day
  ) THEN
    v_calljoin_xp := 30;
  END IF;

  v_total_xp := v_start_xp + v_complete_xp + v_video_xp + v_calljoin_xp;

  DELETE FROM public.video_capsule_completions
   WHERE user_id = p_user_id
     AND capsule_id IN (
           SELECT id FROM public.video_capsules WHERE day_number = p_day
         );

  DELETE FROM public.user_events
   WHERE user_id = p_user_id
     AND event_type = 'call_join_day_' || p_day;

  -- ⚠️ CAMBIO: solo desmarca is_completed, mantiene is_unlocked = true
  UPDATE public.day_progress
     SET is_completed = false,
         completed_at = null
   WHERE user_id = p_user_id AND day_number = p_day;

  UPDATE public.users
     SET total_points = GREATEST(0, total_points - v_total_xp)
   WHERE id = p_user_id
  RETURNING total_points INTO v_new_points;

  RETURN jsonb_build_object(
    'xp_removed',    v_total_xp,
    'start_xp',      v_start_xp,
    'complete_xp',   v_complete_xp,
    'video_xp',      v_video_xp,
    'calljoin_xp',   v_calljoin_xp,
    'new_total',     v_new_points
  );
END;
$$;

--
-- Name: check_ai_rate_limit(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_ai_rate_limit(p_user_id uuid, p_endpoint text, p_max_calls integer, p_window_seconds integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_count int;
  v_oldest timestamptz;
BEGIN
  -- Limpiar registros viejos (housekeeping liviano)
  DELETE FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND called_at < now() - (p_window_seconds || ' seconds')::interval;

  -- Contar en la ventana
  SELECT COUNT(*), MIN(called_at)
  INTO v_count, v_oldest
  FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND called_at >= now() - (p_window_seconds || ' seconds')::interval;

  IF v_count >= p_max_calls THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', 
        EXTRACT(EPOCH FROM (v_oldest + (p_window_seconds || ' seconds')::interval - now()))::int,
      'current_count', v_count,
      'limit', p_max_calls
    );
  END IF;

  -- Registrar este intento
  INSERT INTO public.ai_rate_limits (user_id, endpoint)
  VALUES (p_user_id, p_endpoint);

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + 1,
    'limit', p_max_calls
  );
END;
$$;

--
-- Name: get_day_completion_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_day_completion_counts() RETURNS TABLE(day_number integer, completed_today bigint, completed_total bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select
    dp.day_number,
    count(*) filter (
      where dp.is_completed = true
        and dp.completed_at::date = current_date
    ) as completed_today,
    count(*) filter (
      where dp.is_completed = true
    ) as completed_total
  from public.day_progress dp
  group by dp.day_number
  order by dp.day_number;
$$;

--
-- Name: get_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_leaderboard() RETURNS TABLE(rank bigint, display_name text, total_points integer, raffle_entries integer, is_current_user boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  with ranked as (
    select
      row_number() over (order by total_points desc, created_at asc) as rank,
      -- Truncate last name to first initial for privacy: "Juan P."
      case
        when full_name is null or full_name = '' then 'Anónimo'
        when position(' ' in full_name) = 0      then full_name
        else split_part(full_name, ' ', 1) || ' ' || left(split_part(full_name, ' ', 2), 1) || '.'
      end                                    as display_name,
      total_points,
      greatest(0, total_points / 10)        as raffle_entries,
      id                                     as user_id
    from public.users
    where total_points > 0
    order by total_points desc, created_at asc
    limit 20
  )
  select
    r.rank,
    r.display_name,
    r.total_points,
    r.raffle_entries,
    (r.user_id = auth.uid()) as is_current_user
  from ranked r;
$$;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  
  -- También crear day_progress para los 4 días, día 1 desbloqueado
  INSERT INTO public.day_progress (user_id, day_number, is_unlocked, is_completed)
  VALUES 
    (NEW.id, 1, true,  false),
    (NEW.id, 2, false, false),
    (NEW.id, 3, false, false),
    (NEW.id, 4, false, false)
  ON CONFLICT (user_id, day_number) DO NOTHING;
  
  RETURN NEW;
END;
$$;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  );
$$;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

--
-- Name: admin_toggles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_toggles (
    day_number integer NOT NULL,
    is_globally_unlocked boolean DEFAULT false NOT NULL,
    unlocked_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_unlock_at timestamp with time zone,
    CONSTRAINT admin_toggles_day_number_check CHECK (((day_number >= 1) AND (day_number <= 4)))
);

--
-- Name: COLUMN admin_toggles.scheduled_unlock_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_toggles.scheduled_unlock_at IS 'Optional future timestamp when this day will be auto-unlocked. Shown as a live countdown in the dashboard.';

--
-- Name: ai_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_rate_limits (
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    called_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: capability_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capability_statements (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    statement_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    pdf_storage_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: company_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_profiles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    year_founded integer,
    employee_count integer,
    niche text,
    problem_solved text,
    target_avatar text,
    previous_acquisition_methods text,
    primary_naics text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: day_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.day_progress (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    day_number integer NOT NULL,
    is_unlocked boolean DEFAULT false NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT day_progress_day_number_check CHECK (((day_number >= 1) AND (day_number <= 4)))
);

--
-- Name: naics_expansions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.naics_expansions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    primary_naics text NOT NULL,
    related_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
    keywords_input text[] DEFAULT '{}'::text[] NOT NULL,
    keywords_expanded text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: sorteo_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sorteo_submissions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    all_deliverables_uploaded boolean DEFAULT false NOT NULL,
    submitted_at timestamp with time zone,
    eligible boolean DEFAULT false NOT NULL,
    storage_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: user_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_events (
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    hotmart_transaction_id text,
    access_starts_at timestamp with time zone,
    access_expires_at timestamp with time zone,
    is_admin boolean DEFAULT false NOT NULL,
    total_points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_time_xp_at timestamp with time zone,
    last_avatar_xp_at timestamp with time zone,
    has_seen_onboarding boolean DEFAULT false NOT NULL,
    heartbeat_count_today integer DEFAULT 0 NOT NULL,
    heartbeat_count_day date
);

--
-- Name: video_capsule_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_capsule_completions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    capsule_id text NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    points_earned integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: video_capsules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_capsules (
    id text NOT NULL,
    day_number integer NOT NULL,
    title text NOT NULL,
    description text,
    youtube_url text DEFAULT ''::text NOT NULL,
    points_reward integer DEFAULT 10 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT video_capsules_day_number_check CHECK (((day_number >= 1) AND (day_number <= 4)))
);

--
-- Name: web_previews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.web_previews (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    generated_html text,
    generated_css text,
    portal_list_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: admin_toggles admin_toggles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_toggles
    ADD CONSTRAINT admin_toggles_pkey PRIMARY KEY (day_number);

--
-- Name: ai_rate_limits ai_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_rate_limits
    ADD CONSTRAINT ai_rate_limits_pkey PRIMARY KEY (user_id, endpoint, called_at);

--
-- Name: capability_statements capability_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capability_statements
    ADD CONSTRAINT capability_statements_pkey PRIMARY KEY (id);

--
-- Name: capability_statements capability_statements_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capability_statements
    ADD CONSTRAINT capability_statements_user_id_key UNIQUE (user_id);

--
-- Name: company_profiles company_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_pkey PRIMARY KEY (id);

--
-- Name: company_profiles company_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_user_id_key UNIQUE (user_id);

--
-- Name: day_progress day_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_progress
    ADD CONSTRAINT day_progress_pkey PRIMARY KEY (id);

--
-- Name: day_progress day_progress_user_day_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_progress
    ADD CONSTRAINT day_progress_user_day_unique UNIQUE (user_id, day_number);

--
-- Name: day_progress day_progress_user_id_day_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_progress
    ADD CONSTRAINT day_progress_user_id_day_number_key UNIQUE (user_id, day_number);

--
-- Name: naics_expansions naics_expansions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naics_expansions
    ADD CONSTRAINT naics_expansions_pkey PRIMARY KEY (id);

--
-- Name: naics_expansions naics_expansions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naics_expansions
    ADD CONSTRAINT naics_expansions_user_id_key UNIQUE (user_id);

--
-- Name: sorteo_submissions sorteo_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sorteo_submissions
    ADD CONSTRAINT sorteo_submissions_pkey PRIMARY KEY (id);

--
-- Name: sorteo_submissions sorteo_submissions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sorteo_submissions
    ADD CONSTRAINT sorteo_submissions_user_id_key UNIQUE (user_id);

--
-- Name: user_events user_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_events
    ADD CONSTRAINT user_events_pkey PRIMARY KEY (user_id, event_type);

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Name: users users_hotmart_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_hotmart_transaction_id_key UNIQUE (hotmart_transaction_id);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: video_capsule_completions video_capsule_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_capsule_completions
    ADD CONSTRAINT video_capsule_completions_pkey PRIMARY KEY (id);

--
-- Name: video_capsule_completions video_capsule_completions_user_id_capsule_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_capsule_completions
    ADD CONSTRAINT video_capsule_completions_user_id_capsule_id_key UNIQUE (user_id, capsule_id);

--
-- Name: video_capsules video_capsules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_capsules
    ADD CONSTRAINT video_capsules_pkey PRIMARY KEY (id);

--
-- Name: web_previews web_previews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_previews
    ADD CONSTRAINT web_previews_pkey PRIMARY KEY (id);

--
-- Name: web_previews web_previews_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_previews
    ADD CONSTRAINT web_previews_user_id_key UNIQUE (user_id);

--
-- Name: idx_ai_rate_limits_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_rate_limits_lookup ON public.ai_rate_limits USING btree (user_id, endpoint, called_at DESC);

--
-- Name: vcc_capsule_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vcc_capsule_idx ON public.video_capsule_completions USING btree (capsule_id);

--
-- Name: vcc_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vcc_user_idx ON public.video_capsule_completions USING btree (user_id);

--
-- Name: admin_toggles admin_toggles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admin_toggles_updated_at BEFORE UPDATE ON public.admin_toggles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: capability_statements capability_statements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER capability_statements_updated_at BEFORE UPDATE ON public.capability_statements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: company_profiles company_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER company_profiles_updated_at BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: day_progress day_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER day_progress_updated_at BEFORE UPDATE ON public.day_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: naics_expansions naics_expansions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER naics_expansions_updated_at BEFORE UPDATE ON public.naics_expansions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: sorteo_submissions sorteo_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sorteo_submissions_updated_at BEFORE UPDATE ON public.sorteo_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: web_previews web_previews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER web_previews_updated_at BEFORE UPDATE ON public.web_previews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: ai_rate_limits ai_rate_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_rate_limits
    ADD CONSTRAINT ai_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: capability_statements capability_statements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capability_statements
    ADD CONSTRAINT capability_statements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: company_profiles company_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: day_progress day_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_progress
    ADD CONSTRAINT day_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: naics_expansions naics_expansions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.naics_expansions
    ADD CONSTRAINT naics_expansions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: sorteo_submissions sorteo_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sorteo_submissions
    ADD CONSTRAINT sorteo_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_events user_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_events
    ADD CONSTRAINT user_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: video_capsule_completions vcc_capsule_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_capsule_completions
    ADD CONSTRAINT vcc_capsule_fk FOREIGN KEY (capsule_id) REFERENCES public.video_capsules(id) ON DELETE CASCADE;

--
-- Name: video_capsule_completions video_capsule_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_capsule_completions
    ADD CONSTRAINT video_capsule_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: web_previews web_previews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_previews
    ADD CONSTRAINT web_previews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: admin_toggles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_toggles ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_toggles admin_toggles: anyone reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin_toggles: anyone reads" ON public.admin_toggles FOR SELECT USING (true);

--
-- Name: admin_toggles admin_toggles: only admin writes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin_toggles: only admin writes" ON public.admin_toggles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: ai_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: capability_statements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capability_statements ENABLE ROW LEVEL SECURITY;

--
-- Name: capability_statements capability_statements: admin select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "capability_statements: admin select" ON public.capability_statements FOR SELECT USING (public.is_admin());

--
-- Name: capability_statements capability_statements: own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "capability_statements: own" ON public.capability_statements USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

--
-- Name: company_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: company_profiles company_profiles: admin select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company_profiles: admin select" ON public.company_profiles FOR SELECT USING (public.is_admin());

--
-- Name: company_profiles company_profiles: own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company_profiles: own" ON public.company_profiles USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

--
-- Name: day_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.day_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: day_progress day_progress: admin select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "day_progress: admin select" ON public.day_progress FOR SELECT USING (public.is_admin());

--
-- Name: day_progress day_progress: admin update unlock; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "day_progress: admin update unlock" ON public.day_progress FOR UPDATE USING (public.is_admin());

--
-- Name: day_progress day_progress: own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "day_progress: own" ON public.day_progress USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

--
-- Name: naics_expansions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.naics_expansions ENABLE ROW LEVEL SECURITY;

--
-- Name: naics_expansions naics_expansions: admin select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "naics_expansions: admin select" ON public.naics_expansions FOR SELECT USING (public.is_admin());

--
-- Name: naics_expansions naics_expansions: own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "naics_expansions: own" ON public.naics_expansions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

--
-- Name: sorteo_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sorteo_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: sorteo_submissions sorteo_submissions: admin select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sorteo_submissions: admin select" ON public.sorteo_submissions FOR SELECT USING (public.is_admin());

--
-- Name: sorteo_submissions sorteo_submissions: own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sorteo_submissions: own" ON public.sorteo_submissions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

--
-- Name: user_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: user_events users can read own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can read own events" ON public.user_events FOR SELECT USING ((auth.uid() = user_id));

--
-- Name: users users: admin select all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users: admin select all" ON public.users FOR SELECT USING (public.is_admin());

--
-- Name: users users: select own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users: select own" ON public.users FOR SELECT USING ((auth.uid() = id));

--
-- Name: users users: service role insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users: service role insert" ON public.users FOR INSERT WITH CHECK (true);

--
-- Name: users users: update own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users: update own" ON public.users FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

--
-- Name: video_capsule_completions vcc_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vcc_own_insert ON public.video_capsule_completions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

--
-- Name: video_capsule_completions vcc_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vcc_own_select ON public.video_capsule_completions FOR SELECT TO authenticated USING ((auth.uid() = user_id));

--
-- Name: video_capsule_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_capsule_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: video_capsule_completions video_capsule_completions: admin select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "video_capsule_completions: admin select" ON public.video_capsule_completions FOR SELECT USING (public.is_admin());

--
-- Name: video_capsules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_capsules ENABLE ROW LEVEL SECURITY;

--
-- Name: video_capsules video_capsules_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY video_capsules_read ON public.video_capsules FOR SELECT TO authenticated USING (true);

--
-- Name: web_previews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.web_previews ENABLE ROW LEVEL SECURITY;

--
-- Name: web_previews web_previews: admin select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "web_previews: admin select" ON public.web_previews FOR SELECT USING (public.is_admin());

--
-- Name: web_previews web_previews: own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "web_previews: own" ON public.web_previews USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

--
-- Name: FUNCTION admin_uncomplete_day(p_user_id uuid, p_day integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_uncomplete_day(p_user_id uuid, p_day integer) TO anon;
GRANT ALL ON FUNCTION public.admin_uncomplete_day(p_user_id uuid, p_day integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_uncomplete_day(p_user_id uuid, p_day integer) TO service_role;

--
-- Name: FUNCTION check_ai_rate_limit(p_user_id uuid, p_endpoint text, p_max_calls integer, p_window_seconds integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_ai_rate_limit(p_user_id uuid, p_endpoint text, p_max_calls integer, p_window_seconds integer) TO anon;
GRANT ALL ON FUNCTION public.check_ai_rate_limit(p_user_id uuid, p_endpoint text, p_max_calls integer, p_window_seconds integer) TO authenticated;
GRANT ALL ON FUNCTION public.check_ai_rate_limit(p_user_id uuid, p_endpoint text, p_max_calls integer, p_window_seconds integer) TO service_role;

--
-- Name: FUNCTION get_day_completion_counts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_day_completion_counts() TO anon;
GRANT ALL ON FUNCTION public.get_day_completion_counts() TO authenticated;
GRANT ALL ON FUNCTION public.get_day_completion_counts() TO service_role;

--
-- Name: FUNCTION get_leaderboard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_leaderboard() TO anon;
GRANT ALL ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT ALL ON FUNCTION public.get_leaderboard() TO service_role;

--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;

--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

--
-- Name: TABLE admin_toggles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_toggles TO service_role;
GRANT SELECT,UPDATE ON TABLE public.admin_toggles TO authenticated;
GRANT SELECT ON TABLE public.admin_toggles TO anon;

--
-- Name: TABLE ai_rate_limits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_rate_limits TO anon;
GRANT ALL ON TABLE public.ai_rate_limits TO authenticated;
GRANT ALL ON TABLE public.ai_rate_limits TO service_role;

--
-- Name: TABLE capability_statements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.capability_statements TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.capability_statements TO authenticated;

--
-- Name: TABLE company_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.company_profiles TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.company_profiles TO authenticated;

--
-- Name: TABLE day_progress; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.day_progress TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.day_progress TO authenticated;

--
-- Name: TABLE naics_expansions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.naics_expansions TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.naics_expansions TO authenticated;

--
-- Name: TABLE sorteo_submissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sorteo_submissions TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.sorteo_submissions TO authenticated;

--
-- Name: TABLE user_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_events TO anon;
GRANT ALL ON TABLE public.user_events TO authenticated;
GRANT ALL ON TABLE public.user_events TO service_role;

--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO service_role;
GRANT SELECT ON TABLE public.users TO authenticated;

--
-- Name: COLUMN users.total_points; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(total_points) ON TABLE public.users TO authenticated;

--
-- Name: COLUMN users.last_time_xp_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(last_time_xp_at) ON TABLE public.users TO authenticated;

--
-- Name: COLUMN users.last_avatar_xp_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(last_avatar_xp_at) ON TABLE public.users TO authenticated;

--
-- Name: COLUMN users.has_seen_onboarding; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(has_seen_onboarding) ON TABLE public.users TO authenticated;

--
-- Name: TABLE video_capsule_completions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.video_capsule_completions TO service_role;
GRANT SELECT,INSERT ON TABLE public.video_capsule_completions TO authenticated;

--
-- Name: TABLE video_capsules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.video_capsules TO anon;
GRANT ALL ON TABLE public.video_capsules TO authenticated;
GRANT ALL ON TABLE public.video_capsules TO service_role;

--
-- Name: TABLE web_previews; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.web_previews TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.web_previews TO authenticated;














