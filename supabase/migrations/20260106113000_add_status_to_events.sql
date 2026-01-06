-- Add status column to events to match application payloads
alter table if exists events
  add column if not exists status text default 'confirmed';
