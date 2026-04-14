-- ============================================================
-- M9 Compliance APPCC + Etiquetado + Trazabilidad
-- Migration: 00023_m9_compliance.sql
-- ============================================================

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

CREATE TYPE appcc_category AS ENUM (
  'recepcion',
  'almacen',
  'preparacion',
  'coccion',
  'enfriamiento',
  'servicio',
  'limpieza'
);

CREATE TYPE appcc_record_status AS ENUM (
  'ok',
  'deviation',
  'corrected',
  'critical',
  'na'
);

CREATE TYPE label_type AS ENUM (
  'preparacion',
  'producto',
  'sobras',
  'congelado',
  'descongelado',
  'pasteurizado',
  'regenerado'
);

CREATE TYPE treatment_type AS ENUM (
  'none',
  'congelado',
  'descongelado',
  'pasteurizado',
  'regenerado'
);

CREATE TYPE label_origin AS ENUM (
  'produccion',
  'evento',
  'recepcion',
  'manual'
);

-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

-- 1. APPCC Templates
CREATE TABLE public.appcc_templates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID        NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  category          appcc_category NOT NULL,
  description       TEXT,
  control_point     TEXT        NOT NULL,
  critical_limit    TEXT        NOT NULL,
  corrective_action TEXT        NOT NULL,
  frequency         TEXT        NOT NULL DEFAULT 'daily',
  responsible_role  app_role    NOT NULL DEFAULT 'head_chef',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  is_default        BOOLEAN     NOT NULL DEFAULT false,
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appcc_templates_hotel ON public.appcc_templates(hotel_id);
CREATE INDEX idx_appcc_templates_category ON public.appcc_templates(hotel_id, category);

ALTER TABLE public.appcc_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appcc_templates_select" ON public.appcc_templates
  FOR SELECT USING (is_member_of(hotel_id));

CREATE POLICY "appcc_templates_insert" ON public.appcc_templates
  FOR INSERT WITH CHECK (get_member_role(hotel_id) IN ('superadmin','direction','admin','head_chef'));

CREATE POLICY "appcc_templates_update" ON public.appcc_templates
  FOR UPDATE USING (get_member_role(hotel_id) IN ('superadmin','direction','admin','head_chef'));

CREATE POLICY "appcc_templates_delete" ON public.appcc_templates
  FOR DELETE USING (get_member_role(hotel_id) IN ('superadmin','direction','admin'));

CREATE TRIGGER set_appcc_templates_updated_at
  BEFORE UPDATE ON public.appcc_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. APPCC Records
