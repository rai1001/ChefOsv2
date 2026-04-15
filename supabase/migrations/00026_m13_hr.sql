-- ============================================================================
-- M13 Personal y Horarios — ChefOS v2
-- Tablas: personnel, shift_definitions, schedule_rules, schedule_assignments
-- RPCs:   create_personnel, update_personnel,
--         create_shift_definition, update_shift_definition,
--         create_schedule_rule, update_schedule_rule, delete_schedule_rule,
--         generate_monthly_schedule,
--         update_assignment, delete_assignment,
--         get_personnel, get_shift_definitions,
--         get_schedule_rules, get_schedule_assignments
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================

create type public.personnel_role as enum (
  'chef_ejecutivo',
  'jefe_partida',
  'cocinero',
  'ayudante_cocina',
  'fregador',
  'pastelero',
  'barista',
  'camarero',
  'otro'
);

create type public.contract_type as enum (
  'indefinido',
  'temporal',
  'formacion',
  'autonomo',
  'becario'
);

create type public.shift_type as enum (
  'normal',
  'refuerzo',
  'evento'
);

create type public.schedule_origin as enum (
  'regla',
  'evento',
  'ajuste'
);

create type public.schedule_status as enum (
  'propuesto',
  'confirmado',
  'cancelado'
);

-- ====================
-- 2. TABLAS
-- ====================

