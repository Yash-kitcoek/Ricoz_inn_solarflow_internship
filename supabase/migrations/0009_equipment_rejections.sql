create table equipment(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  kind text not null check(kind in('panel','inverter','battery','other')), make text, model text not null check(length(trim(model))>0), serial text,
  quantity int not null default 1 check(quantity>0), created_by uuid default auth.uid(), created_at timestamptz default now());
create unique index equipment_serial_uq on equipment(project_id, kind, lower(serial)) where serial is not null;
alter table equipment enable row level security;
create policy eq_sel on equipment for select using(can_access_project(project_id));
create policy eq_ins on equipment for insert with check(has_role('admin','project_manager','engineer') and can_access_project(project_id));
create policy eq_upd on equipment for update using(has_role('admin','project_manager','engineer') and can_access_project(project_id));
create policy eq_del on equipment for delete using(has_role('admin','project_manager') and can_access_project(project_id));
alter table documents add column equipment_model text;   -- the equipment model a document names, used for mismatch checks
create table rejections(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  authority text not null check(length(trim(authority))>0), office text, stage text not null default 'net_metering' check(stage in('permit','net_metering')),
  category text not null check(category in('Missing document','Document mismatch','Drawing issue','Fee or payment','Site or inspection','Customer details','Other')),
  reason text not null check(length(trim(reason))>0), resolved boolean not null default false, created_by uuid default auth.uid(), created_at timestamptz default now());
create index on rejections(lower(authority));
alter table rejections enable row level security;
create policy rj_sel on rejections for select using(can_access_project(project_id) and not has_role('contractor'));
create policy rj_ins on rejections for insert with check(has_role('admin','project_manager','engineer') and can_access_project(project_id));
create policy rj_upd on rejections for update using(has_role('admin','project_manager','engineer') and can_access_project(project_id));
create policy rj_del on rejections for delete using(has_role('admin') and can_access_project(project_id));
