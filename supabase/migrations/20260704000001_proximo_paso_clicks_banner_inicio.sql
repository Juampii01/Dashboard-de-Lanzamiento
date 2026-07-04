-- Agrega "banner_inicio" como valor válido de proximo_paso_clicks.button —
-- tracking del click en el banner de la mentoría "Tu Primer Contrato" que
-- se muestra en Inicio (reemplaza al viejo aviso de "completá el día
-- pendiente"). No es un botón nuevo tipo distinto de dato, solo se suma al
-- mismo check existente para reusar la tabla y el panel admin ya construidos.
alter table public.proximo_paso_clicks
  drop constraint if exists proximo_paso_clicks_button_check;

alter table public.proximo_paso_clicks
  add constraint proximo_paso_clicks_button_check
  check (button in ('pagar_ahora', 'whatsapp', 'banner_inicio'));