CREATE TABLE public.appcc_records (
  id                        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                  UUID              NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  template_id               UUID              NOT NULL REFERENCES public.appcc_templates(id),
  record_date               DATE              NOT NULL DEFAULT CURRENT_DATE,
  checked_at                TIMESTAMPTZ,
  checked_by                UUID              REFERENCES auth.users(id),
  status                    appcc_record_status NOT NULL DEFAULT 'ok',
  value_measured            TEXT,
  observations              TEXT,
  corrective_action_taken   TEXT,
  event_id                  UUID              REFERENCES public.events(id),
  created_at                TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_appcc_records_hotel_date ON public.appcc_records(hotel_id, record_date);
CREATE INDEX idx_appcc_records_template ON public.appcc_records(template_id);

ALTER TABLE public.appcc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appcc_records_select" ON public.appcc_records
  FOR SELECT USING (is_member_of(hotel_id));

CREATE POLICY "appcc_records_insert" ON public.appcc_records
  FOR INSERT WITH CHECK (is_member_of(hotel_id));

CREATE POLICY "appcc_records_update" ON public.appcc_records
  FOR UPDATE USING (is_member_of(hotel_id));

CREATE POLICY "appcc_records_delete" ON public.appcc_records
  FOR DELETE USING (get_member_role(hotel_id) IN ('superadmin','direction','admin','head_chef'));

CREATE TRIGGER set_appcc_records_updated_at
  BEFORE UPDATE ON public.appcc_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Temperature Logs
CREATE TABLE public.temperature_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID        NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  location        TEXT        NOT NULL,
  product_id      UUID        REFERENCES public.products(id),
  lot_id          UUID        REFERENCES public.stock_lots(id),
  temperature     NUMERIC(5,2) NOT NULL,
  unit            TEXT        NOT NULL DEFAULT '°C',
  min_allowed     NUMERIC(5,2),
  max_allowed     NUMERIC(5,2),
  is_within_range BOOLEAN,
  logged_by       UUID        REFERENCES auth.users(id),
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_temperature_logs_hotel ON public.temperature_logs(hotel_id);
CREATE INDEX idx_temperature_logs_location ON public.temperature_logs(hotel_id, location);
CREATE INDEX idx_temperature_logs_date ON public.temperature_logs(hotel_id, logged_at);

ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temperature_logs_select" ON public.temperature_logs
  FOR SELECT USING (is_member_of(hotel_id));

CREATE POLICY "temperature_logs_insert" ON public.temperature_logs
  FOR INSERT WITH CHECK (is_member_of(hotel_id));

CREATE POLICY "temperature_logs_delete" ON public.temperature_logs
  FOR DELETE USING (get_member_role(hotel_id) IN ('superadmin','direction','admin','head_chef'));

-- 4. Labels
CREATE TABLE public.labels (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID          NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  barcode       TEXT          NOT NULL UNIQUE,
  label_type    label_type    NOT NULL DEFAULT 'preparacion',
  product_id    UUID          REFERENCES public.products(id),
  recipe_id     UUID          REFERENCES public.recipes(id),
  name_free     TEXT,
  quantity      NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit          TEXT          NOT NULL DEFAULT 'kg',
  treatment     treatment_type NOT NULL DEFAULT 'none',
  elaborated_at TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ   NOT NULL,
  location      TEXT,
  origin        label_origin  NOT NULL DEFAULT 'manual',
  event_id      UUID          REFERENCES public.events(id),
  task_id       UUID          REFERENCES public.workflow_tasks(id),
  lot_id        UUID          REFERENCES public.stock_lots(id),
  allergens     TEXT[]        NOT NULL DEFAULT '{}',
  is_printed    BOOLEAN       NOT NULL DEFAULT false,
  printed_at    TIMESTAMPTZ,
  created_by    UUID          REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_labels_hotel ON public.labels(hotel_id);
CREATE INDEX idx_labels_barcode ON public.labels(barcode);
CREATE INDEX idx_labels_lot ON public.labels(lot_id);
CREATE INDEX idx_labels_expiry ON public.labels(hotel_id, expires_at);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels_select" ON public.labels
  FOR SELECT USING (is_member_of(hotel_id));

CREATE POLICY "labels_insert" ON public.labels
  FOR INSERT WITH CHECK (is_member_of(hotel_id));

CREATE POLICY "labels_update" ON public.labels
  FOR UPDATE USING (is_member_of(hotel_id));

CREATE POLICY "labels_delete" ON public.labels
  FOR DELETE USING (get_member_role(hotel_id) IN ('superadmin','direction','admin','head_chef'));

CREATE TRIGGER set_labels_updated_at
  BEFORE UPDATE ON public.labels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────

-- 1. create_appcc_record
CREATE OR REPLACE FUNCTION public.create_appcc_record(
  p_hotel_id                UUID,
  p_template_id             UUID,
  p_status                  appcc_record_status,
  p_value_measured          TEXT    DEFAULT NULL,
  p_observations            TEXT    DEFAULT NULL,
  p_corrective_action_taken TEXT    DEFAULT NULL,
  p_event_id                UUID    DEFAULT NULL,
  p_record_date             DATE    DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

  INSERT INTO public.appcc_records (
    hotel_id, template_id, status, value_measured,
    observations, corrective_action_taken, event_id,
    record_date, checked_at, checked_by
  ) VALUES (
    p_hotel_id, p_template_id, p_status, p_value_measured,
    p_observations, p_corrective_action_taken, p_event_id,
    p_record_date, now(), auth.uid()
  )
  ON CONFLICT (hotel_id, template_id, record_date)
  DO UPDATE SET
    status                  = EXCLUDED.status,
    value_measured          = EXCLUDED.value_measured,
    observations            = EXCLUDED.observations,
    corrective_action_taken = EXCLUDED.corrective_action_taken,
    checked_at              = now(),
    checked_by              = auth.uid(),
    updated_at              = now()
  RETURNING id INTO v_record_id;

  PERFORM emit_event(p_hotel_id, 'compliance.appcc_recorded', jsonb_build_object(
    'record_id', v_record_id,
    'template_id', p_template_id,
    'status', p_status
  ));

  RETURN v_record_id;
END;
$$;

-- Unique constraint for upsert
ALTER TABLE public.appcc_records
  ADD CONSTRAINT uq_appcc_record_template_date
  UNIQUE (hotel_id, template_id, record_date);

-- 2. log_temperature
CREATE OR REPLACE FUNCTION public.log_temperature(
  p_hotel_id   UUID,
  p_location   TEXT,
  p_temperature NUMERIC,
  p_min_allowed NUMERIC  DEFAULT NULL,
  p_max_allowed NUMERIC  DEFAULT NULL,
  p_product_id  UUID     DEFAULT NULL,
  p_lot_id      UUID     DEFAULT NULL,
  p_notes       TEXT     DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id        UUID;
  v_within_range  BOOLEAN;
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

  -- Determine if within range (only if limits provided)
  IF p_min_allowed IS NOT NULL AND p_max_allowed IS NOT NULL THEN
    v_within_range := p_temperature BETWEEN p_min_allowed AND p_max_allowed;
  ELSIF p_min_allowed IS NOT NULL THEN
    v_within_range := p_temperature >= p_min_allowed;
  ELSIF p_max_allowed IS NOT NULL THEN
    v_within_range := p_temperature <= p_max_allowed;
  ELSE
    v_within_range := NULL;
  END IF;

  INSERT INTO public.temperature_logs (
    hotel_id, location, product_id, lot_id, temperature,
    min_allowed, max_allowed, is_within_range,
    logged_by, notes
  ) VALUES (
    p_hotel_id, p_location, p_product_id, p_lot_id, p_temperature,
    p_min_allowed, p_max_allowed, v_within_range,
    auth.uid(), p_notes
  )
  RETURNING id INTO v_log_id;

  -- Generate alert if out of range
  IF v_within_range = FALSE THEN
    PERFORM emit_event(p_hotel_id, 'compliance.temperature_alert', jsonb_build_object(
      'log_id', v_log_id,
      'location', p_location,
      'temperature', p_temperature,
      'min_allowed', p_min_allowed,
      'max_allowed', p_max_allowed
    ));
  END IF;

  RETURN v_log_id;
END;
$$;

-- 3. create_label
CREATE OR REPLACE FUNCTION public.create_label(
  p_hotel_id    UUID,
  p_label_type  label_type,
  p_expires_at  TIMESTAMPTZ,
  p_quantity    NUMERIC       DEFAULT 1,
  p_unit        TEXT          DEFAULT 'kg',
  p_treatment   treatment_type DEFAULT 'none',
  p_product_id  UUID          DEFAULT NULL,
  p_recipe_id   UUID          DEFAULT NULL,
  p_name_free   TEXT          DEFAULT NULL,
  p_elaborated_at TIMESTAMPTZ DEFAULT NULL,
  p_opened_at   TIMESTAMPTZ   DEFAULT NULL,
  p_location    TEXT          DEFAULT NULL,
  p_origin      label_origin  DEFAULT 'manual',
  p_event_id    UUID          DEFAULT NULL,
  p_task_id     UUID          DEFAULT NULL,
  p_lot_id      UUID          DEFAULT NULL,
  p_allergens   TEXT[]        DEFAULT '{}'
)
RETURNS TABLE(label_id UUID, barcode TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label_id UUID;
  v_barcode  TEXT;
  v_name     TEXT;
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

  -- Generate unique barcode: prefix + short UUID segment
  v_barcode := 'CHF-' || upper(replace(gen_random_uuid()::TEXT, '-', ''));
  v_barcode := left(v_barcode, 20);

  -- Resolve name from product or recipe if not provided
  IF p_name_free IS NULL THEN
    IF p_product_id IS NOT NULL THEN
      SELECT name INTO v_name FROM public.products WHERE id = p_product_id;
    ELSIF p_recipe_id IS NOT NULL THEN
      SELECT name INTO v_name FROM public.recipes WHERE id = p_recipe_id;
    END IF;
  ELSE
    v_name := p_name_free;
  END IF;

  INSERT INTO public.labels (
    hotel_id, barcode, label_type, product_id, recipe_id, name_free,
    quantity, unit, treatment, elaborated_at, opened_at, expires_at,
    location, origin, event_id, task_id, lot_id, allergens, created_by
  ) VALUES (
    p_hotel_id, v_barcode, p_label_type, p_product_id, p_recipe_id, v_name,
    p_quantity, p_unit, p_treatment,
    COALESCE(p_elaborated_at, now()), p_opened_at, p_expires_at,
    p_location, p_origin, p_event_id, p_task_id, p_lot_id, p_allergens, auth.uid()
  )
  RETURNING id INTO v_label_id;

  RETURN QUERY SELECT v_label_id, v_barcode;
END;
$$;

-- 4. print_label
CREATE OR REPLACE FUNCTION public.print_label(
  p_label_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id UUID;
BEGIN
  SELECT hotel_id INTO v_hotel_id FROM public.labels WHERE id = p_label_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Label not found'; END IF;
  PERFORM check_membership(auth.uid(), v_hotel_id);

  UPDATE public.labels
  SET is_printed = true, printed_at = now()
  WHERE id = p_label_id;
END;
$$;

-- 5. get_appcc_records
CREATE OR REPLACE FUNCTION public.get_appcc_records(
  p_hotel_id  UUID,
  p_date      DATE    DEFAULT CURRENT_DATE,
  p_category  appcc_category DEFAULT NULL
)
RETURNS TABLE (
  record_id                 UUID,
  template_id               UUID,
  template_name             TEXT,
  category                  appcc_category,
  control_point             TEXT,
  critical_limit            TEXT,
  corrective_action         TEXT,
  frequency                 TEXT,
  sort_order                INTEGER,
  status                    appcc_record_status,
  value_measured            TEXT,
  observations              TEXT,
  corrective_action_taken   TEXT,
  checked_at                TIMESTAMPTZ,
  checked_by                UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

  RETURN QUERY
  SELECT
    r.id,
    t.id,
    t.name,
    t.category,
    t.control_point,
    t.critical_limit,
    t.corrective_action,
    t.frequency,
    t.sort_order,
    r.status,
    r.value_measured,
    r.observations,
    r.corrective_action_taken,
    r.checked_at,
    r.checked_by
  FROM public.appcc_templates t
  LEFT JOIN public.appcc_records r
    ON r.template_id = t.id
    AND r.record_date = p_date
    AND r.hotel_id = p_hotel_id
  WHERE t.hotel_id = p_hotel_id
    AND t.is_active = true
    AND (p_category IS NULL OR t.category = p_category)
  ORDER BY t.category, t.sort_order, t.name;
END;
$$;

-- 6. get_temperature_logs
CREATE OR REPLACE FUNCTION public.get_temperature_logs(
  p_hotel_id UUID,
  p_location TEXT    DEFAULT NULL,
  p_from     TIMESTAMPTZ DEFAULT (now() - INTERVAL '24 hours'),
  p_to       TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  id              UUID,
  location        TEXT,
  product_name    TEXT,
  temperature     NUMERIC,
  unit            TEXT,
  min_allowed     NUMERIC,
  max_allowed     NUMERIC,
  is_within_range BOOLEAN,
  logged_at       TIMESTAMPTZ,
  notes           TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

  RETURN QUERY
  SELECT
    tl.id,
    tl.location,
    p.name,
    tl.temperature,
    tl.unit,
    tl.min_allowed,
    tl.max_allowed,
    tl.is_within_range,
    tl.logged_at,
    tl.notes
  FROM public.temperature_logs tl
  LEFT JOIN public.products p ON p.id = tl.product_id
  WHERE tl.hotel_id = p_hotel_id
    AND tl.logged_at BETWEEN p_from AND p_to
    AND (p_location IS NULL OR tl.location = p_location)
  ORDER BY tl.logged_at DESC;
END;
$$;

-- 7. get_labels
CREATE OR REPLACE FUNCTION public.get_labels(
  p_hotel_id  UUID,
  p_from      DATE DEFAULT (CURRENT_DATE - 7),
  p_to        DATE DEFAULT CURRENT_DATE,
  p_type      label_type DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  barcode       TEXT,
  label_type    label_type,
  display_name  TEXT,
  quantity      NUMERIC,
  unit          TEXT,
  treatment     treatment_type,
  elaborated_at TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  location      TEXT,
  origin        label_origin,
  is_printed    BOOLEAN,
  printed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ,
  hours_to_expiry NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

  RETURN QUERY
  SELECT
    l.id,
    l.barcode,
    l.label_type,
    COALESCE(l.name_free, p.name, r.name, 'Sin nombre') AS display_name,
    l.quantity,
    l.unit,
    l.treatment,
    l.elaborated_at,
    l.expires_at,
    l.location,
    l.origin,
    l.is_printed,
    l.printed_at,
    l.created_at,
    ROUND(EXTRACT(EPOCH FROM (l.expires_at - now())) / 3600, 1) AS hours_to_expiry
  FROM public.labels l
  LEFT JOIN public.products p ON p.id = l.product_id
  LEFT JOIN public.recipes r ON r.id = l.recipe_id
  WHERE l.hotel_id = p_hotel_id
    AND l.created_at::DATE BETWEEN p_from AND p_to
    AND (p_type IS NULL OR l.label_type = p_type)
  ORDER BY l.created_at DESC;
END;
$$;

-- 8. trace_lot — recall completo de un lote
CREATE OR REPLACE FUNCTION public.trace_lot(
  p_lot_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id UUID;
  v_result   JSONB;
BEGIN
  SELECT hotel_id INTO v_hotel_id FROM public.stock_lots WHERE id = p_lot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lot not found'; END IF;
  PERFORM check_membership(auth.uid(), v_hotel_id);

  SELECT jsonb_build_object(
    'lot', (
      SELECT jsonb_build_object(
        'id',           sl.id,
        'product_id',   sl.product_id,
        'product_name', p.name,
        'category',     pc.name,
        'quantity',     sl.quantity,
        'unit',         sl.unit,
        'unit_cost',    sl.unit_cost,
        'expiry_date',  sl.expiry_date,
        'location',     sl.location,
        'created_at',   sl.created_at
      )
      FROM public.stock_lots sl
      JOIN public.products p ON p.id = sl.product_id
      LEFT JOIN public.product_categories pc ON pc.id = p.category_id
      WHERE sl.id = p_lot_id
    ),
    'movements', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',           sm.id,
        'type',         sm.movement_type,
        'quantity',     sm.quantity,
        'notes',        sm.notes,
        'created_at',   sm.created_at
      ) ORDER BY sm.created_at), '[]'::jsonb)
      FROM public.stock_movements sm
      WHERE sm.lot_id = p_lot_id
    ),
    'reservations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',           sr.id,
        'event_id',     sr.event_id,
        'event_name',   e.name,
        'qty_reserved', sr.qty_reserved,
        'qty_consumed', sr.qty_consumed,
        'status',       sr.status,
        'created_at',   sr.created_at
      ) ORDER BY sr.created_at), '[]'::jsonb)
      FROM public.stock_reservations sr
      LEFT JOIN public.events e ON e.id = sr.event_id
      WHERE sr.lot_id = p_lot_id
    ),
    'labels', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',           lb.id,
        'barcode',      lb.barcode,
        'label_type',   lb.label_type,
        'display_name', COALESCE(lb.name_free, pr.name, rc.name),
        'quantity',     lb.quantity,
        'unit',         lb.unit,
        'expires_at',   lb.expires_at,
        'is_printed',   lb.is_printed,
        'created_at',   lb.created_at
      ) ORDER BY lb.created_at), '[]'::jsonb)
      FROM public.labels lb
      LEFT JOIN public.products pr ON pr.id = lb.product_id
      LEFT JOIN public.recipes rc ON rc.id = lb.recipe_id
      WHERE lb.lot_id = p_lot_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 9. seed_appcc_defaults — 20 plantillas APPCC estándar hostelería
