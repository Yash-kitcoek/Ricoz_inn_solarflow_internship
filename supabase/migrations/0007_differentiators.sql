-- Customer status link, warranty fields, generation readings, tamper-evident audit chain
alter table projects add column share_token text unique, add column commissioned_on date,
  add column warranty_panel_years int check(warranty_panel_years between 0 and 50), add column warranty_inverter_years int check(warranty_inverter_years between 0 and 50);
create function public_project_status(t text) returns table(project_name text, status text, progress int, nm_status text, nm_waiting_days int, updated_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.name, p.status, p.progress, a.status, extract(day from now()-a.status_changed_at)::int, p.updated_at
  from projects p left join lateral (select status,status_changed_at from net_metering_applications where project_id=p.id order by created_at desc limit 1) a on true
  where t is not null and p.share_token=t and not p.archived $$;
grant execute on function public_project_status(text) to anon, authenticated;
-- Runs as the caller, so row level security decides who may enable or rotate a link
create function set_share_token(pid uuid, enable boolean) returns text language plpgsql set search_path=public, extensions as $$
declare t text; begin t:=case when enable then encode(gen_random_bytes(18),'hex') end; update projects set share_token=t where id=pid;
  if not found then raise exception 'Not allowed, or project not found'; end if; return t; end $$;
create table generation_readings(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade, month date not null, kwh numeric not null check(kwh>=0), unique(project_id,month));
alter table generation_readings enable row level security;
create policy gr_sel on generation_readings for select using(can_access_project(project_id));
create policy gr_ins on generation_readings for insert with check(has_role('admin','project_manager','engineer') and can_access_project(project_id));
create policy gr_upd on generation_readings for update using(has_role('admin','project_manager','engineer') and can_access_project(project_id));
-- Hash chain: each log row stores a hash of its content plus the previous row's hash (per project)
alter table activity_logs add column seq bigint generated always as identity, add column prev_hash text, add column hash text;
create function audit_digest(prev text, r activity_logs) returns text language sql immutable set search_path=public, extensions as $$
  select encode(digest(prev||'|'||coalesce(r.project_id::text,'')||'|'||coalesce(r.actor_id::text,'')||'|'||r.action||'|'||r.entity||'|'||coalesce(r.entity_id::text,'')||'|'||coalesce(r.detail::text,'')||'|'||extract(epoch from r.created_at)::text,'sha256'),'hex') $$;
create function chain_activity() returns trigger language plpgsql security definer set search_path=public, extensions as $$
declare prev text; begin
  perform pg_advisory_xact_lock(hashtext(coalesce(new.project_id::text,'none')));
  select hash into prev from activity_logs where project_id is not distinct from new.project_id and hash is not null order by seq desc limit 1;
  new.prev_hash:=coalesce(prev,'genesis'); new.hash:=audit_digest(new.prev_hash,new); return new; end $$;
create trigger activity_chain before insert on activity_logs for each row execute function chain_activity();
create function verify_audit_chain(pid uuid) returns table(ok boolean, entries int, broken_seq bigint) language plpgsql stable security definer set search_path=public, extensions as $$
declare r activity_logs; prev text:='genesis'; n int:=0; begin
  if not can_access_project(pid) then raise exception 'Not allowed'; end if;
  for r in select * from activity_logs where project_id=pid and hash is not null order by seq loop
    n:=n+1; if r.prev_hash<>prev or r.hash<>audit_digest(prev,r) then return query select false,n,r.seq; return; end if; prev:=r.hash; end loop;
  return query select true,n,null::bigint; end $$;
