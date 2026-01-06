-- Add qualification_docs column to employees (jsonb) for staff uploads
alter table if exists employees
  add column if not exists qualification_docs jsonb default '[]'::jsonb;
