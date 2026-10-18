create extension if not exists pgcrypto;
create table profiles(id uuid primary key references auth.users on delete cascade, full_name text, email text,
  role text not null default 'contractor' check(role in('admin','project_manager','engineer','contractor','finance')),
  contractor_id uuid, created_at timestamptz default now());
create table contractors(id uuid primary key default gen_random_uuid(), company_name text not null, contact_person text, email text, phone text,
  service_area text, specialization text, payment_terms text, active boolean default true, created_at timestamptz default now());
alter table profiles add foreign key(contractor_id) references contractors(id);
create sequence project_code_seq start 1001;
create table projects(id uuid primary key default gen_random_uuid(), code text unique default 'SF-'||nextval('project_code_seq'),
  name text not null, customer_name text not null, customer_phone text, customer_email text, site_address text,
  project_type text not null check(project_type in('Residential','Commercial')), capacity_kw numeric not null check(capacity_kw>0),
  project_manager_id uuid references profiles, engineer_id uuid references profiles, contract_value numeric not null default 0 check(contract_value>=0),
  status text not null default 'Draft' check(status in('Draft','Planning','Permitting','Design','Ready for Installation','Installation in Progress','Inspection','Commissioning','Completed','On Hold')),
  progress int not null default 0 check(progress between 0 and 100), start_date date, end_date date, notes text, archived boolean not null default false,
  created_by uuid references profiles default auth.uid(), created_at timestamptz default now(), updated_at timestamptz default now(),
  check(end_date is null or start_date is null or end_date>=start_date));
create table project_members(project_id uuid references projects on delete cascade, user_id uuid references profiles on delete cascade, primary key(project_id,user_id));
create table contractor_assignments(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  contractor_id uuid not null references contractors, contract_amount numeric not null check(contract_amount>=0), payment_terms text, unique(project_id,contractor_id));
create table permits(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade, authority text, location text, template_name text, created_at timestamptz default now());
create table permit_checklist_items(id uuid primary key default gen_random_uuid(), permit_id uuid not null references permits on delete cascade,
  project_id uuid not null references projects on delete cascade, title text not null, assignee_id uuid references profiles, due_date date,
  priority text default 'Medium' check(priority in('Low','Medium','High')),
  status text not null default 'Not Started' check(status in('Not Started','In Progress','Submitted','Approved','Rejected','Blocked')),
  submitted_on date, approved_on date, rejection_reason text, comments text, created_at timestamptz default now(),
  check(status<>'Rejected' or rejection_reason is not null));
create table net_metering_applications(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  application_ref text, utility_provider text, authority text, submission_date date, inspection_date date, approval_date date, grid_connection_date date,
  status text not null default 'Not Started' check(status in('Not Started','Documents Required','Ready to Submit','Submitted','Under Review','Inspection Scheduled','Approved','Rejected','Connected to Grid')),
  required_documents text[] default '{}', coordinator_id uuid references profiles, notes text, created_at timestamptz default now());
create table documents(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  category text not null check(category in('CAD Layouts','Electrical Drawings','Permits','Utility Documents','Contracts','Invoices','Inspection Reports','Other Documents')),
  title text not null, description text, status text not null default 'Draft' check(status in('Draft','Under Review','Approved')),
  current_version int not null default 1, created_by uuid references profiles default auth.uid(), created_at timestamptz default now());
create table document_versions(id uuid primary key default gen_random_uuid(), document_id uuid not null references documents on delete cascade,
  version int not null, storage_path text not null, file_name text not null, size_bytes bigint, uploaded_by uuid references profiles default auth.uid(),
  created_at timestamptz default now(), unique(document_id,version));
create table tasks(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade, title text not null, description text,
  assignee_id uuid references profiles, contractor_id uuid references contractors, start_date date, due_date date,
  priority text default 'Medium' check(priority in('Low','Medium','High')),
  status text not null default 'To Do' check(status in('To Do','In Progress','Blocked','Completed')),
  depends_on uuid[] default '{}', evidence_path text, created_at timestamptz default now(), check(due_date is null or start_date is null or due_date>=start_date));
create table task_comments(id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks on delete cascade, author_id uuid references profiles default auth.uid(), body text not null, created_at timestamptz default now());
create table payment_milestones(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  contractor_id uuid not null references contractors, description text not null, contract_amount numeric not null check(contract_amount>=0),
  milestone_amount numeric not null check(milestone_amount>0), due_date date,
  status text not null default 'not_due' check(status in('not_due','awaiting_evidence','pending_verification','pending_approval','approved_for_payment','paid','disputed')),
  verified_by uuid references profiles, approved_by uuid references profiles, approval_notes text, created_at timestamptz default now(),
  check(status<>'disputed' or approval_notes is not null));
create table invoices(id uuid primary key default gen_random_uuid(), milestone_id uuid not null references payment_milestones on delete cascade,
  invoice_number text not null, invoice_date date not null, storage_path text, uploaded_by uuid references profiles default auth.uid(), unique(milestone_id,invoice_number));
create table payments(id uuid primary key default gen_random_uuid(), milestone_id uuid not null unique references payment_milestones, amount numeric not null check(amount>0),
  paid_on date not null, transaction_ref text not null check(length(trim(transaction_ref))>0), recorded_by uuid references profiles default auth.uid(), created_at timestamptz default now());
create table notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, kind text not null, message text not null,
  project_id uuid references projects on delete cascade, ref_id uuid, day date not null default current_date, read boolean not null default false,
  source text not null default 'system' check(source in('scheduled','system')), created_at timestamptz default now(), unique(user_id,kind,ref_id,day));
create table activity_logs(id uuid primary key default gen_random_uuid(), project_id uuid references projects on delete cascade, actor_id uuid default auth.uid(),
  action text not null, entity text not null, entity_id uuid, detail jsonb, created_at timestamptz default now());
create index on projects(status) where not archived; create index on tasks(project_id,status); create index on tasks(due_date);
create index on permit_checklist_items(project_id,status); create index on net_metering_applications(project_id,status);
create index on payment_milestones(project_id,status); create index on documents(project_id,category); create index on activity_logs(project_id,created_at desc);
create index on notifications(user_id,read);
create view payment_overview with(security_invoker=true) as select m.*, (m.status not in('paid','not_due') and m.due_date<current_date) as is_overdue,
  coalesce((select sum(amount) from payments p where p.milestone_id=m.id),0) as amount_paid from payment_milestones m;
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger projects_touch before update on projects for each row execute function touch_updated();
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.email)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
create function log_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare j jsonb:=to_jsonb(new); begin
insert into activity_logs(project_id,action,entity,entity_id,detail) values(
 case when tg_table_name='projects' then (j->>'id')::uuid else (j->>'project_id')::uuid end, lower(tg_op), tg_table_name, (j->>'id')::uuid,
 jsonb_build_object('status',j->>'status')); return new; end $$;
do $$ declare t text; begin foreach t in array array['projects','tasks','documents','permit_checklist_items','net_metering_applications','payment_milestones','payments'] loop
 execute format('create trigger %I_log after insert or update on %I for each row execute function log_activity()',t,t); end loop; end $$;
