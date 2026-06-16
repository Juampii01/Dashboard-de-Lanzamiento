\set ON_ERROR_STOP on
BEGIN;

-- Replace dummy quiz questions with real content (Days 1–3).
-- Day 3 cap2 (Sandy Tavares) and Day 4 have no content yet — left untouched.
-- Depends on: 20260602000000 (question_order column + multi-question support).

DELETE FROM public.video_quizzes
WHERE capsule_id IN ('day1-cap1', 'day1-cap2', 'day2-cap1', 'day2-cap2', 'day3-cap1');

-- ── DÍA 1, cap1 — Podcast: Nayo Escobar ──────────────────────────────────────
INSERT INTO public.video_quizzes (capsule_id, question, options, correct_option_index, xp_reward, question_order)
VALUES
  ('day1-cap1',
   '¿En qué país ganó Santo su primer contrato gubernamental en 2007?',
   '["República Dominicana","Venezuela","México"]',
   0, 10, 1),

  ('day1-cap1',
   '¿Qué le vendió Santo al gobierno en ese primer contrato?',
   '["Ropa","Comida","Computadoras"]',
   2, 10, 2),

  ('day1-cap1',
   '¿Por qué quebró la primera empresa de Santo?',
   '["Despidió a su mejor empleado","Cometió un error empresarial","Trataba mal a sus clientes"]',
   1, 10, 3),

  ('day1-cap1',
   '¿Por no tener qué institución quebró Santo su primera empresa?',
   '["Cartera","Presupuesto","Sistema de compras"]',
   0, 10, 4),

  ('day1-cap1',
   '¿Cuánto tiempo tardó el gobierno dominicano en pagarle a la empresa de Santo?',
   '["2 años","4 años","30 días"]',
   1, 10, 5);

-- ── DÍA 1, cap2 — Caso de éxito: Mirna Pro Cleaning ─────────────────────────
INSERT INTO public.video_quizzes (capsule_id, question, options, correct_option_index, xp_reward, question_order)
VALUES
  ('day1-cap2',
   '¿Quién era el cliente principal de la empresa de limpieza de Mirna en 2022?',
   '["Los casinos","El gobierno","Los hospitales"]',
   0, 10, 1),

  ('day1-cap2',
   '¿Cuántos empleados tenía Mirna cuando facturó 6.5 millones de dólares?',
   '["10 empleados","15 empleados","260 empleados"]',
   2, 10, 2),

  ('day1-cap2',
   'Después de perder su único cliente, ¿qué le cambió la vida a Mirna?',
   '["La mentoría Tu Primer Contrato","Una sesión con su psicólogo","Su perro Rocky"]',
   0, 10, 3),

  ('day1-cap2',
   'Después de preparar correctamente su empresa, ¿cuántos contratos ganó Mirna Pro Cleaning?',
   '["1 contrato","2 contratos","5 contratos"]',
   1, 10, 4),

  ('day1-cap2',
   '¿Cuánto suman los dos contratos ganados por Mirna Pro Cleaning?',
   '["$500,000","$1,071,085","$1,500,000"]',
   1, 10, 5);

-- ── DÍA 2, cap1 — Podcast: Serratos ─────────────────────────────────────────
INSERT INTO public.video_quizzes (capsule_id, question, options, correct_option_index, xp_reward, question_order)
VALUES
  ('day2-cap1',
   'Para ganar un contrato con el gobierno, ¿necesitas ser el más barato?',
   '["Sí","No","No necesariamente"]',
   2, 10, 1),

  ('day2-cap1',
   '¿Puede una persona que viva fuera de EE.UU. ganar contratos gubernamentales en USA?',
   '["Sí","No","Debe tener conocidos en el gobierno"]',
   0, 10, 2),

  ('day2-cap1',
   '¿Por qué se dañó el crédito de Santo en República Dominicana?',
   '["Pocos clientes","Falta de mercancía en su negocio","El gobierno no le pagó a tiempo"]',
   2, 10, 3),

  ('day2-cap1',
   '¿Puede una persona sin documentos (Social Security o Green Card) licitar en Estados Unidos?',
   '["Sí","No","Debe asociarse con alguien que tenga documentos"]',
   0, 10, 4),

  ('day2-cap1',
   '¿En qué trabajó Santo cuando se mudó a New Jersey en 2013?',
   '["Construcción","Walmart","Restaurante"]',
   0, 10, 5);

-- ── DÍA 2, cap2 — Caso de éxito: Eriafna ────────────────────────────────────
INSERT INTO public.video_quizzes (capsule_id, question, options, correct_option_index, xp_reward, question_order)
VALUES
  ('day2-cap2',
   '¿En qué país vivía Eriafna cuando creó su empresa en EE.UU.?',
   '["Canadá","República Dominicana","México"]',
   1, 10, 1),

  ('day2-cap2',
   '¿Cuántas empresas tiene Eriafna creadas en EE.UU.?',
   '["5","3","1"]',
   1, 10, 2),

  ('day2-cap2',
   '¿Cuál fue el contrato que ganó Eriafna fuera de EE.UU.?',
   '["Servicio de construcción","Productos de oficina","Servicio de internet"]',
   1, 10, 3);

-- ── DÍA 3, cap1 — Podcast: Vladimir Jaquez ───────────────────────────────────
INSERT INTO public.video_quizzes (capsule_id, question, options, correct_option_index, xp_reward, question_order)
VALUES
  ('day3-cap1',
   '¿En qué año ganó Santo su primer contrato con el gobierno de Estados Unidos?',
   '["2013","2015","2017"]',
   1, 10, 1),

  ('day3-cap1',
   '¿Qué le vendió Santo al gobierno en ese primer contrato?',
   '["Computadoras","Mobiliario","Productos de oficina"]',
   2, 10, 2),

  ('day3-cap1',
   '¿Por quién se hizo pasar Santo para ocultar que no hablaba inglés?',
   '["Por el security de la empresa","Por el dueño de la empresa","Por un vendedor externo"]',
   0, 10, 3),

  ('day3-cap1',
   '¿De qué monto fue el primer pedido que recibió Santo?',
   '["$500","$1,451","$5,000"]',
   1, 10, 4),

  ('day3-cap1',
   '¿Cuánto ganaba Santo al día trabajando en construcción?',
   '["$50","$100","$150"]',
   1, 10, 5),

  ('day3-cap1',
   'En el contrato de Office Supplies que Santo ganó en 2015, ¿cuánto le adjudicaron a la otra empresa seleccionada?',
   '["$500,000","$1,000,000","$1,500,000"]',
   2, 10, 6);

-- ── Verificación ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.video_quizzes
  WHERE capsule_id IN ('day1-cap1','day1-cap2','day2-cap1','day2-cap2','day3-cap1');

  IF v_count != 24 THEN
    RAISE EXCEPTION 'Expected 24 quiz questions (5+5+5+3+6), got %.', v_count;
  END IF;

  RAISE NOTICE 'Migration 20260602000002 verified OK: % questions inserted.', v_count;
END $$;

COMMIT;
