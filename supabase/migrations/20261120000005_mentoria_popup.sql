-- Ventana a pantalla completa de la mentoría "Tu Primer Contrato" (una sola
-- vez por persona). Respuestas en proximo_paso_clicks:
--   mentoria_visto   se le mostró (se registra al aparecer: nunca se repite)
--   mentoria_pagar   tocó "Pagar ahora"
--   mentoria_hablar  tocó "Quiero hablar con el equipo"
--   mentoria_no      tocó "Ahora no me interesa"
ALTER TABLE public.proximo_paso_clicks DROP CONSTRAINT IF EXISTS proximo_paso_clicks_button_check;
ALTER TABLE public.proximo_paso_clicks ADD CONSTRAINT proximo_paso_clicks_button_check CHECK (button = ANY (ARRAY[
  'pagar_ahora', 'whatsapp', 'banner_inicio', 'quiero_cupo', 'quiero_cupo_visto',
  'mentoria_visto', 'mentoria_pagar', 'mentoria_hablar', 'mentoria_no'
]::text[]));

INSERT INTO public.app_settings (key, value) VALUES ('mentoria_popup_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
