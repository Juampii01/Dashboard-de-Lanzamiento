-- Flujo de reclamo de premio + re-sorteo parcial: cada ganador queda
-- "pending_claim" hasta que el admin lo marca como reclamado en vivo. Si al
-- momento de re-sortear hay ganadores sin reclamar, quedan "eliminated"
-- (nunca vuelven a entrar al pool) y se sortean reemplazos SOLO para los
-- lugares que faltan — los que ya reclamaron quedan fijos.
alter table public.sorteo_winners
  add column if not exists status text not null default 'pending_claim'
    check (status in ('pending_claim', 'claimed', 'eliminated')),
  add column if not exists claimed_at timestamptz;
