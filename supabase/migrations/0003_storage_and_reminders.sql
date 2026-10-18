-- Private bucket. Object path convention: {project_id}/{document_id}/{file}. Serve files only via short-lived signed URLs.
insert into storage.buckets(id,name,public,file_size_limit) values('project-files','project-files',false,52428800) on conflict(id) do nothing;
create policy pf_sel on storage.objects for select using(bucket_id='project-files' and can_access_project(((storage.foldername(name))[1])::uuid));
create policy pf_ins on storage.objects for insert with check(bucket_id='project-files' and can_access_project(((storage.foldername(name))[1])::uuid));
create policy pf_del on storage.objects for delete using(bucket_id='project-files' and has_role('admin','project_manager'));
-- Daily reminders (source='scheduled'). Enable pg_cron in the Supabase dashboard first (Database > Extensions).
create function generate_reminders() returns void language plpgsql security definer set search_path=public as $$ begin
insert into notifications(user_id,kind,message,project_id,ref_id,source)
 select coalesce(i.assignee_id,p.project_manager_id),'permit_deadline',case when i.due_date<current_date then 'Overdue permit item: ' else 'Permit item due soon: ' end||i.title,i.project_id,i.id,'scheduled'
 from permit_checklist_items i join projects p on p.id=i.project_id
 where i.status not in('Approved') and i.due_date<=current_date+3 and coalesce(i.assignee_id,p.project_manager_id) is not null on conflict do nothing;
insert into notifications(user_id,kind,message,project_id,ref_id,source)
 select coalesce(t.assignee_id,p.project_manager_id),'task_overdue','Overdue task: '||t.title,t.project_id,t.id,'scheduled'
 from tasks t join projects p on p.id=t.project_id where t.status<>'Completed' and t.due_date<current_date and coalesce(t.assignee_id,p.project_manager_id) is not null on conflict do nothing;
end $$;
-- select cron.schedule('solarflow-reminders','0 3 * * *','select public.generate_reminders()');
