-- Ventana "¡Quiero mi cupo!": se registra en proximo_paso_clicks.
--   quiero_cupo        tocó el botón (abre WhatsApp) → lead para el equipo
--   quiero_cupo_visto  cerró la ventana sin tocar el botón (no vuelve a verla)
alter table public.proximo_paso_clicks drop constraint if exists proximo_paso_clicks_button_check;
alter table public.proximo_paso_clicks
  add constraint proximo_paso_clicks_button_check
  check (button = any (array['pagar_ahora', 'whatsapp', 'banner_inicio', 'quiero_cupo', 'quiero_cupo_visto']));

create index if not exists proximo_paso_clicks_user_button_idx
  on public.proximo_paso_clicks (user_id, button);
