-- ============================================================================
-- M8 Automation — ChefOS v2
-- Sistema de jobs asíncronos para tareas programadas y workflows de fondo
-- Tablas: automation_jobs, automation_job_logs, automation_triggers
-- RPCs: enqueue_job, claim_next_job, complete_job, fail_job,
--        cancel_job, get_pending_jobs
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================

create type public.job_type as enum (
  'generate_workflow',
  'generate_shopping_list',
  'send_notification',
  'generate_snapshot',
  'reserve_stock',
  'calculate_cost',
  'export_pdf'
);

create type public.job_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create type public.log_level as enum ('info', 'warning', 'error');

-- ====================
-- 2. TABLAS
-- ====================

-- Cola de jobs asíncronos
create table public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  job_type public.job_type not null,
  status public.job_status not null default 'pending',
  payload jsonb not null default '{}',
  result jsonb,
  error text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice de trabajos pendientes para el worker (scheduled_at ASC)
create index idx_automation_jobs_pending
  on public.automation_jobs (scheduled_at asc)
  where status = 'pending';

create index idx_automation_jobs_hotel
  on public.automation_jobs (hotel_id, created_at desc);

create index idx_automation_jobs_status
  on public.automation_jobs (status, hotel_id);

-- Log de ejecución por job
create table public.automation_job_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.automation_jobs(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  level public.log_level not null default 'info',
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_job_logs_job on public.automation_job_logs (job_id, created_at asc);

-- Reglas de trigger automático
-- e.g. 'event.confirmed' → job_type='generate_workflow', delay_seconds=0
create table public.automation_triggers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  trigger_event text not null,
  job_type public.job_type not null,
  payload_template jsonb not null default '{}',
  delay_seconds integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_auto_triggers_hotel
  on public.automation_triggers (hotel_id, trigger_event)
  where is_active = true;

-- ====================
-- 3. TRIGGERS updated_at
-- ====================

create trigger automation_jobs_updated_at
  before update on public.automation_jobs
  for each row execute function public.set_updated_at();

create trigger automation_triggers_updated_at
  before update on public.automation_triggers
  for each row execute function public.set_updated_at();

-- ====================
-- 4. RLS
-- ====================

alter table public.automation_jobs enable row level security;
alter table public.automation_job_logs enable row level security;
alter table public.automation_triggers enable row level security;

-- automation_jobs: lectura para todos los miembros
create policy "jobs_read" on public.automation_jobs
  for select using (public.is_member_of(hotel_id));

-- escritura para roles operativos
create policy "jobs_insert" on public.automation_jobs
  for insert with check (
    public.get_member_role(hotel_id) in (
      'superadmin','direction','admin','head_chef','sous_chef','operations'
    )
  );

create policy "jobs_update" on public.automation_jobs
  for update using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin')
  );

-- logs: solo lectura para miembros
create policy "job_logs_read" on public.automation_job_logs
  for select using (public.is_member_of(hotel_id));

-- triggers: lectura miembros, escritura admin+
create policy "triggers_read" on public.automation_triggers
  for select using (public.is_member_of(hotel_id));

create policy "triggers_write" on public.automation_triggers
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin')
  );

-- ====================
-- 5. RPCs
-- ====================

