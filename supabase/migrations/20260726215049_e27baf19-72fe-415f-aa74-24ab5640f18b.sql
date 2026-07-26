create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid()
$$;

grant execute on function public.current_team_id() to authenticated, service_role;

drop policy if exists "profiles: team leader reads own team" on public.profiles;

create policy "profiles: team leader reads own team"
on public.profiles
for select
to authenticated
using (
  public.has_role(auth.uid(), 'team_leader'::app_role)
  and team_id is not null
  and team_id = public.current_team_id()
);