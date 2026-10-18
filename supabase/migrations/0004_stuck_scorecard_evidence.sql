-- Net-metering stage history (feeds "why is it stuck" and the authority scorecard)
alter table net_metering_applications add column status_changed_at timestamptz not null default now();
create table net_metering_events(id uuid primary key default gen_random_uuid(), application_id uuid not null references net_metering_applications on delete cascade,
  project_id uuid not null references projects on delete cascade, from_status text, to_status text not null, changed_at timestamptz not null default now(), changed_by uuid default auth.uid());
create index on net_metering_events(application_id, changed_at);
alter table net_metering_events enable row level security;
create policy nme_sel on net_metering_events for select using(can_access_project(project_id));
create function nm_touch() returns trigger language plpgsql as $$ begin
  if tg_op='INSERT' or new.status is distinct from old.status then new.status_changed_at:=now(); end if; return new; end $$;
create trigger nm_touch_t before insert or update on net_metering_applications for each row execute function nm_touch();
create function nm_log() returns trigger language plpgsql security definer set search_path=public as $$ begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into net_metering_events(application_id,project_id,from_status,to_status,changed_by) values(new.id,new.project_id,case when tg_op='UPDATE' then old.status end,new.status,auth.uid()); end if; return null; end $$;
create trigger nm_log_t after insert or update on net_metering_applications for each row execute function nm_log();
-- Evidence-gated milestone payouts
alter table payment_milestones add column required_evidence text[] not null default '{panels,inverter,earthing,meter}';
create table milestone_evidence(id uuid primary key default gen_random_uuid(), milestone_id uuid not null references payment_milestones on delete cascade,
  kind text not null check(kind in('panels','inverter','earthing','meter','other')), storage_path text not null, taken_at timestamptz not null default now(),
  lat numeric check(lat between -90 and 90), lng numeric check(lng between -180 and 180), uploaded_by uuid default auth.uid(), created_at timestamptz default now());
create index on milestone_evidence(milestone_id);
alter table milestone_evidence enable row level security;
create policy me_sel on milestone_evidence for select using(exists(select 1 from payment_milestones m where m.id=milestone_id));
create policy me_ins on milestone_evidence for insert with check(uploaded_by=auth.uid() and exists(select 1 from payment_milestones m where m.id=milestone_id and (m.contractor_id=my_contractor() or has_role('admin','project_manager'))));
-- A milestone cannot go to verification until every required kind has a photo that carries a location
create function evidence_gate() returns trigger language plpgsql security definer set search_path=public as $$
declare k text; begin
  if new.status='pending_verification' and old.status is distinct from 'pending_verification' then
    foreach k in array new.required_evidence loop
      if not exists(select 1 from milestone_evidence e where e.milestone_id=new.id and e.kind=k and e.lat is not null and e.lng is not null) then
        raise exception 'Missing evidence with location: %',k; end if; end loop; end if; return new; end $$;
create trigger milestone_evidence_gate before update of status on payment_milestones for each row execute function evidence_gate();