-- ── enqueue_job ─────────────────────────────────────────────────────────────
-- Inserta un job en la cola. Llamado por el usuario o por un trigger.
create or replace function public.enqueue_job(
  p_hotel_id uuid,
  p_job_type public.job_type,
  p_payload jsonb default '{}',
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_job_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','operations']::public.app_role[]);

  insert into public.automation_jobs (
    hotel_id, job_type, status, payload, scheduled_at, created_by
  ) values (
    p_hotel_id,
    p_job_type,
    'pending',
    p_payload,
    coalesce(p_scheduled_at, now()),
    auth.uid()
  )
  returning id into v_job_id;

  perform public.emit_event(
    p_hotel_id, 'automation', v_job_id, 'automation.job_enqueued',
    jsonb_build_object('job_type', p_job_type, 'payload', p_payload)
  );

  return v_job_id;
end;
$$;

-- ── claim_next_job ───────────────────────────────────────────────────────────
-- El worker Edge Function reclama el siguiente job pendiente.
-- SECURITY DEFINER — no requiere auth.uid() (llamado con service_role key).
-- FOR UPDATE SKIP LOCKED garantiza que múltiples workers no colisionen.
create or replace function public.claim_next_job(
  p_worker_id text default 'default'
)
returns table (
  id uuid,
  hotel_id uuid,
  job_type public.job_type,
  payload jsonb,
  attempts integer
)
language plpgsql
security definer
as $$
declare
  v_job_id uuid;
  v_hotel_id uuid;
begin
  -- Seleccionar y lockear el siguiente job pendiente
  select j.id, j.hotel_id
  into v_job_id, v_hotel_id
  from public.automation_jobs j
  where j.status = 'pending'
    and j.scheduled_at <= now()
    and j.attempts < j.max_attempts
  order by j.scheduled_at asc
  limit 1
  for update skip locked;

  if v_job_id is null then
    return;
  end if;

  -- Marcar como running
  update public.automation_jobs
  set status = 'running',
      started_at = now(),
      attempts = attempts + 1,
      updated_at = now()
  where automation_jobs.id = v_job_id;

  -- Log de inicio
  insert into public.automation_job_logs (job_id, hotel_id, level, message)
  values (v_job_id, v_hotel_id, 'info', 'Reclamado por worker: ' || p_worker_id);

  -- Devolver detalles del job
  return query
    select j.id, j.hotel_id, j.job_type, j.payload, j.attempts
    from public.automation_jobs j
    where j.id = v_job_id;
end;
$$;

-- ── complete_job ─────────────────────────────────────────────────────────────
-- El worker marca el job como completado.
-- Llamado con service_role — no check_membership.
create or replace function public.complete_job(
  p_job_id uuid,
  p_result jsonb default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_hotel_id uuid;
begin
  select hotel_id into v_hotel_id
  from public.automation_jobs
  where id = p_job_id;

  if not found then
    raise exception 'job no encontrado' using errcode = 'P0010';
  end if;

  update public.automation_jobs
  set status = 'completed',
      completed_at = now(),
      result = p_result,
      error = null,
      updated_at = now()
  where id = p_job_id;

  insert into public.automation_job_logs (job_id, hotel_id, level, message, details)
  values (p_job_id, v_hotel_id, 'info', 'Job completado correctamente', p_result);

  perform public.emit_event(
    v_hotel_id, 'automation', p_job_id, 'automation.job_completed',
    jsonb_build_object('result', p_result)
  );
end;
$$;

-- ── fail_job ─────────────────────────────────────────────────────────────────
-- El worker marca el job como fallido. Con backoff exponencial si p_retry=true.
-- Backoff: intento 1 → 5min, intento 2 → 25min, intento 3 → failed definitivo.
create or replace function public.fail_job(
  p_job_id uuid,
  p_error text,
  p_retry boolean default true
)
returns void
language plpgsql
security definer
as $$
declare
  v_job record;
  v_new_status public.job_status;
  v_reschedule_at timestamptz;
begin
  select * into v_job
  from public.automation_jobs
  where id = p_job_id;

  if not found then
    raise exception 'job no encontrado' using errcode = 'P0010';
  end if;

  -- Determinar si se reintenta con backoff exponencial
  if p_retry and v_job.attempts < v_job.max_attempts then
    v_new_status := 'pending';
    -- Backoff: 5^attempts minutos (1→5min, 2→25min)
    v_reschedule_at := now() + (power(5, v_job.attempts)::text || ' minutes')::interval;
  else
    v_new_status := 'failed';
    v_reschedule_at := null;
  end if;

  update public.automation_jobs
  set status = v_new_status,
      error = p_error,
      scheduled_at = coalesce(v_reschedule_at, scheduled_at),
      updated_at = now()
  where id = p_job_id;

  insert into public.automation_job_logs (job_id, hotel_id, level, message)
  values (p_job_id, v_job.hotel_id, 'error', 'Job fallido: ' || p_error);

  if v_new_status = 'failed' then
    perform public.emit_event(
      v_job.hotel_id, 'automation', p_job_id, 'automation.job_failed',
      jsonb_build_object('error', p_error, 'attempts', v_job.attempts)
    );
  end if;
end;
$$;

-- ── cancel_job ───────────────────────────────────────────────────────────────
-- Cancela un job pendiente (no se puede cancelar uno en running/completed).
create or replace function public.cancel_job(
  p_hotel_id uuid,
  p_job_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','operations']::public.app_role[]);

  update public.automation_jobs
  set status = 'cancelled', updated_at = now()
  where id = p_job_id
    and hotel_id = p_hotel_id
    and status = 'pending';

  if not found then
    raise exception 'job no encontrado o no cancelable' using errcode = 'P0010';
  end if;

  insert into public.automation_job_logs (job_id, hotel_id, level, message)
  values (
    p_job_id, p_hotel_id, 'warning', 'Job cancelado por usuario'
  );
end;
$$;

-- ── get_pending_jobs ─────────────────────────────────────────────────────────
-- Lista de jobs recientes para el frontend (todos los estados, últimos 50).
create or replace function public.get_pending_jobs(
  p_hotel_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  job_type public.job_type,
  status public.job_status,
  payload jsonb,
  result jsonb,
  error text,
  attempts integer,
  max_attempts integer,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','operations']::public.app_role[]);

  return query
    select
      j.id, j.job_type, j.status, j.payload, j.result, j.error,
      j.attempts, j.max_attempts, j.scheduled_at, j.started_at,
      j.completed_at, j.created_at
    from public.automation_jobs j
    where j.hotel_id = p_hotel_id
    order by j.created_at desc
    limit p_limit;
end;
$$;

-- ── get_job_logs ─────────────────────────────────────────────────────────────
-- Logs de un job específico para el frontend.
create or replace function public.get_job_logs(
  p_hotel_id uuid,
  p_job_id uuid
)
returns table (
  id uuid,
  level public.log_level,
  message text,
  details jsonb,
  created_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','operations']::public.app_role[]);

  return query
    select l.id, l.level, l.message, l.details, l.created_at
    from public.automation_job_logs l
    where l.job_id = p_job_id
      and l.hotel_id = p_hotel_id
    order by l.created_at asc;
end;
$$;
