create function app_role() returns text language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() $$;
create function my_contractor() returns uuid language sql stable security definer set search_path=public as $$ select contractor_id from profiles where id=auth.uid() $$;
create function has_role(variadic r text[]) returns boolean language sql stable as $$ select coalesce(app_role()=any(r),false) $$;
create function can_access_project(pid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(case app_role()
  when 'admin' then true when 'finance' then true
  when 'contractor' then exists(select 1 from contractor_assignments ca where ca.project_id=pid and ca.contractor_id=my_contractor())
  else exists(select 1 from projects p where p.id=pid and auth.uid() in(p.project_manager_id,p.engineer_id)) or exists(select 1 from project_members m where m.project_id=pid and m.user_id=auth.uid()) end,false) $$;
do $$ declare t text; begin foreach t in array array['profiles','contractors','projects','project_members','contractor_assignments','permits','permit_checklist_items','net_metering_applications','documents','document_versions','tasks','task_comments','payment_milestones','invoices','payments','notifications','activity_logs'] loop
 execute format('alter table %I enable row level security',t); end loop; end $$;
-- project-scoped tables: read if you can access the project; write for admin/PM/engineer on accessible projects
do $$ declare t text; begin foreach t in array array['project_members','permits','permit_checklist_items','net_metering_applications','documents','tasks'] loop
 execute format('create policy %I on %I for select using(can_access_project(project_id))',t||'_sel',t);
 execute format('create policy %I on %I for insert with check(has_role(''admin'',''project_manager'',''engineer'') and can_access_project(project_id))',t||'_ins',t);
 execute format('create policy %I on %I for update using(has_role(''admin'',''project_manager'',''engineer'') and can_access_project(project_id))',t||'_upd',t);
 execute format('create policy %I on %I for delete using(has_role(''admin'',''project_manager'') and can_access_project(project_id))',t||'_del',t); end loop; end $$;
create policy profiles_sel on profiles for select using(id=auth.uid() or has_role('admin','project_manager','engineer','finance'));
create policy profiles_upd on profiles for update using(has_role('admin'));
create policy contractors_sel on contractors for select using(has_role('admin','project_manager','engineer','finance') or id=my_contractor());
create policy contractors_wr on contractors for all using(has_role('admin','project_manager')) with check(has_role('admin','project_manager'));
create policy projects_sel on projects for select using(can_access_project(id));
create policy projects_ins on projects for insert with check(has_role('admin','project_manager'));
create policy projects_upd on projects for update using(has_role('admin') or (has_role('project_manager') and can_access_project(id)));
create policy projects_del on projects for delete using(has_role('admin'));
create policy ca_sel on contractor_assignments for select using(has_role('admin','project_manager','finance') and can_access_project(project_id) or contractor_id=my_contractor());
create policy ca_wr on contractor_assignments for all using(has_role('admin','project_manager')) with check(has_role('admin','project_manager'));
-- contractors may work on their own tasks and add documents on their projects
create policy tasks_contractor_upd on tasks for update using(contractor_id=my_contractor() and contractor_id is not null);
create policy docs_contractor_ins on documents for insert with check(has_role('contractor') and can_access_project(project_id));
create policy dv_sel on document_versions for select using(exists(select 1 from documents d where d.id=document_id));
create policy dv_ins on document_versions for insert with check(exists(select 1 from documents d where d.id=document_id) and uploaded_by=auth.uid());
create policy tc_sel on task_comments for select using(exists(select 1 from tasks t where t.id=task_id));
create policy tc_ins on task_comments for insert with check(exists(select 1 from tasks t where t.id=task_id) and author_id=auth.uid());
-- payments: contractors see only their own milestones
create policy pm_sel on payment_milestones for select using(has_role('admin','project_manager','finance') and can_access_project(project_id) or contractor_id=my_contractor());
create policy pm_ins on payment_milestones for insert with check(has_role('admin','project_manager'));
create policy pm_upd on payment_milestones for update using(has_role('admin','project_manager','finance') and can_access_project(project_id) or contractor_id=my_contractor());
create policy inv_sel on invoices for select using(exists(select 1 from payment_milestones m where m.id=milestone_id));
create policy inv_ins on invoices for insert with check(exists(select 1 from payment_milestones m where m.id=milestone_id and (m.contractor_id=my_contractor() or has_role('admin','project_manager'))) and uploaded_by=auth.uid());
create policy pay_sel on payments for select using(exists(select 1 from payment_milestones m where m.id=milestone_id));
create policy pay_ins on payments for insert with check(has_role('admin','finance'));
create policy notif_sel on notifications for select using(user_id=auth.uid());
create policy notif_upd on notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy act_sel on activity_logs for select using(project_id is null and has_role('admin') or can_access_project(project_id));
-- payment state machine enforced in the database
create function enforce_milestone_transition() returns trigger language plpgsql security definer set search_path=public as $$
declare r text:=app_role(); ok boolean; begin
if new.status=old.status then return new; end if;
ok:=case old.status||'>'||new.status
 when 'not_due>awaiting_evidence' then r in('admin','project_manager')
 when 'awaiting_evidence>pending_verification' then r in('admin','contractor') and exists(select 1 from invoices i where i.milestone_id=new.id)
 when 'pending_verification>pending_approval' then r in('admin','project_manager')
 when 'pending_approval>approved_for_payment' then r in('admin','finance')
 when 'approved_for_payment>paid' then current_setting('app.paid_ok',true)='1'
 else new.status='disputed' and old.status in('pending_verification','pending_approval','approved_for_payment') and r in('admin','project_manager','finance') end;
if not coalesce(ok,false) then raise exception 'Transition % to % is not allowed for role %',old.status,new.status,r; end if;
if new.status='pending_approval' then new.verified_by:=auth.uid(); end if;
if new.status='approved_for_payment' then
  if auth.uid()=old.verified_by then raise exception 'The verifier cannot also approve this payment'; end if; new.approved_by:=auth.uid(); end if;
return new; end $$;
create trigger milestone_transition before update of status on payment_milestones for each row execute function enforce_milestone_transition();
create function mark_paid() returns trigger language plpgsql security definer set search_path=public as $$
begin if (select status from payment_milestones where id=new.milestone_id)<>'approved_for_payment' then raise exception 'Milestone is not approved for payment'; end if;
perform set_config('app.paid_ok','1',true); update payment_milestones set status='paid' where id=new.milestone_id; perform set_config('app.paid_ok','0',true); return new; end $$;
create trigger payment_marks_paid before insert on payments for each row execute function mark_paid();
