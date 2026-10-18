-- New sign-ups start unapproved and see nothing until an admin approves them.
alter table profiles add column approved boolean not null default false;
update profiles set approved = true;  -- accounts that existed before this migration stay usable
create or replace function app_role() returns text language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() and approved $$;
create or replace function my_contractor() returns uuid language sql stable security definer set search_path=public as $$ select contractor_id from profiles where id=auth.uid() and approved $$;
-- Never leave the system without an approved admin
create function protect_last_admin() returns trigger language plpgsql security definer set search_path=public as $$ begin
  if old.role='admin' and old.approved and (new.role<>'admin' or not new.approved)
     and not exists(select 1 from profiles where role='admin' and approved and id<>old.id) then raise exception 'Cannot remove the last approved admin'; end if; return new; end $$;
create trigger profiles_last_admin before update on profiles for each row execute function protect_last_admin();
-- Contractors have no business reading permit or utility records
drop policy permits_sel on permits; create policy permits_sel on permits for select using(can_access_project(project_id) and not has_role('contractor'));
drop policy permit_checklist_items_sel on permit_checklist_items; create policy permit_checklist_items_sel on permit_checklist_items for select using(can_access_project(project_id) and not has_role('contractor'));
drop policy net_metering_applications_sel on net_metering_applications; create policy net_metering_applications_sel on net_metering_applications for select using(can_access_project(project_id) and not has_role('contractor'));
drop policy nme_sel on net_metering_events; create policy nme_sel on net_metering_events for select using(can_access_project(project_id) and not has_role('contractor'));
-- First admin (run once, with your email):
-- update profiles set role='admin', approved=true where email='you@example.com';
