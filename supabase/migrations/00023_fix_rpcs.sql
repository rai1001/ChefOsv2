-- Fix check_membership calls in M9 RPCs

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

CREATE OR REPLACE FUNCTION public.log_temperature(
  p_hotel_id    UUID,
  p_location    TEXT,
  p_temperature NUMERIC,
  p_min_allowed NUMERIC     DEFAULT NULL,
  p_max_allowed NUMERIC     DEFAULT NULL,
  p_product_id  UUID        DEFAULT NULL,
  p_lot_id      UUID        DEFAULT NULL,
  p_notes       TEXT        DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id       UUID;
  v_within_range BOOLEAN;
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

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
    min_allowed, max_allowed, is_within_range, logged_by, notes
  ) VALUES (
    p_hotel_id, p_location, p_product_id, p_lot_id, p_temperature,
    p_min_allowed, p_max_allowed, v_within_range, auth.uid(), p_notes
  )
  RETURNING id INTO v_log_id;

  IF v_within_range = FALSE THEN
    PERFORM emit_event(p_hotel_id, 'compliance.temperature_alert', jsonb_build_object(
      'log_id', v_log_id, 'location', p_location, 'temperature', p_temperature
    ));
  END IF;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_label(
  p_hotel_id      UUID,
  p_label_type    label_type,
  p_expires_at    TIMESTAMPTZ,
  p_quantity      NUMERIC        DEFAULT 1,
  p_unit          TEXT           DEFAULT 'kg',
  p_treatment     treatment_type DEFAULT 'none',
  p_product_id    UUID           DEFAULT NULL,
  p_recipe_id     UUID           DEFAULT NULL,
  p_name_free     TEXT           DEFAULT NULL,
  p_elaborated_at TIMESTAMPTZ    DEFAULT NULL,
  p_opened_at     TIMESTAMPTZ    DEFAULT NULL,
  p_location      TEXT           DEFAULT NULL,
  p_origin        label_origin   DEFAULT 'manual',
  p_event_id      UUID           DEFAULT NULL,
  p_task_id       UUID           DEFAULT NULL,
  p_lot_id        UUID           DEFAULT NULL,
  p_allergens     TEXT[]         DEFAULT '{}'
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

  v_barcode := left('CHF-' || upper(replace(gen_random_uuid()::TEXT, '-', '')), 20);

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

CREATE OR REPLACE FUNCTION public.print_label(p_label_id UUID)
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
  UPDATE public.labels SET is_printed = true, printed_at = now() WHERE id = p_label_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_appcc_records(
  p_hotel_id UUID,
  p_date     DATE           DEFAULT CURRENT_DATE,
  p_category appcc_category DEFAULT NULL
)
RETURNS TABLE (
  record_id               UUID,
  template_id             UUID,
  template_name           TEXT,
  category                appcc_category,
  control_point           TEXT,
  critical_limit          TEXT,
  corrective_action       TEXT,
  frequency               TEXT,
  sort_order              INTEGER,
  status                  appcc_record_status,
  value_measured          TEXT,
  observations            TEXT,
  corrective_action_taken TEXT,
  checked_at              TIMESTAMPTZ,
  checked_by              UUID
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

CREATE OR REPLACE FUNCTION public.get_temperature_logs(
  p_hotel_id UUID,
  p_location TEXT        DEFAULT NULL,
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
  SELECT tl.id, tl.location, p.name, tl.temperature, tl.unit,
    tl.min_allowed, tl.max_allowed, tl.is_within_range, tl.logged_at, tl.notes
  FROM public.temperature_logs tl
  LEFT JOIN public.products p ON p.id = tl.product_id
  WHERE tl.hotel_id = p_hotel_id
    AND tl.logged_at BETWEEN p_from AND p_to
    AND (p_location IS NULL OR tl.location = p_location)
  ORDER BY tl.logged_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_labels(
  p_hotel_id UUID,
  p_from     DATE       DEFAULT (CURRENT_DATE - 7),
  p_to       DATE       DEFAULT CURRENT_DATE,
  p_type     label_type DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  barcode         TEXT,
  label_type      label_type,
  display_name    TEXT,
  quantity        NUMERIC,
  unit            TEXT,
  treatment       treatment_type,
  elaborated_at   TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  location        TEXT,
  origin          label_origin,
  is_printed      BOOLEAN,
  printed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ,
  hours_to_expiry NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_membership(auth.uid(), p_hotel_id);

  RETURN QUERY
  SELECT l.id, l.barcode, l.label_type,
    COALESCE(l.name_free, p.name, r.name, 'Sin nombre'),
    l.quantity, l.unit, l.treatment, l.elaborated_at, l.expires_at,
    l.location, l.origin, l.is_printed, l.printed_at, l.created_at,
    ROUND(EXTRACT(EPOCH FROM (l.expires_at - now())) / 3600, 1)
  FROM public.labels l
  LEFT JOIN public.products p ON p.id = l.product_id
  LEFT JOIN public.recipes r ON r.id = l.recipe_id
  WHERE l.hotel_id = p_hotel_id
    AND l.created_at::DATE BETWEEN p_from AND p_to
    AND (p_type IS NULL OR l.label_type = p_type)
  ORDER BY l.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.trace_lot(p_lot_id UUID)
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
        'id', sl.id, 'product_id', sl.product_id, 'product_name', p.name,
        'category', pc.name, 'quantity', sl.quantity, 'unit', sl.unit,
        'unit_cost', sl.unit_cost, 'expiry_date', sl.expiry_date,
        'location', sl.location, 'created_at', sl.created_at
      )
      FROM public.stock_lots sl
      JOIN public.products p ON p.id = sl.product_id
      LEFT JOIN public.product_categories pc ON pc.id = p.category_id
      WHERE sl.id = p_lot_id
    ),
    'movements', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sm.id, 'type', sm.movement_type, 'quantity', sm.quantity,
        'notes', sm.notes, 'created_at', sm.created_at
      ) ORDER BY sm.created_at), '[]'::jsonb)
      FROM public.stock_movements sm WHERE sm.lot_id = p_lot_id
    ),
    'reservations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sr.id, 'event_id', sr.event_id, 'event_name', e.name,
        'qty_reserved', sr.qty_reserved, 'qty_consumed', sr.qty_consumed,
        'status', sr.status, 'created_at', sr.created_at
      ) ORDER BY sr.created_at), '[]'::jsonb)
      FROM public.stock_reservations sr
      LEFT JOIN public.events e ON e.id = sr.event_id
      WHERE sr.lot_id = p_lot_id
    ),
    'labels', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', lb.id, 'barcode', lb.barcode, 'label_type', lb.label_type,
        'display_name', COALESCE(lb.name_free, pr.name, rc.name),
        'quantity', lb.quantity, 'unit', lb.unit,
        'expires_at', lb.expires_at, 'is_printed', lb.is_printed,
        'created_at', lb.created_at
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
