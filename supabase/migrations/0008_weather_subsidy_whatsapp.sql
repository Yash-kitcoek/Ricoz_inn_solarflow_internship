alter table projects add column latitude numeric check(latitude between -90 and 90), add column longitude numeric check(longitude between -180 and 180);
-- WhatsApp number in digits only with country code, e.g. 919876543210
alter table profiles add column phone text unique check(phone ~ '^[0-9]{8,15}$');
create table subsidy_checks(project_id uuid not null references projects on delete cascade, item_key text not null, done boolean not null default false,
  updated_by uuid default auth.uid(), updated_at timestamptz not null default now(), primary key(project_id,item_key));
alter table subsidy_checks enable row level security;
create policy sc_sel on subsidy_checks for select using(can_access_project(project_id));
create policy sc_ins on subsidy_checks for insert with check(has_role('admin','project_manager','engineer') and can_access_project(project_id));
create policy sc_upd on subsidy_checks for update using(has_role('admin','project_manager','engineer') and can_access_project(project_id));
