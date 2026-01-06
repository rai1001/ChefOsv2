-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Organizations / Tenants (Outlets)
create table if not exists outlets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null, 
  address text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 2. Suppliers (New Table)
create table if not exists suppliers (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  name text not null,
  contact_person text,
  email text,
  phone text,
  lead_time_days integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Inventory System (Updates to existing table)
create table if not exists ingredients (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  name text not null,
  description text,
  current_stock numeric default 0,
  min_stock numeric default 0,
  unit text not null,
  cost_per_unit numeric default 0,
  allergens text[],
  nutritional_info jsonb,
  created_at timestamptz default now()
);

-- Add new columns to Ingredients if they don't exist
alter table ingredients add column if not exists optimal_stock numeric default 0;
alter table ingredients add column if not exists supplier_id uuid references suppliers(id);
alter table ingredients add column if not exists supplier_sku text;
alter table ingredients add column if not exists category text default 'other';

-- 4. Recipes & Menu Engineering (New Tables)
create table if not exists recipes (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  name text not null,
  description text,
  category text, 
  sub_category text,
  servings numeric not null default 1,
  yield_quantity numeric default 0,
  yield_unit text,
  prep_time integer default 0,
  cook_time integer default 0,
  labor_cost numeric default 0,
  packaging_cost numeric default 0,
  selling_price numeric default 0,
  target_cost_percent numeric default 30,
  image_url text,
  video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  type text not null check (type in ('raw', 'recipe')),
  linked_ingredient_id uuid references ingredients(id),
  linked_recipe_id uuid references recipes(id),
  name_snapshot text,
  quantity numeric not null default 0,
  unit text not null,
  waste_percentage numeric default 0,
  created_at timestamptz default now()
);

-- 5. Stock & Transactions (New Table)
create table if not exists stock_transactions (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  ingredient_id uuid references ingredients(id) not null,
  type text not null,
  quantity numeric not null,
  unit text not null,
  cost_per_unit numeric not null default 0,
  reason text,
  performed_by text,
  created_at timestamptz default now()
);

-- 6. User Profiles (New Table)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  role text default 'staff',
  avatar_url text,
  active_outlet_id uuid references outlets(id),
  allowed_outlet_ids uuid[],
  is_active boolean default true,
  created_at timestamptz default now()
);

-- RLS Policies (Safe to run multiple times because policies might error if exist, but tables won't)
-- PRO TOP: In SQL Editor, you can just ignore "policy already exists" errors, or drop them first.
-- For simplicity, we drop existing policies to ensure fresh definitions.

drop policy if exists "Public Access Outlets" on outlets;
drop policy if exists "Public Access Suppliers" on suppliers;
drop policy if exists "Public Access Ingredients" on ingredients;
drop policy if exists "Public Access Recipes" on recipes;
drop policy if exists "Public Access RecipeItems" on recipe_ingredients;
drop policy if exists "Public Access Stock" on stock_transactions;
drop policy if exists "Public Access Profiles" on profiles;

alter table outlets enable row level security;
alter table suppliers enable row level security;
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table stock_transactions enable row level security;
alter table profiles enable row level security;

create policy "Public Access Outlets" on outlets for all using (true);
create policy "Public Access Suppliers" on suppliers for all using (true);
create policy "Public Access Ingredients" on ingredients for all using (true);
create policy "Public Access Recipes" on recipes for all using (true);
create policy "Public Access RecipeItems" on recipe_ingredients for all using (true);
create policy "Public Access Stock" on stock_transactions for all using (true);
create policy "Public Access Profiles" on profiles for all using (true);


-- 7. Schema Updates (Calculated after initial design)
alter table recipes add column if not exists instructions jsonb default '[]'::jsonb;
alter table recipes add column if not exists allergens text[] default '{}';
alter table recipes add column if not exists tags text[] default '{}';

-- 8. Purchasing System
create table if not exists purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  supplier_id uuid references suppliers(id),
  status text default 'draft', -- draft, ordered, received, cancelled
  total_amount numeric default 0,
  delivery_date timestamptz,
  notes text,
  items jsonb default '[]'::jsonb, -- Array of ordered items
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. Production System
create table if not exists production_tasks (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  recipe_id uuid references recipes(id),
  status text default 'pending', -- pending, in_progress, completed
  quantity_planned numeric not null default 0,
  quantity_actual numeric default 0,
  unit text,
  assigned_to uuid references profiles(id),
  due_date timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. Events System
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  name text not null,
  date date not null,
  pax integer default 0,
  type text,
  room text,
  menu_id uuid, -- Link to menus table
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. Menus System
create table if not exists menus (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  name text not null,
  description text,
  category text,
  sell_price numeric default 0,
  status text default 'active',
  recipe_ids uuid[] default '{}',
  variations jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 12. Waste Tracking
create table if not exists waste_records (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  ingredient_id uuid references ingredients(id),
  recipe_id uuid references recipes(id),
  quantity numeric not null,
  unit text,
  cost numeric default 0,
  reason text,
  recorded_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 13. Staff & HR
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  name text not null,
  role text,
  status text default 'ACTIVE',
  hourly_rate numeric default 0,
  vacation_allowance integer default 30,
  qualification_docs jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists shifts (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  employee_id uuid references employees(id) on delete cascade,
  date date not null,
  type text not null, -- MORNING, AFTERNOON, OFF, etc.
  created_at timestamptz default now()
);

-- 14. HACCP system
create table if not exists haccp_pccs (
  id uuid primary key default uuid_generate_v4(),
  outlet_id uuid references outlets(id) not null,
  name text not null,
  type text,
  min_temp numeric,
  max_temp numeric,
  is_active boolean default true
);

create table if not exists haccp_logs (
  id uuid primary key default uuid_generate_v4(),
  pcc_id uuid references haccp_pccs(id) on delete cascade,
  value numeric not null,
  status text,
  recorded_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);

-- 15. Hospitality Services
create table if not exists hospitality_services (
  id text primary key, -- Custom ID like YYYY-MM-DD_mealType
  outlet_id uuid references outlets(id) not null,
  date date not null,
  meal_type text not null,
  forecast_pax integer default 0,
  real_pax integer default 0,
  consumption jsonb default '{}'::jsonb,
  is_committed boolean default false,
  created_at timestamptz default now()
);

-- RLS for New Tables
drop policy if exists "Public Access PurchaseOrders" on purchase_orders;
drop policy if exists "Public Access ProductionTasks" on production_tasks;

alter table purchase_orders enable row level security;
alter table production_tasks enable row level security;

create policy "Public Access PurchaseOrders" on purchase_orders for all using (true);
create policy "Public Access ProductionTasks" on production_tasks for all using (true);

-- RLS Policies for New Tables
alter table events enable row level security;
alter table menus enable row level security;
alter table waste_records enable row level security;
alter table employees enable row level security;
alter table shifts enable row level security;
alter table haccp_pccs enable row level security;
alter table haccp_logs enable row level security;
alter table hospitality_services enable row level security;

create policy "Public Access Events" on events for all using (true);
create policy "Public Access Menus" on menus for all using (true);
create policy "Public Access Waste" on waste_records for all using (true);
create policy "Public Access Employees" on employees for all using (true);
create policy "Public Access Shifts" on shifts for all using (true);
create policy "Public Access PCCs" on haccp_pccs for all using (true);
create policy "Public Access HACCPLogs" on haccp_logs for all using (true);
create policy "Public Access Hospitality" on hospitality_services for all using (true);
