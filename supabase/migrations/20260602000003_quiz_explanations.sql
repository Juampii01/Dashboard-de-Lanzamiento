BEGIN;

-- Add explanation column to video_quizzes
ALTER TABLE public.video_quizzes
  ADD COLUMN IF NOT EXISTS explanation text;

-- ── DÍA 1 — cap1 (Podcast: Nayo Escobar) ────────────────────────────────────
UPDATE public.video_quizzes SET explanation =
  'Santo inició su carrera de contratos gubernamentales en su país natal antes de llegar a EE.UU. Esto demuestra que el modelo de licitaciones gubernamentales funciona en múltiples países.'
  WHERE capsule_id = 'day1-cap1' AND question_order = 1;

UPDATE public.video_quizzes SET explanation =
  'Las computadoras fueron el primer producto que Santo suministró al gobierno dominicano, abriendo las puertas al mundo de las licitaciones. No necesitas un producto sofisticado para empezar.'
  WHERE capsule_id = 'day1-cap1' AND question_order = 2;

UPDATE public.video_quizzes SET explanation =
  'Santo asume la responsabilidad total de la quiebra y no culpa factores externos. Esa mentalidad de accountability es clave para crecer como empresario y no repetir los mismos errores.'
  WHERE capsule_id = 'day1-cap1' AND question_order = 3;

UPDATE public.video_quizzes SET explanation =
  'Sin cartera (respaldo financiero o línea de crédito), una empresa no puede sobrevivir cuando el gobierno tarda en pagar. Esta es una lección fundamental para todo proveedor gubernamental.'
  WHERE capsule_id = 'day1-cap1' AND question_order = 4;

UPDATE public.video_quizzes SET explanation =
  '4 años de espera sin cartera destruyó la empresa de Santo. Por eso hoy enfatiza la importancia de tener capital de trabajo antes de firmar contratos con el gobierno.'
  WHERE capsule_id = 'day1-cap1' AND question_order = 5;

-- ── DÍA 1 — cap2 (Caso de éxito: Mirna Pro Cleaning) ────────────────────────
UPDATE public.video_quizzes SET explanation =
  'Mirna dependía casi 100% de los casinos de Atlantic City. Cuando esos clientes se fueron, perdió su empresa entera de un día para otro. Nunca pongas todos los huevos en una sola canasta.'
  WHERE capsule_id = 'day1-cap2' AND question_order = 1;

UPDATE public.video_quizzes SET explanation =
  'Con 260 empleados y $6.5M en ventas, Mirna manejaba una empresa de limpieza muy exitosa. Pero al perder sus contratos con los casinos, se quedó sin ingresos de forma repentina.'
  WHERE capsule_id = 'day1-cap2' AND question_order = 2;

UPDATE public.video_quizzes SET explanation =
  'La mentoría de Santo González le dio a Mirna la estrategia y el acompañamiento necesarios para entrar al mercado gubernamental y diversificar sus ingresos de forma sostenible.'
  WHERE capsule_id = 'day1-cap2' AND question_order = 3;

UPDATE public.video_quizzes SET explanation =
  'Dos contratos federales bien estructurados pueden transformar un negocio. Mirna pasó de la depresión y la quiebra a tener contratos estables con el gobierno federal de EE.UU.'
  WHERE capsule_id = 'day1-cap2' AND question_order = 4;

UPDATE public.video_quizzes SET explanation =
  'Más de un millón de dólares en contratos gubernamentales para una empresa de limpieza. Eso es lo que puede lograr un negocio bien preparado cuando entra al mercado federal.'
  WHERE capsule_id = 'day1-cap2' AND question_order = 5;

-- ── DÍA 2 — cap1 (Podcast: Serratos) ────────────────────────────────────────
UPDATE public.video_quizzes SET explanation =
  'El gobierno no solo compra por precio. La calidad, experiencia y capacidad de entrega también cuentan. Serratos ganó contratos sin ser el proveedor más barato del mercado.'
  WHERE capsule_id = 'day2-cap1' AND question_order = 1;

