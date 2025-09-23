-- Create user profiles table with RLS policies
create table public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  email text unique not null,
  full_name text,
  role text,
  institution text,
  bio text,
  market_focus text[],
  experience text,
  profile_photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.user_profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.user_profiles for update
  using ( auth.uid() = id );

-- Create trigger to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at
  before update on public.user_profiles
  for each row
  execute procedure public.handle_updated_at();

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();