-- Personal operativo del hotel
create table public.personnel (
  id              uuid primary key default gen_random_uuid(),
  hotel_id        uuid not null references public.hotels(id) on delete cascade,
  name            text not null,
  role            public.personnel_role not null default 'cocinero',
  secondary_roles public.personnel_role[] not null default '{}',
  contract_type   public.contract_type not null default 'indefinido',
  weekly_hours    numeric(5,2) not null default 40,
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_personnel_hotel on public.personnel(hotel_id);
create index idx_personnel_active  on public.personnel(hotel_id, active);

-- Definiciones de turno reutilizables
create table public.shift_definitions (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels(id) on delete cascade,
  name        text not null,
  start_time  time not null,
  end_time    time not null,
  shift_type  public.shift_type not null default 'normal',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(hotel_id, name)
);

create index idx_shift_def_hotel on public.shift_definitions(hotel_id);

-- Reglas para generación automática de horario
create table public.schedule_rules (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels(id) on delete cascade,
  role         public.personnel_role not null,
  days_of_week int[] not null,          -- 1=Lun … 7=Dom (ISO)
  shift_id     uuid not null references public.shift_definitions(id) on delete cascade,
  min_persons  int not null default 1,
  max_persons  int,
  priority     text not null default 'normal' check (priority in ('normal', 'alta')),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_schedule_rules_hotel on public.schedule_rules(hotel_id);

-- Asignaciones del horario (propuesto / confirmado)
create table public.schedule_assignments (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references public.hotels(id) on delete cascade,
  personnel_id   uuid not null references public.personnel(id) on delete cascade,
  shift_id       uuid not null references public.shift_definitions(id) on delete cascade,
  work_date      date not null,
  origin         public.schedule_origin not null default 'regla',
  status         public.schedule_status not null default 'propuesto',
  rule_id        uuid references public.schedule_rules(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(personnel_id, work_date, shift_id)
);

create index idx_schedule_assign_hotel      on public.schedule_assignments(hotel_id);
create index idx_schedule_assign_date       on public.schedule_assignments(hotel_id, work_date);
create index idx_schedule_assign_personnel  on public.schedule_assignments(personnel_id, work_date);

-- ====================
-- 3. TRIGGERS updated_at
-- ====================

create trigger set_updated_at_personnel
  before update on public.personnel
  for each row execute function public.set_updated_at();

create trigger set_updated_at_shift_definitions
  before update on public.shift_definitions
  for each row execute function public.set_updated_at();

create trigger set_updated_at_schedule_rules
  before update on public.schedule_rules
  for each row execute function public.set_updated_at();

create trigger set_updated_at_schedule_assignments
  before update on public.schedule_assignments
  for each row execute function public.set_updated_at();

-- ====================
-- 4. RLS
-- ====================

alter table public.personnel           enable row level security;
alter table public.shift_definitions   enable row level security;
alter table public.schedule_rules      enable row level security;
alter table public.schedule_assignments enable row level security;

-- personnel
create policy "personnel_select" on public.personnel
  for select using (public.is_member_of(hotel_id));
create policy "personnel_insert" on public.personnel
  for insert with check (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "personnel_update" on public.personnel
  for update using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "personnel_delete" on public.personnel
  for delete using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin'));

-- shift_definitions
create policy "shift_def_select" on public.shift_definitions
  for select using (public.is_member_of(hotel_id));
create policy "shift_def_insert" on public.shift_definitions
  for insert with check (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "shift_def_update" on public.shift_definitions
  for update using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "shift_def_delete" on public.shift_definitions
  for delete using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin'));

-- schedule_rules
create policy "schedule_rules_select" on public.schedule_rules
  for select using (public.is_member_of(hotel_id));
create policy "schedule_rules_insert" on public.schedule_rules
  for insert with check (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "schedule_rules_update" on public.schedule_rules
  for update using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "schedule_rules_delete" on public.schedule_rules
  for delete using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));

-- schedule_assignments
create policy "schedule_assign_select" on public.schedule_assignments
  for select using (public.is_member_of(hotel_id));
create policy "schedule_assign_insert" on public.schedule_assignments
  for insert with check (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "schedule_assign_update" on public.schedule_assignments
  for update using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));
create policy "schedule_assign_delete" on public.schedule_assignments
  for delete using (public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef'));

-- ====================
-- 5. AUDIT TRIGGERS
-- ====================

create trigger audit_personnel
  after insert or update or delete on public.personnel
  for each row execute function public.audit_trigger_fn();

create trigger audit_schedule_assignments
  after insert or update or delete on public.schedule_assignments
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 6. RPCs — PERSONAL
-- ====================

create or replace function public.create_personnel(
  p_hotel_id      uuid,
  p_name          text,
  p_role          public.personnel_role,
  p_contract_type public.contract_type default 'indefinido',
  p_weekly_hours  numeric            default 40,
  p_notes         text               default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform check_membership(p_hotel_id);
  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Solo admin o chef pueden crear personal';
  end if;

  insert into public.personnel(hotel_id, name, role, contract_type, weekly_hours, notes)
  values (p_hotel_id, p_name, p_role, p_contract_type, p_weekly_hours, p_notes)
  returning id into v_id;

  perform emit_event(
    p_hotel_id,
    'hr.personal_created',
    jsonb_build_object('id', v_id, 'name', p_name, 'role', p_role)
  );
  return v_id;
end;
$$;

create or replace function public.update_personnel(
  p_id            uuid,
  p_name          text               default null,
  p_role          public.personnel_role default null,
  p_contract_type public.contract_type default null,
  p_weekly_hours  numeric            default null,
  p_active        boolean            default null,
  p_notes         text               default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  select hotel_id into v_hotel_id from public.personnel where id = p_id;
  if not found then raise exception 'Personal no encontrado'; end if;
  perform check_membership(v_hotel_id);
  if get_member_role(v_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para modificar personal';
  end if;

  update public.personnel set
    name          = coalesce(p_name, name),
    role          = coalesce(p_role, role),
    contract_type = coalesce(p_contract_type, contract_type),
    weekly_hours  = coalesce(p_weekly_hours, weekly_hours),
    active        = coalesce(p_active, active),
    notes         = coalesce(p_notes, notes),
    updated_at    = now()
  where id = p_id;
end;
$$;

-- ====================
-- 7. RPCs — TURNOS
-- ====================

create or replace function public.create_shift_definition(
  p_hotel_id   uuid,
  p_name       text,
  p_start_time time,
  p_end_time   time,
  p_shift_type public.shift_type default 'normal'
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform check_membership(p_hotel_id);
  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para crear turnos';
  end if;

  insert into public.shift_definitions(hotel_id, name, start_time, end_time, shift_type)
  values (p_hotel_id, p_name, p_start_time, p_end_time, p_shift_type)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_shift_definition(
  p_id         uuid,
  p_name       text              default null,
  p_start_time time              default null,
  p_end_time   time              default null,
  p_shift_type public.shift_type default null,
  p_active     boolean           default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  select hotel_id into v_hotel_id from public.shift_definitions where id = p_id;
  if not found then raise exception 'Turno no encontrado'; end if;
  perform check_membership(v_hotel_id);
  if get_member_role(v_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para modificar turnos';
  end if;

  update public.shift_definitions set
    name       = coalesce(p_name, name),
    start_time = coalesce(p_start_time, start_time),
    end_time   = coalesce(p_end_time, end_time),
    shift_type = coalesce(p_shift_type, shift_type),
    active     = coalesce(p_active, active),
    updated_at = now()
  where id = p_id;
end;
$$;

-- ====================
-- 8. RPCs — REGLAS
-- ====================

create or replace function public.create_schedule_rule(
  p_hotel_id    uuid,
  p_role        public.personnel_role,
  p_days_of_week int[],
  p_shift_id    uuid,
  p_min_persons int    default 1,
  p_max_persons int    default null,
  p_priority    text   default 'normal'
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform check_membership(p_hotel_id);
  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para crear reglas de horario';
  end if;

  insert into public.schedule_rules(
    hotel_id, role, days_of_week, shift_id, min_persons, max_persons, priority
  ) values (
    p_hotel_id, p_role, p_days_of_week, p_shift_id, p_min_persons, p_max_persons, p_priority
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_schedule_rule(
  p_id          uuid,
  p_role        public.personnel_role default null,
  p_days_of_week int[]                default null,
  p_shift_id    uuid                  default null,
  p_min_persons int                   default null,
  p_max_persons int                   default null,
  p_priority    text                  default null,
  p_active      boolean               default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  select hotel_id into v_hotel_id from public.schedule_rules where id = p_id;
  if not found then raise exception 'Regla no encontrada'; end if;
  perform check_membership(v_hotel_id);
  if get_member_role(v_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para modificar reglas';
  end if;

  update public.schedule_rules set
    role         = coalesce(p_role, role),
    days_of_week = coalesce(p_days_of_week, days_of_week),
    shift_id     = coalesce(p_shift_id, shift_id),
    min_persons  = coalesce(p_min_persons, min_persons),
    max_persons  = coalesce(p_max_persons, max_persons),
    priority     = coalesce(p_priority, priority),
    active       = coalesce(p_active, active),
    updated_at   = now()
  where id = p_id;
end;
$$;

create or replace function public.delete_schedule_rule(p_id uuid) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  select hotel_id into v_hotel_id from public.schedule_rules where id = p_id;
  if not found then raise exception 'Regla no encontrada'; end if;
  perform check_membership(v_hotel_id);
  if get_member_role(v_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para eliminar reglas';
  end if;
  delete from public.schedule_rules where id = p_id;
end;
$$;

-- ====================
-- 9. RPC — GENERACIÓN AUTOMÁTICA
-- ====================

create or replace function public.generate_monthly_schedule(
  p_hotel_id uuid,
  p_year     int,
  p_month    int
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_date    date;
  v_dow     int;
  v_rule    record;
  v_person  record;
  v_count   int := 0;
begin
  perform check_membership(p_hotel_id);
  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para generar horario';
  end if;

  v_date := make_date(p_year, p_month, 1);

  while extract(month from v_date)::int = p_month loop
    v_dow := extract(isodow from v_date)::int;  -- 1=Lun, 7=Dom

    for v_rule in
      select sr.*
      from public.schedule_rules sr
      join public.shift_definitions sd on sd.id = sr.shift_id and sd.active = true
      where sr.hotel_id = p_hotel_id
        and sr.active   = true
        and v_dow = any(sr.days_of_week)
      order by sr.priority desc
    loop
      for v_person in
        select p.id
        from public.personnel p
        where p.hotel_id = p_hotel_id
          and p.active   = true
          and p.role     = v_rule.role
          and not exists (
            select 1 from public.schedule_assignments sa
            where sa.personnel_id = p.id
              and sa.work_date    = v_date
              and sa.shift_id     = v_rule.shift_id
          )
        order by p.name
        limit v_rule.min_persons
      loop
        insert into public.schedule_assignments(
          hotel_id, personnel_id, shift_id, work_date, origin, status, rule_id
        ) values (
          p_hotel_id, v_person.id, v_rule.shift_id, v_date, 'regla', 'propuesto', v_rule.id
        )
        on conflict (personnel_id, work_date, shift_id) do nothing;

        if found then
          v_count := v_count + 1;
        end if;
      end loop;
    end loop;

    v_date := v_date + interval '1 day';
  end loop;

  return v_count;
end;
$$;

-- ====================
-- 10. RPCs — ASIGNACIONES
-- ====================

create or replace function public.update_assignment(
  p_id       uuid,
  p_shift_id uuid                   default null,
  p_status   public.schedule_status default null,
  p_notes    text                   default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  select hotel_id into v_hotel_id from public.schedule_assignments where id = p_id;
  if not found then raise exception 'Asignación no encontrada'; end if;
  perform check_membership(v_hotel_id);
  if get_member_role(v_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para modificar asignaciones';
  end if;

  update public.schedule_assignments set
    shift_id   = coalesce(p_shift_id, shift_id),
    status     = coalesce(p_status, status),
    notes      = coalesce(p_notes, notes),
    origin     = case when p_shift_id is not null then 'ajuste'::public.schedule_origin else origin end,
    updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.delete_assignment(p_id uuid) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
begin
  select hotel_id into v_hotel_id from public.schedule_assignments where id = p_id;
  if not found then raise exception 'Asignación no encontrada'; end if;
  perform check_membership(v_hotel_id);
  if get_member_role(v_hotel_id) not in ('superadmin', 'direction', 'admin', 'head_chef') then
    raise exception 'Sin permisos para eliminar asignaciones';
  end if;
  delete from public.schedule_assignments where id = p_id;
end;
$$;

-- ====================
-- 11. RPCs — LECTURAS
-- ====================

create or replace function public.get_personnel(
  p_hotel_id   uuid,
  p_active_only boolean default false
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(p_hotel_id);
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',              p.id,
          'hotel_id',        p.hotel_id,
          'name',            p.name,
          'role',            p.role,
          'secondary_roles', p.secondary_roles,
          'contract_type',   p.contract_type,
          'weekly_hours',    p.weekly_hours,
          'active',          p.active,
          'notes',           p.notes,
          'created_at',      p.created_at,
          'updated_at',      p.updated_at
        ) order by p.name
      )
      from public.personnel p
      where p.hotel_id = p_hotel_id
        and (not p_active_only or p.active = true)
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_shift_definitions(
  p_hotel_id   uuid,
  p_active_only boolean default false
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(p_hotel_id);
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',         sd.id,
          'hotel_id',   sd.hotel_id,
          'name',       sd.name,
          'start_time', sd.start_time,
          'end_time',   sd.end_time,
          'shift_type', sd.shift_type,
          'active',     sd.active
        ) order by sd.start_time
      )
      from public.shift_definitions sd
      where sd.hotel_id = p_hotel_id
        and (not p_active_only or sd.active = true)
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_schedule_rules(p_hotel_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(p_hotel_id);
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',           sr.id,
          'role',         sr.role,
          'days_of_week', sr.days_of_week,
          'shift_id',     sr.shift_id,
          'shift_name',   sd.name,
          'shift_start',  sd.start_time,
          'shift_end',    sd.end_time,
          'min_persons',  sr.min_persons,
          'max_persons',  sr.max_persons,
          'priority',     sr.priority,
          'active',       sr.active
        ) order by sr.role, sr.priority desc
      )
      from public.schedule_rules sr
      join public.shift_definitions sd on sd.id = sr.shift_id
      where sr.hotel_id = p_hotel_id
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_schedule_assignments(
  p_hotel_id  uuid,
  p_date_from date,
  p_date_to   date
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(p_hotel_id);
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',              sa.id,
          'personnel_id',    sa.personnel_id,
          'personnel_name',  pe.name,
          'personnel_role',  pe.role,
          'shift_id',        sa.shift_id,
          'shift_name',      sd.name,
          'shift_start',     sd.start_time,
          'shift_end',       sd.end_time,
          'shift_type',      sd.shift_type,
          'work_date',       sa.work_date,
          'origin',          sa.origin,
          'status',          sa.status,
          'notes',           sa.notes
        ) order by sa.work_date, sd.start_time, pe.name
      )
      from public.schedule_assignments sa
      join public.personnel        pe on pe.id = sa.personnel_id
      join public.shift_definitions sd on sd.id = sa.shift_id
      where sa.hotel_id   = p_hotel_id
        and sa.work_date between p_date_from and p_date_to
    ),
    '[]'::jsonb
  );
end;
$$;

-- Permisos de ejecución (authenticated users)
grant execute on function public.create_personnel         to authenticated;
grant execute on function public.update_personnel         to authenticated;
grant execute on function public.create_shift_definition  to authenticated;
grant execute on function public.update_shift_definition  to authenticated;
grant execute on function public.create_schedule_rule     to authenticated;
grant execute on function public.update_schedule_rule     to authenticated;
grant execute on function public.delete_schedule_rule     to authenticated;
grant execute on function public.generate_monthly_schedule to authenticated;
grant execute on function public.update_assignment        to authenticated;
grant execute on function public.delete_assignment        to authenticated;
grant execute on function public.get_personnel            to authenticated;
grant execute on function public.get_shift_definitions    to authenticated;
grant execute on function public.get_schedule_rules       to authenticated;
grant execute on function public.get_schedule_assignments to authenticated;
