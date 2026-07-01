-- Botones de enlace (hasta 3) para las misiones ráfaga. Cada uno: { label, url }.
alter table rafaga_missions add column if not exists link_buttons jsonb not null default '[]'::jsonb;
