-- 004_social_proof_rpc.sql
-- Public aggregate function for the social proof widget.
-- Returns completion counts per day without exposing individual user rows.

create or replace function public.get_day_completion_counts()
returns table (
  day_number       int,
  completed_today  bigint,
  completed_total  bigint
)
language sql
security definer
stable
as $$
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

-- Allow anon and authenticated users to call the function
grant execute on function public.get_day_completion_counts() to anon, authenticated;
