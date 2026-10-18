-- Google sign-in supplies the name as "name" (and often "full_name"); use whichever is present.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',new.email)); return new; end $$;