CREATE OR REPLACE FUNCTION public.seed_appcc_defaults(
  p_hotel_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing defaults for this hotel before re-seeding
  DELETE FROM public.appcc_templates
  WHERE hotel_id = p_hotel_id AND is_default = true;

  INSERT INTO public.appcc_templates
    (hotel_id, name, category, control_point, critical_limit, corrective_action, frequency, responsible_role, is_default, sort_order)
  VALUES
  -- RECEPCIÓN DE MERCANCÍAS (4)
  (p_hotel_id, 'Temperatura recepción refrigerados',  'recepcion', 'Temperatura en recepción de productos refrigerados', '≤ 5 °C', 'Rechazar partida o anotar desviación. Notificar al proveedor.', 'each_reception', 'head_chef',   true, 10),
  (p_hotel_id, 'Temperatura recepción congelados',    'recepcion', 'Temperatura en recepción de productos congelados',   '≤ -18 °C', 'Rechazar partida. Verificar cadena de frío con proveedor.', 'each_reception', 'head_chef',   true, 20),
  (p_hotel_id, 'Verificación etiquetado y caducidad', 'recepcion', 'Etiquetado correcto, fecha de caducidad válida y trazabilidad', 'Sin productos caducados. Etiquetado completo.', 'Rechazar producto caducado. Anotar lote y proveedor.', 'each_reception', 'head_chef',   true, 30),
  (p_hotel_id, 'Estado de embalajes',                 'recepcion', 'Integridad de envases y embalajes de productos recibidos', 'Sin roturas, humedad ni signos de contaminación', 'Rechazar productos con embalaje dañado. Notificar al proveedor.', 'each_reception', 'head_chef',   true, 40),

  -- ALMACENAMIENTO (5)
  (p_hotel_id, 'Temperatura cámara refrigeración',    'almacen',   'Temperatura interior de cámara frigorífica', '0 °C – 5 °C', 'Verificar equipo. Trasladar productos si supera 8 °C más de 1h. Llamar al servicio técnico.', 'twice_daily', 'head_chef',   true, 10),
  (p_hotel_id, 'Temperatura congelador/abatidor',     'almacen',   'Temperatura interior de congelador', '≤ -18 °C', 'Verificar equipo. Si supera -15 °C trasladar urgentemente. Llamar al servicio técnico.', 'twice_daily', 'head_chef',   true, 20),
  (p_hotel_id, 'Temperatura almacén seco',            'almacen',   'Temperatura del almacén de secos', '15 °C – 20 °C', 'Ventilar el espacio. Revisar climatización.', 'daily', 'head_chef',   true, 30),
  (p_hotel_id, 'Rotación FIFO',                       'almacen',   'Los productos más antiguos se colocan delante y se consumen primero', 'Ningún producto caducado en cámara. Fecha de entrada visible.', 'Reordenar estanterías. Retirar productos caducados.', 'daily', 'head_chef',   true, 40),
  (p_hotel_id, 'Separación crudos/cocinados',         'almacen',   'Productos crudos almacenados siempre por debajo de los cocinados', 'Separación física completa. Sin contacto cruzado.', 'Reorganizar cámara. Etiquetar niveles correctamente.', 'daily', 'head_chef',   true, 50),

  -- PREPARACIÓN (4)
  (p_hotel_id, 'Temperatura descongelación',          'preparacion', 'Descongelación de productos en refrigeración (nunca a temperatura ambiente)', '≤ 5 °C en nevera', 'Desechar si se descongeló a temperatura ambiente sin control. Anotar incidencia.', 'each_use',   'head_chef',   true, 10),
  (p_hotel_id, 'Higiene personal y lavado de manos',  'preparacion', 'Personal con uniforme limpio, lavado de manos antes de manipular alimentos', 'Sin joyas. Uniforme íntegro. Manos lavadas ≥ 20 segundos.', 'Readiestrar al personal. Registrar incidencia.', 'each_service', 'head_chef',  true, 20),
  (p_hotel_id, 'Temperatura superficies de trabajo',  'preparacion', 'Temperatura de mesas y superficies de preparación', '< 10 °C para elaboraciones frías', 'Enfriar superficie con hielo. No iniciar elaboración hasta temperatura correcta.', 'each_service', 'head_chef',  true, 30),
  (p_hotel_id, 'Tiempo exposición preparaciones',     'preparacion', 'Tiempo que preparaciones permanecen entre 5 °C y 65 °C (zona de peligro)', '< 2 horas acumuladas', 'Descartar preparación si supera 2h en zona de peligro. Anotar causa.', 'each_service', 'head_chef',  true, 40),

  -- COCCIÓN (3)
  (p_hotel_id, 'Temperatura cocción',                 'coccion',   'Temperatura en el centro del alimento tras cocción', '≥ 70 °C durante ≥ 2 minutos', 'Continuar cocción hasta alcanzar temperatura. Si no es posible, descartar.', 'each_batch', 'head_chef',   true, 10),
  (p_hotel_id, 'Temperatura regeneración',            'coccion',   'Temperatura en el centro del alimento en proceso de regeneración', '≥ 75 °C en ≤ 2 horas', 'Descartar si no alcanza temperatura en el tiempo indicado. Revisar equipo.', 'each_batch', 'head_chef',   true, 20),
  (p_hotel_id, 'Verificación organoléptica',          'coccion',   'Aspecto, olor y textura correctos tras cocción', 'Sin olores anómalos, colores extraños ni texturas inadecuadas', 'Descartar elaboración. Investigar causa. Anotar lote de ingredientes.', 'each_batch', 'head_chef',   true, 30),

  -- ENFRIAMIENTO (2)
  (p_hotel_id, 'Temperatura abatimiento',             'enfriamiento', 'Descenso de temperatura en abatidor desde >65 °C hasta <10 °C', 'De >65 °C a <10 °C en ≤ 2 horas', 'Descartar si el tiempo supera 2h. Revisar abatidor. Llamar al servicio técnico.', 'each_batch', 'head_chef', true, 10),
  (p_hotel_id, 'Temperatura conservación cocinados',  'enfriamiento', 'Temperatura de productos cocinados en refrigeración', '≤ 5 °C', 'Revisar y ajustar temperatura de cámara. Si supera 8 °C más de 1h, descartar.', 'twice_daily', 'head_chef',  true, 20),

  -- SERVICIO (2)
  (p_hotel_id, 'Temperatura servicio caliente',       'servicio',  'Temperatura de platos calientes en línea de pase o buffet', '≥ 65 °C', 'Retirar y regenerar si baja de 65 °C. Ajustar equipos de mantenimiento en caliente.', 'each_service', 'head_chef', true, 10),
  (p_hotel_id, 'Temperatura buffet frío',             'servicio',  'Temperatura de expositores y vitrinas de buffet frío', '≤ 5 °C', 'Reducir exposición. Reponer con producto frío. Revisar equipo de frío.', 'each_service', 'head_chef', true, 20);
END;
$$;

-- ─────────────────────────────────────────
-- SEED test hotel defaults
-- ─────────────────────────────────────────
SELECT public.seed_appcc_defaults('ec079cf6-13b1-4be5-9e6f-62c8f604cb1e');
