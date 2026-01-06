-- Ensure UUID functions exist for default ids
create extension if not exists "pgcrypto";

-- Invitations table to support user invite flows
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null,
  allowed_outlets text[] default '{}',
  status text default 'pending',
  invited_by uuid references profiles(id),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  error text
);

alter table invitations enable row level security;
drop policy if exists "Public Access Invitations" on invitations;
create policy "Public Access Invitations" on invitations for all using (true);

-- Ensure employees have qualification_docs jsonb to match UI payloads
alter table if exists employees
  add column if not exists qualification_docs jsonb default '[]'::jsonb;