UPDATE public.video_quizzes SET explanation =
  'No necesitas vivir en EE.UU. para participar en licitaciones federales. Eriafna, desde República Dominicana, ganó contratos con el gobierno de EE.UU. La ubicación no es una barrera.'
  WHERE capsule_id = 'day2-cap1' AND question_order = 2;

UPDATE public.video_quizzes SET explanation =
  'El retraso de 4 años en el pago gubernamental dejó a Santo sin flujo de caja para cumplir sus obligaciones financieras, dañando su historial crediticio en República Dominicana.'
  WHERE capsule_id = 'day2-cap1' AND question_order = 3;

UPDATE public.video_quizzes SET explanation =
  'En el mercado federal de EE.UU. no se requiere ciudadanía ni residencia legal para crear una empresa y licitar. Lo que necesitas es una empresa registrada legalmente, nada más.'
  WHERE capsule_id = 'day2-cap1' AND question_order = 4;

UPDATE public.video_quizzes SET explanation =
  'Antes de su primer contrato federal en 2015, Santo ganaba $100 al día en construcción. Dos años después de llegar a EE.UU., transformó su vida gracias al mercado gubernamental.'
  WHERE capsule_id = 'day2-cap1' AND question_order = 5;

-- ── DÍA 2 — cap2 (Caso de éxito: Eriafna) ───────────────────────────────────
UPDATE public.video_quizzes SET explanation =
  'Eriafna creó empresas en EE.UU. viviendo en República Dominicana. La distancia no es un obstáculo: puedes registrar una empresa en EE.UU. y operar desde cualquier lugar del mundo.'
  WHERE capsule_id = 'day2-cap2' AND question_order = 1;

UPDATE public.video_quizzes SET explanation =
  'Tener múltiples empresas en distintas categorías permite diversificar y participar en más licitaciones. Eriafna creó 3 empresas para ampliar su alcance en distintos rubros del mercado federal.'
  WHERE capsule_id = 'day2-cap2' AND question_order = 2;

UPDATE public.video_quizzes SET explanation =
  'Un contrato de productos de oficina con el gobierno de EE.UU., ganado desde República Dominicana. El gobierno federal permite la participación de empresas internacionales en muchas categorías.'
  WHERE capsule_id = 'day2-cap2' AND question_order = 3;

-- ── DÍA 3 — cap1 (Podcast: Vladimir Jaquez) ──────────────────────────────────
UPDATE public.video_quizzes SET explanation =
  'En 2015, dos años después de llegar a EE.UU. trabajando en construcción, Santo ganó su primer contrato federal. La perseverancia y el método correcto hacen posible la transformación.'
  WHERE capsule_id = 'day3-cap1' AND question_order = 1;

UPDATE public.video_quizzes SET explanation =
  'Office Supplies (productos de oficina) fue la categoría de su primer contrato. Es una de las categorías más accesibles para nuevos proveedores que recién entran al mercado federal.'
  WHERE capsule_id = 'day3-cap1' AND question_order = 2;

UPDATE public.video_quizzes SET explanation =
  'Santo se hizo pasar por el guardia de seguridad para poder hacer entregas sin tener que hablar con los funcionarios. El inglés no es una barrera para hacer negocios con el gobierno de EE.UU.'
  WHERE capsule_id = 'day3-cap1' AND question_order = 3;

UPDATE public.video_quizzes SET explanation =
  '$1,451 fue el primer pedido de Santo. Aunque pequeño, fue el punto de partida que demostró que el sistema funciona. Ese mismo método hoy ha generado millones en contratos gubernamentales.'
  WHERE capsule_id = 'day3-cap1' AND question_order = 4;

UPDATE public.video_quizzes SET explanation =
  '$100 al día en construcción versus contratos gubernamentales de miles de dólares. Esta es la transformación real que es posible cuando se aplica el método correcto con disciplina.'
  WHERE capsule_id = 'day3-cap1' AND question_order = 5;

UPDATE public.video_quizzes SET explanation =
  'El mismo contrato donde Santo inició con un pedido de $1,451 le adjudicó $1,500,000 a otra empresa seleccionada simultáneamente. Eso muestra el enorme potencial del mercado federal.'
  WHERE capsule_id = 'day3-cap1' AND question_order = 6;

COMMIT;
