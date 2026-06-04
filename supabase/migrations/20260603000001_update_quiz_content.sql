-- Replace all quiz questions with updated content (v2 — June 2026).
-- Each day has 2 missions: podcast (video_type='podcast') and video case study.
-- XP reward: 5 pts per question.
-- Capsules are referenced by day_number + video_type; no hardcoded UUIDs.

BEGIN;

-- ── Wipe existing questions for days 1–4 ──────────────────────────────────
DELETE FROM video_quizzes
WHERE capsule_id IN (
  SELECT id FROM video_capsules WHERE day_number BETWEEN 1 AND 4
);

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 1 — MISIÓN 1 · Podcast: Nayo Escobar
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 1 AND video_type = 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     '¿En qué país ganó Santo su primer contrato gubernamental en 2007?',
     '["República Dominicana", "Venezuela", "México"]',
     0, 5, 1),
    (cap,
     '¿Qué le vendió Santo al gobierno en ese primer contrato?',
     '["Ropa", "Comida", "Computadoras"]',
     2, 5, 2),
    (cap,
     '¿Por qué quebró la primera empresa de Santo?',
     '["Despidió a su mejor empleado", "Cometió un error empresarial", "Trataba mal a sus clientes"]',
     1, 5, 3),
    (cap,
     '¿Santo quebró su primera empresa por una institución que no tenía?',
     '["Cartera", "Presupuesto", "Sistema de compras"]',
     0, 5, 4),
    (cap,
     '¿Cuánto tiempo tardó el gobierno dominicano en pagarle a la empresa de Santo?',
     '["2 años", "4 años", "30 días"]',
     1, 5, 5);
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 1 — MISIÓN 2 · Video: Mirna - Caso de Éxito
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 1 AND video_type != 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     '¿Quién era el cliente principal de la empresa de limpieza de Mirna en 2022?',
     '["Los casinos", "El gobierno", "Los hospitales"]',
     0, 5, 1),
    (cap,
     '¿Cuántos empleados tenía Mirna cuando facturó 6.5 millones de dólares?',
     '["10 empleados", "15 empleados", "260 empleados"]',
     2, 5, 2),
    (cap,
     'Después de que Mirna cayó en depresión por haber perdido su único cliente, ¿qué le cambió la vida?',
     '["La mentoría Tu Primer Contrato", "Una sesión con su psicólogo", "Su perro Rocky"]',
     0, 5, 3),
    (cap,
     'Después de preparar correctamente su empresa, ¿cuántos contratos ganó Mirna Pro Cleaning?',
     '["1 contrato", "2 contratos", "5 contratos"]',
     1, 5, 4),
    (cap,
     '¿Cuánto suman los dos contratos ganados por Mirna Pro Cleaning?',
     '["$500,000", "$1,071,085", "$1,500,000"]',
     1, 5, 5),
    (cap,
     '¿Qué motivó a la empresaria a agendar la llamada?',
     '["Quería abrir una empresa nueva desde cero", "Su hermana mayor la refirió a la llamada", "Quería vender productos por internet"]',
     1, 5, 6),
    (cap,
     '¿Cuál era la situación de su compañía al momento de la llamada?',
     '["Estaba inactiva desde hacía aproximadamente 2 meses", "Estaba contratando más empleados", "Acababa de renovar todos sus contratos"]',
     0, 5, 7);
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 2 — MISIÓN 1 · Podcast: Sinergéticos
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 2 AND video_type = 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     'Para ganar un contrato con el gobierno, ¿necesitas ser el más barato?',
     '["Sí", "No", "No necesariamente"]',
     2, 5, 1),
    (cap,
     '¿Puede una persona que viva fuera de Estados Unidos ganar contratos gubernamentales en USA?',
     '["Sí", "No", "Debe tener conocidos en el gobierno"]',
     0, 5, 2),
    (cap,
     '¿Por qué se dañó el crédito de Santo en República Dominicana?',
     '["Pocos clientes", "Falta de mercancía en su negocio", "El gobierno no le pagó a tiempo"]',
     2, 5, 3),
    (cap,
     '¿Puede una persona sin documentos (Social Security o Green Card) licitar en Estados Unidos?',
     '["Sí", "No", "Debe asociarse con alguien que tenga documentos"]',
     0, 5, 4),
    (cap,
     '¿En qué trabajó Santo cuando se mudó a New Jersey en 2013?',
     '["Construcción", "Walmart", "Restaurante"]',
     0, 5, 5);
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 2 — MISIÓN 2 · Video: Eriafna - Caso de Éxito
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 2 AND video_type != 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     '¿Desde qué país Eriafna creó su empresa en Estados Unidos?',
     '["Canadá", "República Dominicana", "México"]',
     1, 5, 1),
    (cap,
     '¿Cuántas empresas tiene Eriafna creadas en EE.UU?',
     '["5", "3", "1"]',
     1, 5, 2),
    (cap,
     '¿Cuál fue el contrato que ganó Eriafna fuera de EE.UU?',
     '["Servicio de construcción", "Productos de oficina", "Servicio de internet"]',
     1, 5, 3);
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 3 — MISIÓN 1 · Podcast: Vladimir Jaquez
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 3 AND video_type = 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     '¿En qué año ganó Santo su primer contrato con el gobierno de Estados Unidos?',
     '["2013", "2015", "2017"]',
     1, 5, 1),
    (cap,
     '¿Qué le vendió Santo al gobierno en ese primer contrato en USA?',
     '["Computadoras", "Mobiliario", "Productos de oficina"]',
     2, 5, 2),
    (cap,
     '¿Por quién se hizo pasar Santo para ocultar que no hablaba inglés?',
     '["Por el security de la empresa", "Por el dueño de la empresa", "Por un vendedor externo"]',
     0, 5, 3),
    (cap,
     '¿De qué monto fue el primer pedido que recibió Santo?',
     '["$500", "$1,451", "$5,000"]',
     1, 5, 4),
    (cap,
     '¿Cuánto ganaba Santo al día trabajando en construcción?',
     '["$50", "$100", "$150"]',
     1, 5, 5),
    (cap,
     'En el contrato de productos de oficina que Santo ganó en 2015, ¿cuál fue el monto adjudicado a la otra empresa seleccionada?',
     '["$500,000", "$1,000,000", "$1,500,000"]',
     2, 5, 6);
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 3 — MISIÓN 2 · Video: Sandy Tavares - Caso de Éxito
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 3 AND video_type != 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     '¿Cuál era el mayor temor de Sandy Tavares?',
     '["Que el gobierno no le pagara", "No tener dinero para despachar", "Recibir una llamada en inglés"]',
     2, 5, 1),
    (cap,
     '¿Cuántos contratos tiene Sandy Tavares?',
     '["1 contrato", "3 contratos", "6 contratos"]',
     2, 5, 2),
    (cap,
     '¿En cuánto tiempo le pagó el gobierno a Sandy Tavares?',
     '["18 días", "30 días", "45 días"]',
     0, 5, 3),
    (cap,
     '¿Cuál fue el mayor desafío o la "piedra en el camino" para Sandy Tavares dentro de la mentoría?',
     '["El idioma", "La falta de contactos en el gobierno", "Los suplidores"]',
     0, 5, 4),
    (cap,
     '¿En qué año ganó Sandy su primer contrato con el gobierno de Estados Unidos?',
     '["2010", "2017", "2025"]',
     2, 5, 5);
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 4 — MISIÓN 1 · Podcast: Diana González
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 4 AND video_type = 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     '¿De cuánto fue el contrato que ganó Naike?',
     '["$50,000", "$225,000", "$500,000"]',
     1, 5, 1),
    (cap,
     '¿En qué estado ganó Naike su primer contrato gubernamental?',
     '["New Jersey", "Florida", "Massachusetts"]',
     0, 5, 2),
    (cap,
     '¿Cuántos años llevaban licitando las personas americanas que Naike vio en la clase, a pesar de tener el idioma a su favor?',
     '["1 año", "2 años", "5 años"]',
     1, 5, 3),
    (cap,
     '¿Qué tipo de empresa creó Yonathan desde cero con la mentoría?',
     '["Una empresa de construcción", "Un restaurante familiar", "Una compañía de transporte local"]',
     0, 5, 4),
    (cap,
     '¿Cómo logró Yonathan ganar un contrato de $500,000 si por cuestión de trabajo no podía entrar a las sesiones de Zoom?',
     '["Esperó a tener más tiempo libre", "Vio las clases grabadas, aplicó el proceso y tomó acción", "Contrató a otra persona para hacerlo todo por él"]',
     1, 5, 5);
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DÍA 4 — MISIÓN 2 · Video: Carlos Suárez - Caso de Éxito
-- ══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE cap text;
BEGIN
  SELECT id INTO cap FROM video_capsules
  WHERE day_number = 4 AND video_type != 'podcast' LIMIT 1;
  IF cap IS NULL THEN RETURN; END IF;

  INSERT INTO video_quizzes
    (capsule_id, question, options, correct_option_index, xp_reward, question_order)
  VALUES
    (cap,
     '¿Cuál es la discapacidad que tiene Carlos Suárez?',
     '["Dificultad para caminar", "Dificultad para hablar y escuchar", "Dificultad para ver"]',
     1, 5, 1),
    (cap,
     '¿Cuál era el deseo de la hija mayor de Carlos Suárez?',
     '["Que le celebraran una fiesta de cumpleaños", "Salir de vacaciones", "Que le compraran un juguete"]',
     0, 5, 2),
    (cap,
     '¿Cuántos contratos tiene Carlos Suárez actualmente?',
     '["2 contratos", "4 contratos", "6 contratos"]',
     1, 5, 3),
    (cap,
     '¿Qué le dijo la niña de 8 años al público?',
     '["Estoy muy feliz y muy contenta porque mi papá ganó un contrato para toda la familia.", "Estoy feliz porque ya me podré comprar todo lo que yo quiera.", "Estoy muy feliz porque ahora sí podré viajar a otro país."]',
     0, 5, 4),
    (cap,
     'Cuando su hija le pidió una gran fiesta de cumpleaños, ¿qué le respondió Carlos Suárez?',
     '["No, porque todavía no estamos ganando dinero.", "El próximo año celebro tu cumpleaños.", "Estoy muy ocupado."]',
     0, 5, 5),
    (cap,
     '¿De cuánto fue el monto del contrato más reciente de Carlos Suárez?',
     '["$26,000", "$86,000", "$126,000"]',
     0, 5, 6);
END $$;

COMMIT;
