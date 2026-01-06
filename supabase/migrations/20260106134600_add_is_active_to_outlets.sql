-- Add is_active column to outlets for active kitchen selection
alter table if exists outlets
  add column if not exists is_active boolean default true;
