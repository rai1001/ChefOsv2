# ChefOS v2 — Product Requirements Document

> **Control operativo de cocina multi-servicio para hoteles, catering y eventos**

| Campo | Valor |
|---|---|
| Producto | ChefOS v2 |
| Versión PRD | 1.0 |
| Fecha | 2026-04-14 |
| Autor | Israel (Head Chef + Founder) |
| Estado | En definicion |

---

## 1. Vision y posicionamiento

### 1.1 Problema

En cocina hotelera multi-servicio (buffet desayuno, banquetes, room service, restaurante interno, catering externo), **no existe un producto ligero que unifique**:

- Planificacion de produccion por partida desde eventos y ocupacion
- BOH completo (recetas, escandallos, compras, inventario FIFO)
- Compliance operativo (APPCC, trazabilidad, etiquetado)
- Conexion nativa con PMS/POS hotelero

Los competidores cubren fragmentos:
- **Apicbase/Adaco**: BOH potente pero enterprise pesado (implantacion larga, pricing alto)
- **Caterease/FoodStorm**: Eventos pero sin BOH profundo (sin FIFO, sin compras centralizadas)
- **Supy/MarketMan**: BOH restaurante, no hotel multi-servicio
- **Andy**: Compliance APPCC pero sin recetas/compras/produccion
- **Mews/OPERA**: PMS sin cocina
- **GastroChain OS**: Restaurante single-location, no hotel enterprise

### 1.2 Solucion

ChefOS es el **sistema operativo de cocina** que convierte automaticamente:

```
Ocupacion PMS + Banquetes confirmados + Historico de consumo
    |
    v
Plan de produccion por partida + Compras consolidadas + 
Mise en place + APPCC integrado + Coste real vs teorico
```

### 1.3 Propuesta de valor

> "Todo lo que pasa entre que un evento se confirma y el ultimo plato sale de cocina — controlado, costado y trazado."

### 1.4 Publico objetivo (ICP)

| Segmento | Perfil |
|---|---|
| **Primario** | Hotel 3-5* en Espana con buffet desayuno + banquetes (bodas/empresa), 1-3 cocinas |
| **Secundario** | Empresas de catering mediano (50-500 pax/evento) |
| **Terciario** | Colectividades (hospitales, colegios) con cocina central + distribuidores |

**Usuarios principales:**
- Chef ejecutivo / Head chef (decisor tecnico)
- Jefe de economato / Compras
- Sous chefs / Jefes de partida
- Direccion (KPIs, food cost)
- Comercial (eventos, BEO)

### 1.5 Diferenciadores competitivos

1. **Multi-servicio nativo**: buffet, banquete, room service, restaurante, catering — en una sola cocina
2. **Produccion por partida**: no es "inventario generico", es el flujo real del chef
3. **Evento → Produccion → Compras**: flujo automatico end-to-end
4. **APPCC integrado**: compliance que nace de la receta/produccion, no separado
5. **Ligero para hotel mediano**: no necesitas 6 meses de implantacion ni consultor
6. **Coste real por servicio y evento**: saber el food cost del buffet desayuno HOY, no a fin de mes
7. **Expertise real de chef hotelero**: construido por quien ha vivido el problema

---

## 2. Arquitectura tecnica

### 2.1 Stack

| Componente | Tecnologia |
|---|---|
| Frontend | Next.js 16+ (App Router), React 19, TypeScript 5 strict |
| Styling | Tailwind CSS 4, shadcn/ui |
| State | TanStack Query 5 |
| Forms | React Hook Form + Zod v4 |
| Backend | Supabase (PostgreSQL 17, Auth, RLS, RPCs, Storage, Edge Functions) |
| Charts | Recharts |
| Tests | Vitest (unit), Playwright (E2E) |
| Deploy | Vercel (frontend) + Supabase Cloud (backend) |

### 2.2 Principios arquitectonicos

1. **Database-first logic**: reglas de negocio criticas en RPCs PostgreSQL (security definer)
2. **Multi-tenant via RLS**: `hotel_id` como FK en toda tabla operativa, aislamiento por Row Level Security
3. **State machines en DB**: transiciones validadas en RPCs, no en frontend
4. **Domain events**: toda mutacion emite evento para automatizacion
5. **Audit trail inmutable**: `audit_logs` en toda operacion
6. **Feature modules**: cada modulo posee components, hooks, schemas, services, types, utils
7. **Offline-capable**: service workers + cache para operaciones criticas de cocina

### 2.3 Multi-tenancy

```
Tenant (empresa)
  └── Hotel / Centro (unidad operativa)
       ├── Cocinas (central, fria, pasteleria...)
       ├── Almacenes (camara, seco, congelador...)
       ├── Servicios (buffet, banquete, room service, restaurante, catering)
       └── Memberships (user + role + hotel)
```

Jerarquia: `tenant_id → hotel_id → membership (user_id + role)`
RLS anchor: `hotel_id` validado contra `memberships.user_id = auth.uid()`

---

## 3. Modulos

### Fase MVP (3 meses) — Objetivo: 1 piloto pagable

---

#### D0. Identidad y seguridad

**Objetivo**: Multi-tenancy, autenticacion, RBAC, auditoria.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `tenants` | id, name, created_at |
| `hotels` | id, tenant_id, name, slug, timezone, currency, is_active |
| `profiles` | id (auth.users), full_name, phone, avatar_url |
| `memberships` | id, user_id, hotel_id, tenant_id, role, is_active, is_default |
| `audit_logs` | id, hotel_id, user_id, action, entity_type, entity_id, old_values, new_values |
| `domain_events` | id, aggregate_type, aggregate_id, event_type, payload, version |

**Roles y permisos:**

| Rol | Descripcion |
|---|---|
| `superadmin` | Administrador del sistema |
| `direction` | Director de hotel |
| `admin` | Administrador de hotel |
| `head_chef` | Jefe de cocina |
| `sous_chef` | Sous chef |
| `cook` | Cocinero |
| `commercial` | Comercial / Eventos |
| `procurement` | Jefe de compras / Economato |
| `warehouse` | Almacen |
| `room` | Servicio de sala |
| `reception` | Recepcion |
| `operations` | Coordinador de operaciones |
| `maintenance` | Mantenimiento |

**Matriz de permisos:**

| Permiso | Roles |
|---|---|
| `hotel.manage` | superadmin, direction, admin |
| `team.manage` | superadmin, direction, admin |
| `event.create` | commercial, direction, admin |
| `event.confirm` | commercial, direction, admin |
| `event.cancel` | direction, admin |
| `recipe.create` | head_chef, sous_chef, cook, direction, admin |
| `recipe.approve` | head_chef, direction |
| `catalog.manage` | procurement, head_chef, direction, admin |
| `procurement.create` | procurement, head_chef, direction, admin |
| `procurement.approve` | direction, admin |
| `inventory.manage` | procurement, warehouse, head_chef, direction, admin |
| `inventory.adjust` | direction, admin |
| `inventory.audit` | direction, admin |
| `production.manage` | head_chef, sous_chef, direction |
| `production.execute` | head_chef, sous_chef, cook |
| `compliance.manage` | head_chef, direction, admin |
| `compliance.execute` | head_chef, sous_chef, cook, warehouse |
| `task.manage` | head_chef, sous_chef, room, reception, direction, admin |
| `dashboard.view` | direction, admin, superadmin |
| `reports.view` | direction, admin, head_chef |
| `integration.manage` | direction, admin |

**RPCs:**
1. `get_active_hotel(p_user_id)` → hotel activo con timezone y currency
2. `switch_active_hotel(p_user_id, p_hotel_id)` → cambia hotel por defecto
3. `create_hotel(p_tenant_id, p_name, p_slug, p_timezone, p_currency)` → hotel + membership admin
4. `invite_member(p_hotel_id, p_email, p_role)` → membership
5. `update_member_role(p_hotel_id, p_target_user_id, p_new_role)` → membership
6. `deactivate_member(p_hotel_id, p_target_user_id)` → soft delete

**UI:**
- Login / Signup / Forgot password / Callback
- Hotel switcher en topbar
- Settings: hotel config, team management

---

#### M1. Comercial — Eventos, Clientes, BEO

**Objetivo**: Ciclo de vida completo de eventos desde lead hasta cierre operativo. BEO (Banquet Event Order) como documento central.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `clients` | id, hotel_id, name, company, contact_person, email, phone, tax_id, vip_level, lifetime_value, notes |
| `events` | id, hotel_id, client_id, name, event_type, service_type (buffet/seated/cocktail/mixed), event_date, start_time, end_time, guest_count, venue, setup_time, teardown_time, status, notes, beo_number |
| `event_versions` | id, event_id, version_number, data (jsonb), changed_by, change_reason |
| `event_menus` | id, event_id, menu_id, sort_order, servings_override |
| `event_spaces` | id, event_id, space_name, setup_type, capacity, notes |
| `event_operational_impact` | id, event_id, product_id, quantity_needed, department |

**Estado del evento:**
```
draft → pending_confirmation → confirmed → in_preparation → in_operation → completed
                                                                              |
                              any non-terminal → cancelled ──────────────── archived
```

Transiciones clave:
- `confirm_event`: requiere >= 1 menu asignado; emite `event.confirmed`; genera workflow de produccion
- `start_preparation`: confirmed → in_preparation; activa mise en place
- `start_operation`: in_preparation → in_operation
- `complete_event`: in_operation → completed; calcula coste real

**Tipos de evento:**
- Banquete (boda, corporativo, gala)
- Buffet (desayuno, almuerzo, cena)
- Coffee break
- Cocktail
- Room service (pedido individual)
- Catering externo
- Servicio regular de restaurante

**Tipos de servicio:**
- `buffet`: servicio libre, calculo por pax con ratio desperdicio
- `seated`: emplatado, calculo exacto por racion
- `cocktail`: piezas por persona
- `mixed`: combinacion

**BEO (Banquet Event Order):**
- Documento auto-generado con: datos evento, menus, espacios, setup, timeline, requerimientos especiales
- Versionado: cada cambio genera nueva version del BEO
- Distribuible a todos los departamentos implicados

**RPCs:**
1. `create_event(...)` → evento en draft
2. `update_event(...)` → actualiza + crea version snapshot
3. `confirm_event(p_hotel_id, p_event_id)` → valida menus, emite domain event
4. `cancel_event(p_hotel_id, p_event_id, p_reason)` → cancela con razon
5. `start_event_preparation(p_hotel_id, p_event_id)` → activa mise en place
6. `start_event_operation(p_hotel_id, p_event_id)` → en operacion
7. `complete_event(p_hotel_id, p_event_id)` → completado + calculo coste real
8. `get_events_calendar(p_hotel_id, p_from, p_to)` → calendario
9. `get_event_beo(p_hotel_id, p_event_id)` → BEO completo
10. `calculate_event_cost_estimate(p_hotel_id, p_event_id)` → estimacion pre-evento

**UI:**
- Lista de eventos con calendario (vista dia/semana/mes)
- Formulario de creacion con wizard (datos → menus → espacios → revision)
- Detalle de evento con timeline, menus, BEO, workflow
- Vista de cliente con historial de eventos y LTV

---

#### M2. Recetas y escandallos

**Objetivo**: Gestion completa de recetas con costeo dinamico, alergenoss, fichas tecnicas, y aprobacion por head chef.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `recipes` | id, hotel_id, name, description, category, subcategory, servings, yield_qty, yield_unit_id, prep_time_min, cook_time_min, rest_time_min, difficulty, status, total_cost, cost_per_serving, food_cost_pct, target_price, allergens (jsonb), dietary_tags (jsonb), notes |
| `recipe_versions` | id, recipe_id, version_number, data (jsonb), changed_by, change_reason |
| `recipe_ingredients` | id, recipe_id, hotel_id, product_id, unit_id, quantity_gross, waste_pct, quantity_net (calculated), sort_order, preparation_notes |
| `recipe_steps` | id, recipe_id, hotel_id, step_number, instruction, duration_min, temperature, equipment, notes |
| `recipe_sub_recipes` | id, recipe_id, sub_recipe_id, quantity, unit_id |
| `menus` | id, hotel_id, name, description, menu_type (buffet/seated/cocktail/tasting/daily), is_template, target_food_cost_pct, total_cost, notes |
| `menu_sections` | id, menu_id, hotel_id, name, sort_order |
| `menu_section_recipes` | id, section_id, hotel_id, recipe_id, servings_override, price |

**Estado de la receta:**
```
draft → review_pending → approved → deprecated → archived
```

- `submit_for_review`: requiere >= 1 ingrediente
- `approve_recipe`: solo head_chef/direction; emite `recipe.approved`
- `deprecate_recipe`: approved → deprecated (ya no se usa)

**Categorias de receta:**
- Entrantes frios / calientes
- Sopas y cremas
- Pescados
- Carnes
- Guarniciones
- Postres
- Panaderia / Bolleria
- Salsas y fondos
- Mise en place (pre-elaboraciones)
- Buffet (preparaciones especificas)
- Room service
- Cocktail (piezas)

**Escandallo (costeo):**
- `total_cost = SUM(ingredient.quantity_gross * (1 - waste_pct) * preferred_supplier.unit_price)`
- No: `total_cost = SUM(ingredient.quantity_net * unit_price)` donde `quantity_net = quantity_gross * (1 - waste_pct/100)`
- `cost_per_serving = total_cost / servings`
- `food_cost_pct = (cost_per_serving / target_price) * 100`
- Sub-recetas: coste recursivo (fondos, salsas base)
- Merma estandar por ingrediente (waste_pct): configurable

**Alergenos (14 obligatorios EU):**
Gluten, crustaceos, huevos, pescado, cacahuetes, soja, lacteos, frutos_secos, apio, mostaza, sesamo, sulfitos, altramuces, moluscos

**Tags dieteticos:**
Vegano, vegetariano, sin_gluten, sin_lactosa, halal, kosher, bajo_en_sal, keto

**RPCs:**
1. `create_recipe(...)` → receta en draft
2. `update_recipe(...)` → actualiza + version snapshot
3. `submit_recipe_for_review(p_hotel_id, p_recipe_id)` → valida ingredientes
4. `approve_recipe(p_hotel_id, p_recipe_id)` → aprobacion head chef
5. `deprecate_recipe(p_hotel_id, p_recipe_id)` → deprecar
6. `calculate_recipe_cost(p_hotel_id, p_recipe_id)` → recalcula coste
7. `calculate_menu_cost(p_hotel_id, p_menu_id)` → coste agregado
8. `get_recipe_tech_sheet(p_hotel_id, p_recipe_id)` → ficha tecnica completa
9. `duplicate_recipe(p_hotel_id, p_recipe_id)` → clonar receta
10. `scale_recipe(p_hotel_id, p_recipe_id, p_new_servings)` → escalar cantidades

**UI:**
- Lista de recetas con filtros (categoria, estado, alergenos, coste)
- Formulario de receta con tabs (info, ingredientes, pasos, coste, alergenos)
- Ficha tecnica printable
- Lista de menus con secciones drag-and-drop
- Vista de escandallo con desglose de costes

---

#### M3. Catalogo y proveedores

**Objetivo**: Catalogo centralizado de productos, proveedores, ofertas y unidades de medida.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `categories` | id, hotel_id, parent_id, name, sort_order, is_active |
| `units_of_measure` | id, hotel_id, name, abbreviation, unit_type (weight/volume/count/length), conversion_factor, base_unit_id, is_default |
| `products` | id, hotel_id, category_id, name, description, sku, default_unit_id, min_stock, max_stock, reorder_point, allergens (jsonb), storage_type (ambient/refrigerated/frozen), shelf_life_days, is_active |
| `product_aliases` | id, hotel_id, product_id, alias_name, source_type (manual/ocr/voice), confidence_score |
| `suppliers` | id, hotel_id, name, contact_name, email, phone, address, tax_id, payment_terms, delivery_days (jsonb), min_order_amount, rating, notes, is_active |
| `supplier_offers` | id, hotel_id, supplier_id, product_id, unit_id, unit_price, min_quantity, valid_from, valid_to, is_preferred, sku_supplier, notes |

**Categorias por defecto:**
- Carnes (res, cerdo, aves, cordero, caza)
- Pescados y mariscos
- Verduras y hortalizas
- Frutas
- Lacteos y huevos
- Especias y condimentos
- Aceites y vinagres
- Panaderia y harinas
- Conservas y secos
- Congelados
- Bebidas
- Limpieza y desechables

**Conversiones de unidades:**
- kg ↔ g (factor: 1000)
- L ↔ ml (factor: 1000)
- docena ↔ unidad (factor: 12)
- Conversiones custom por producto (ej: 1 caja = 12 kg para proveedor X)

**RPCs:**
1. `upsert_product(...)` → crear/actualizar producto
2. `upsert_supplier(...)` → crear/actualizar proveedor
3. `set_preferred_offer(p_hotel_id, p_offer_id)` → marcar oferta preferida
4. `search_products(p_hotel_id, p_query, p_category_id?)` → busqueda full-text
5. `match_product_by_alias(p_hotel_id, p_alias_text)` → matching OCR
6. `get_product_with_offers(p_hotel_id, p_product_id)` → producto + ofertas
7. `compare_supplier_prices(p_hotel_id, p_product_ids[])` → comparativa precios
8. `import_products_bulk(p_hotel_id, p_products jsonb)` → importacion masiva

**UI:**
- Catalogo de productos con busqueda y filtros
- Ficha de producto con ofertas de proveedores
- Lista de proveedores con rating y condiciones
- Comparador de precios entre proveedores
- Gestion de unidades de medida y conversiones

---

#### M4. Compras

**Objetivo**: Ciclo completo de compras desde solicitud hasta recepcion con OCR de albaranes.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `purchase_requests` | id, hotel_id, event_id, request_number, requested_by, status, urgency (normal/urgent/critical), notes |
| `purchase_request_lines` | id, request_id, hotel_id, product_id, unit_id, quantity_requested, sort_order |
| `purchase_orders` | id, hotel_id, supplier_id, order_number, status, expected_delivery_date, total_amount, payment_terms, notes |
| `purchase_order_lines` | id, order_id, hotel_id, product_id, unit_id, quantity_ordered, quantity_received, unit_price, sort_order |
| `goods_receipts` | id, order_id, hotel_id, receipt_number, delivery_note_number, delivery_note_image, ocr_data (jsonb), temperature_check, notes, received_by, received_at |
| `goods_receipt_lines` | id, receipt_id, order_line_id, quantity_received, lot_number, expiry_date, unit_cost, quality_status (accepted/rejected/partial), rejection_reason |

**Estado solicitud de compra:**
```
draft → pending_approval → approved → consolidated → cancelled
```

**Estado orden de compra:**
```
draft → pending_approval → approved → sent → confirmed_by_supplier → 
partially_received → received → cancelled
```

**OCR de albaranes:**
- Foto del albaran → OCR extrae: proveedor, productos, cantidades, precios, fecha
- Matching automatico con product_aliases (confidence score)
- Revision manual de items no reconocidos
- Auto-actualizacion de precios si difieren de la oferta vigente
- Creacion automatica de goods_receipt

**RPCs:**
1. `create_purchase_request(...)` → PR con numero auto
2. `approve_purchase_request(p_hotel_id, p_request_id)` → aprobacion
3. `generate_purchase_order(p_hotel_id, p_supplier_id, ...)` → PO con numero auto
4. `generate_consolidated_order(p_hotel_id, p_supplier_id, p_date_range)` → consolida PRs + produccion en un PO
5. `send_purchase_order(p_hotel_id, p_order_id)` → valida lineas, calcula total
6. `receive_goods(p_hotel_id, p_order_id, p_lines, p_notes)` → recepcion + stock lots
7. `process_ocr_receipt(p_hotel_id, p_order_id, p_ocr_data)` → procesa albaran OCR
8. `get_pending_orders_by_supplier(p_hotel_id)` → pedidos pendientes agrupados
9. `get_purchase_history(p_hotel_id, p_product_id, p_months)` → historico de compras

**UI:**
- Lista de solicitudes de compra con urgencia
- Formulario de PO con selector de productos del catalogo
- Pantalla de recepcion de mercancia (con foto + OCR)
- Revision de matching OCR (drag productos no reconocidos)
- Dashboard de compras (gasto por proveedor, por categoria, tendencias)

---

#### M5. Inventario

**Objetivo**: Control de stock con FIFO por lote, trazabilidad, merma, transfers entre almacenes, y auditoria forense.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `storage_locations` | id, hotel_id, name, location_type (dry/refrigerated/frozen/ambient), parent_id, sort_order |
| `stock_lots` | id, hotel_id, product_id, storage_location_id, goods_receipt_line_id, lot_number, expiry_date, initial_quantity, current_quantity, unit_cost, received_at |
| `stock_movements` | id, hotel_id, product_id, lot_id, movement_type, quantity, reference_type, reference_id, unit_cost, from_location_id, to_location_id, created_by, notes |
| `stock_reservations` | id, hotel_id, event_id, product_id, lot_id, quantity_reserved, quantity_consumed, status |
| `stock_counts` | id, hotel_id, count_date, count_type (full/partial/blind), status (in_progress/completed/reviewed), counted_by, reviewed_by |
| `stock_count_lines` | id, count_id, product_id, storage_location_id, expected_quantity, counted_quantity, variance, variance_pct, notes |
| `waste_records` | id, hotel_id, product_id, lot_id, quantity, waste_type (expired/damaged/overproduction/preparation/other), department, reason, recorded_by |

**Tipos de movimiento:**
- `reception`: entrada por recepcion de mercancia
- `reservation`: reserva para evento
- `release`: liberacion de reserva
- `consumption`: consumo real
- `waste`: merma/desperdicio
- `adjustment`: ajuste de inventario
- `transfer`: transferencia entre almacenes
- `return`: devolucion a proveedor

**FIFO (First In, First Out):**
- Reserva por `expiry_date ASC NULLS LAST`, luego `received_at ASC`
- Cada reserva crea `stock_movement` tipo reservation
- Cada consumo crea `stock_movement` tipo consumption
- Trazabilidad completa: de lote a proveedor a evento

**Auditoria forense de stock (inspirado en GastroChain):**
- **Conteo ciego**: operario cuenta sin ver stock teorico
- **Varianza automatica**: `variance = counted - expected`
- **Alertas de discrepancia**: si varianza > umbral configurable
- **Patron de merma**: deteccion de merma sistematica por producto/turno/empleado
- **Reset atomico**: reajuste de stock tras auditoria aprobada

**Alertas de stock:**
- Stock bajo minimo (reorder_point)
- Caducidad proxima (configurable: 1, 3, 7 dias)
- Merma excesiva (> % configurable)
- Varianza de auditoria (> umbral)

**RPCs:**
1. `reserve_stock_for_event(p_hotel_id, p_event_id)` → FIFO + shortfalls
2. `consume_stock(p_hotel_id, p_reservation_id, p_quantity)` → consumo real
3. `record_waste(p_hotel_id, p_product_id, p_lot_id, p_quantity, p_waste_type, p_reason)` → merma
4. `transfer_stock(p_hotel_id, p_product_id, p_lot_id, p_quantity, p_from, p_to)` → transfer
5. `get_stock_levels(p_hotel_id, p_location_id?)` → niveles agregados
6. `calculate_real_cost(p_hotel_id, p_event_id)` → coste real post-evento
7. `check_stock_alerts(p_hotel_id)` → alertas activas
8. `start_stock_count(p_hotel_id, p_count_type, p_location_id?)` → inicia conteo
9. `submit_stock_count_line(p_hotel_id, p_count_id, p_product_id, p_counted)` → registra conteo
10. `review_stock_count(p_hotel_id, p_count_id)` → revisa y aplica ajustes
11. `get_waste_report(p_hotel_id, p_from, p_to)` → reporte de mermas
12. `get_stock_forensics(p_hotel_id, p_product_id)` → analisis forense de varianzas

**UI:**
- Dashboard de stock con semaforo (verde/amarillo/rojo)
- Vista por almacen con lotes y caducidades
- Pantalla de conteo (modo ciego disponible)
- Reporte de mermas con graficos por tipo/departamento
- Historial de movimientos (ledger inmutable)
- Alertas activas con acciones rapidas

---

#### M6. Produccion

**Objetivo**: El modulo diferenciador. Convierte eventos confirmados + ocupacion en plan de produccion por partida, mise en place, y ordenes de cocina.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `production_plans` | id, hotel_id, plan_date, status (draft/active/in_progress/completed), created_by |
| `production_plan_items` | id, plan_id, recipe_id, service_type, event_id, servings_needed, department, priority, status (pending/in_progress/done), assigned_to, started_at, completed_at |
| `workflows` | id, hotel_id, event_id, status, scheduled_date |
| `tasks` | id, workflow_id, hotel_id, title, description, department, priority, status, assigned_to, blocked_reason, started_at, completed_at, sort_order |
| `mise_en_place_lists` | id, event_id, hotel_id, department, plan_date |
| `mise_en_place_items` | id, list_id, product_id, recipe_id, quantity, unit_id, preparation_type, is_done, done_by, done_at, sort_order |
| `kitchen_orders` | id, hotel_id, event_id, production_plan_id, order_type (a_la_carte/banquet/buffet/room_service), table_number, room_number, status, priority, notes |
| `kitchen_order_items` | id, order_id, recipe_id, quantity, modifications, status (pending/cooking/ready/served/cancelled), started_at, ready_at |

**Flujo de produccion:**
```
1. Eventos confirmados + servicios regulares (buffet desayuno, etc.)
   |
2. Consolidar por receta: SUM(servings) agrupado por receta
   |
3. Generar plan de produccion por partida:
   - Partida caliente: recetas X, Y, Z
   - Partida fria: recetas A, B
   - Pasteleria: recetas P, Q
   |
4. Generar mise en place:
   - Ingredientes necesarios por receta escalada
   - Pre-elaboraciones (sub-recetas)
   |
5. Generar lista de compras:
   - Ingredientes necesarios - stock disponible = necesidad de compra
   - Consolidar por proveedor preferido
   |
6. Ejecucion en cocina:
   - KDS con ordenes por partida
   - Tracking de tiempos
   - Marcado de items completados
```

**Kitchen Display System (KDS):**
- Pantalla por partida/estacion
- Ordenes en tiempo real con prioridad visual
- Colores por estado: pendiente (blanco), en curso (amarillo), listo (verde), retrasado (rojo)
- Alertas sonoras configurables
- Sincronizacion sala-cocina
- Modo offline con sync posterior

**Departamentos/Partidas:**
- Cocina caliente
- Cocina fria
- Pasteleria / Reposteria
- Panaderia
- Carniceria / Charcuteria
- Pescaderia
- Garde manger
- Room service
- Banquetes
- Economato

**Estado del plan de produccion:**
```
draft → active → in_progress → completed
```

**Estado de la tarea:**
```
todo → in_progress → blocked → done → cancelled
```

**Estado del workflow:**
```
pending → active → at_risk → completed → cancelled
```

**RPCs:**
1. `generate_production_plan(p_hotel_id, p_date)` → consolida eventos + servicios regulares
2. `generate_event_workflow(p_hotel_id, p_event_id)` → workflow + tareas + mise en place
3. `generate_shopping_list(p_hotel_id, p_date)` → necesidades - stock = compras
4. `assign_task(p_hotel_id, p_task_id, p_assigned_to)` → asignar tarea
5. `start_task(p_hotel_id, p_task_id)` → iniciar
6. `complete_task(p_hotel_id, p_task_id)` → completar (auto-completa workflow si todas done)
7. `block_task(p_hotel_id, p_task_id, p_reason)` → bloquear + workflow at_risk
8. `mark_mise_en_place_item(p_hotel_id, p_item_id, p_is_done)` → marcar preparacion
9. `create_kitchen_order(p_hotel_id, p_event_id, p_items)` → orden a cocina
10. `update_kitchen_order_item_status(p_hotel_id, p_item_id, p_status)` → KDS update
11. `get_production_summary(p_hotel_id, p_date)` → resumen del dia

**UI:**
- Plan de produccion diario por partida
- Vista de mise en place con checklist
- KDS: pantalla de ordenes por estacion (touch-friendly, pantalla grande)
- Kanban de tareas por departamento
- Timeline del dia con eventos y servicios
- Lista de compras generada automaticamente

---

#### M7. Direccion y reporting

**Objetivo**: Dashboard ejecutivo con KPIs en tiempo real, food cost por servicio/evento, tendencias y alertas.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `kpi_snapshots` | id, hotel_id, period_type (daily/weekly/monthly), period_date, data (jsonb) |
| `alerts` | id, hotel_id, alert_type, severity (info/warning/critical), title, message, entity_type, entity_id, is_dismissed, dismissed_by, dismissed_at |
| `alert_rules` | id, hotel_id, name, alert_type, condition_config (jsonb), severity, is_active |

**KPIs principales:**

| KPI | Formula |
|---|---|
| Food cost % global | (coste ingredientes consumidos / revenue) * 100 |
| Food cost % por servicio | (coste ingredientes servicio X / revenue servicio X) * 100 |
| Food cost % por evento | coste real evento / precio cobrado |
| Coste teorico vs real | (coste teorico - coste real) / coste teorico |
| Merma % | (cantidad desperdiciada / cantidad comprada) * 100 |
| Merma por departamento | agrupado por partida/area |
| Rotacion de inventario | coste ingredientes vendidos / stock medio |
| Dias de stock medio | stock actual / consumo diario medio |
| Pedidos pendientes | count POs en estado no-terminal |
| Eventos proximos | count eventos en 7 dias |
| Tareas bloqueadas | count tareas en status blocked |
| Cumplimiento APPCC | % registros completados vs requeridos |

**Dashboard:**
- Tarjetas KPI con tendencia 7 dias
- Grafico food cost por servicio (lineas/barras)
- Calendario de eventos proximo
- Alertas activas con accion rapida
- Top 5 productos mas costosos
- Top 5 recetas mas rentables / menos rentables
- Varianza teorico vs real por evento

**RPCs:**
1. `generate_daily_snapshot(p_hotel_id, p_date)` → snapshot KPIs
2. `get_dashboard_data(p_hotel_id)` → datos live + tendencia
3. `get_food_cost_by_service(p_hotel_id, p_from, p_to)` → desglose por servicio
4. `get_food_cost_by_event(p_hotel_id, p_event_id)` → coste real evento
5. `get_cost_variance_report(p_hotel_id, p_from, p_to)` → teorico vs real
6. `check_alert_thresholds(p_hotel_id)` → genera alertas
7. `dismiss_alert(p_hotel_id, p_alert_id)` → descartar alerta

**UI:**
- Dashboard principal con widgets configurables
- Reportes con filtros de fecha y servicio
- Graficos de tendencia
- Export a PDF/Excel

---

### Fase 2 (6 meses) — Objetivo: 3-5 clientes

---

#### M8. Automatizacion

**Objetivo**: Cola de jobs asincrona con retry, domain events, y webhooks para integraciones.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `automation_jobs` | id, hotel_id, domain_event_id, job_type, status, payload, result, attempts, max_attempts, next_retry_at, error_message |
| `job_attempts` | id, job_id, attempt_number, status, error_message, duration_ms |
| `integrations` | id, hotel_id, name, integration_type, config (jsonb), is_active, last_tested_at, last_test_result |
| `integration_deliveries` | id, integration_id, hotel_id, domain_event_id, status, request_payload, response_status, response_body, attempts, next_retry_at |

**Retry con backoff exponencial:**
- Max 3 intentos por defecto
- `next_retry_at = now() + (attempts * 1 min)`
- Si `attempts >= max_attempts` → `dead_letter`
- Retry manual disponible (incrementa max_attempts)

**Job types:**
- `generate_briefing`: genera documento briefing cocina
- `generate_production_plan`: plan de produccion automatico
- `send_notification`: notificacion in-app/email/push
- `update_cost`: recalcula costes
- `trigger_alert`: verifica umbrales de alerta
- `dispatch_webhook`: envia a integracion externa
- `generate_shopping_list`: lista de compras automatica
- `sync_pms_data`: sincroniza datos del PMS

---

#### M9. Compliance (APPCC, trazabilidad, etiquetado)

**Objetivo**: Cumplimiento de seguridad alimentaria integrado en el flujo de produccion, no como herramienta separada.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `appcc_templates` | id, hotel_id, name, category (reception/storage/preparation/cooking/cooling/service/cleaning), frequency, is_active |
| `appcc_records` | id, hotel_id, template_id, record_date, shift, values (jsonb), status (pending/completed/alert/corrected), recorded_by, reviewed_by, corrective_action |
| `temperature_logs` | id, hotel_id, location_id, product_id, lot_id, temperature, recorded_by, is_alert, alert_threshold |
| `labels` | id, hotel_id, product_id, recipe_id, lot_id, label_type (primary/secondary/allergen), production_date, expiry_date, allergens (jsonb), ingredients_text, storage_instructions, printed_by, printed_at |
| `traceability_chains` | id, hotel_id, lot_id, product_id, from_supplier_id, through_recipe_ids (jsonb), to_event_id, full_chain (jsonb) |

**Registros APPCC:**
- Recepcion de mercancia (temperatura, estado visual, caducidad)
- Control de camaras (temperatura periodica)
- Enfriamientos rapidos (de 65C a 10C en < 2h)
- Temperaturas de servicio (buffet: > 65C caliente, < 8C frio)
- Limpieza y desinfeccion
- Control de aceites de fritura
- Trazabilidad de lotes

**Etiquetado automatico:**
- Genera etiqueta desde receta + lote: nombre, ingredientes, alergenos, fecha produccion, caducidad, lote interno
- Cumple normativa EU 1169/2011
- Imprimible en impresora de etiquetas

**Trazabilidad completa:**
```
Proveedor → Lote recepcion → Almacen → Receta/Produccion → 
Evento/Servicio → Cliente
```
- Recall: dado un lote de proveedor, encontrar todos los eventos/servicios afectados

---

#### M10. Documentos

**Objetivo**: Generacion automatica de documentos operativos en PDF.

**Tipos de documento:**
- Ficha tecnica de receta (ingredientes, pasos, coste, alergenos, foto)
- BEO (Banquet Event Order)
- Hoja de produccion por partida
- Lista de compras consolidada
- Briefing de cocina (resumen del dia)
- Informe de mermas
- Registro APPCC
- Etiquetas de producto
- Informe de food cost

---

#### M14. Notificaciones

**Objetivo**: Sistema multi-canal de notificaciones.

**Canales:**
- In-app (toast + centro de notificaciones)
- Email (resumen diario, alertas criticas)
- Push (mobile web)
- WhatsApp Business API (opcional, fase 3)

**Triggers:**
- Evento confirmado → notifica a cocina, economato, sala
- Stock bajo minimo → notifica a procurement
- Tarea bloqueada → notifica a head chef
- Conteo con varianza alta → notifica a direction
- APPCC fuera de rango → notifica inmediatamente
- Pedido recibido → notifica a almacen
- Alerta de caducidad → notifica a head chef + almacen

---

### Fase 3 (12 meses) — Objetivo: diferenciacion competitiva

---

#### M11. Analytics, Forecast y ML

**Objetivo**: Prediccion de demanda con XGBoost, analisis avanzado de costes, optimizacion de menu, y scoring de productos/proveedores.

**Funcionalidades base:**
- Forecast de produccion basado en: ocupacion PMS, historico, clima, dia semana, temporada, eventos locales
- Prediccion de compras a 7/14/30 dias
- Analisis de tendencia de food cost
- Comparativa periodos (MoM, YoY)
- Identificacion de recetas mas/menos rentables
- Optimizacion de menu (menu engineering matrix: stars, plowhorses, puzzles, dogs)
- Prediccion de merma por producto/temporada
- ROI por evento (revenue vs coste total)

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `ventas_diarias` | id, hotel_id, fecha, hora_apertura, hora_cierre, covers_almuerzo, covers_cena, ticket_medio_almuerzo, ticket_medio_cena, ventas_total, ventas_cocina, ventas_sala, ventas_barra |
| `senales_externas` | id, hotel_id, fecha, temp_max, temp_min, precipitacion_mm, viento_kmh, descripcion_clima, hay_partido, aforo_partido, hay_concierto, hay_evento_ayuntamiento, descripcion_evento, es_festivo, es_puente, es_verano, dia_semana, semana_del_ano |
| `correlaciones_observadas` | id, hotel_id, fecha, senal, impacto_ventas_pct, notas, creado_por |
| `proveedor_entregas` | id, hotel_id, proveedor_id, pedido_id, fecha_pedido, fecha_entrega_esperada, fecha_entrega_real, dias_retraso (generated), productos_pedidos, productos_recibidos_ok, productos_con_problema, tipo_problema (retraso/calidad/cantidad/producto_erroneo/no_entrega), notas |
| `precios_historicos` | id, hotel_id, producto_id, proveedor_id, fecha, precio_unitario, unidad, temporada, semana_del_ano |
| `menu_rendimiento` | id, hotel_id, fecha, receta_id, unidades_vendidas, food_cost_real, food_cost_teorico, precio_venta, margen_real, ingrediente_critico_disponible, proveedor_fallo |
| `producto_scoring` | id, hotel_id, producto_id, categoria, margen_bruto_pct, congelable, volatilidad_precio, ventana_compra_optima, ahorro_compra_anticipada_pct, vida_util_dias, num_recetas_uso, fiabilidad_suministro, score_total, ranking_categoria, fecha_calculo |

**Demand Forecasting con XGBoost:**

Modelo principal que predice ventas futuras cruzando datos internos + senales externas.
- Requiere minimo 180 dias de datos (inicio acumulacion: mes 1 de produccion)
- Features: dia_semana, semana_ano, es_festivo, es_puente, temp_max, precipitacion, hay_partido, ventas_hace_7d, ventas_hace_14d, ventas_media_4sem, ventas_mismo_dia_ano_anterior
- Target: ventas_total
- Reentrenamiento: cada 30 dias

**3 modelos ML complementarios:**

| Modelo | Tipo | Input | Output |
|---|---|---|---|
| **A: Fiabilidad proveedor** | Clasificacion | dia_semana_pedido, semana_ano, historico_retrasos_30d/90d, volumen_pedido, temporada_alta | probabilidad_fallo (0-1) + dias_retraso_esperado |
| **B: Prevision precios** | Regresion | semana_ano, precio_medio_4sem, precio_mismo_periodo_ano_anterior, tendencia_3meses, temporada_producto | precio_estimado_proximas_4_semanas |
| **C: Optimizador menu** | Scoring compuesto | forecast_demanda (XGBoost) × fiabilidad_proveedor (A) × prevision_precios (B) | ranking semanal de recetas que maximizan beneficio con menor riesgo de rotura |

**Product Scoring — ranking inteligente por producto:**

Score compuesto = margen_bruto (25%) + congelabilidad (15%) + (1-volatilidad_precio) (20%) + ventana_compra_ahorro (15%) + vida_util (10%) + versatilidad (5%) + fiabilidad_suministro (10%)

Genera listas TOP por categoria (pescados, carnes, verduras...) recalculadas mensualmente.

**Caso de uso: Semana Santa en Galicia:**
```
Modelo B detecta: bacalao +30% en sem 10-12
Modelo A confirma: proveedor habitual 78% prob. retraso en S. Santa
Modelo C genera:
  - COMPRA ANTICIPADA: pedir bacalao sem 8-9 (ahorro 25-40%)
  - OPORTUNIDAD: cordero baja precio → meter en carta
  - QUITAR: platos con marisco (precio pico, bajo margen)
```

**APIs externas para senales:**

| API | Datos | Coste |
|---|---|---|
| OpenWeatherMap | Clima local | Gratis |
| nager.date | Festivos Espana/Galicia | Gratis |
| football-data.org | Partidos locales | Gratis |
| Ticketmaster | Conciertos/eventos | Gratis |
| Ayuntamiento local | Eventos municipales | Gratis |

**Swarm de forecasting (5 agentes):**

| Agente | Funcion | Frecuencia |
|---|---|---|
| Colector | APIs externas (clima, eventos, festivos) | Cada noche |
| Preparador | Construye lag features automaticamente | Tras coleccion |
| Entrenador | Reentrena XGBoost | Cada 30 dias |
| Predictor | Forecast 7 dias vista | Cada domingo |
| Alertador | Avisa compras y turnos si demanda alta | Tras prediccion |

**Swarm de proveedores + menu (5 agentes):**

| Agente | Funcion | Frecuencia |
|---|---|---|
| Registrador | Captura entregas, retrasos, incidencias | Cada recepcion |
| Analista Precios | Detecta tendencias y anomalias en precios | Semanal |
| Evaluador Proveedores | Score fiabilidad por proveedor | Mensual |
| Optimizador Menu | Cruza forecast + proveedores + precios → ranking | Cada domingo |
| Alertador Compras | Sugiere alternativa si proveedor score bajo | Antes de cada pedido |

---

#### M12. Integraciones PMS/POS

**Objetivo**: Conectar con el ecosistema hotelero para automatizar inputs.

**Integraciones prioritarias:**

| Sistema | Tipo | Datos |
|---|---|---|
| **Mews** (PMS) | API REST | Ocupacion, reservas, servicios, nationality mix |
| **OPERA Cloud** (PMS) | OHIP API | Ocupacion, banquetes, room service |
| **Lightspeed** (POS) | API REST | Ventas, mix de productos, tickets |
| **Oracle Simphony** (POS) | API | Ventas restaurante, KDS |

**Datos que entran:**
- Ocupacion prevista (hoy, manana, semana)
- Breakdown de nacionalidades (afecta buffet desayuno)
- Reservas de restaurante
- Room service orders
- Ventas por outlet

**Datos que salen:**
- Ordenes a cocina (via KDS)
- Coste de alimentos por outlet
- Informes para PMS/ERP

---

#### M13. RRHH y turnos

**Objetivo**: Gestion basica de personal de cocina.

**Funcionalidades:**
- Cuadrantes de turnos (drag & drop)
- Control de horas trabajadas
- Portal del empleado
- Fichaje (manual o biometrico)
- Gestion de vacaciones y ausencias
- Coste laboral por servicio/evento
- Sincronizacion con Google Calendar / iCal
- Alertas de horas extra
- Deteccion de fatiga (horas consecutivas)

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `personal` | id, hotel_id, nombre, rol, email, telefono, horas_objetivo_semana, activo |
| `turno` | id, hotel_id, nombre, hora_inicio, hora_fin, tipo (manana/partido/noche) |
| `regla_horario` | id, hotel_id, rol, dias_semana (jsonb), turno_id, min_personas, max_personas, prioridad, activa |
| `horario_asignacion` | id, hotel_id, personal_id, fecha, turno_id, status (propuesto/confirmado/modificado), evento_id, notas |

**Generacion automatica mensual:**
- Calcula necesidades base + incremento por eventos confirmados
- Asigna personal disponible respetando horas_objetivo
- No solapamiento de turnos
- Genera alertas si deficit o sobrecarga de personal

---

#### M15. Agentes autonomos

**Objetivo**: Swarm de agentes que observa, decide, ejecuta, evalua y memoriza para automejora operativa continua. Principio: **asistido, no autonomo** — sugiere, usuario confirma.

**Entidades:**
| Tabla | Campos clave |
|---|---|
| `agent_actions` | id, hotel_id, agent, accion, parametros (jsonb), impacto_estimado, impacto_real, score, aprendizaje, status (suggested/approved/executed/evaluated), approved_by |
| `agent_rules` | id, hotel_id, agent, rule_type, condition (jsonb), action_template (jsonb), is_active, success_rate |

**Swarm de automejora operativa (5 agentes):**

| Agente | Funcion | Frecuencia |
|---|---|---|
| **Observador** | Detecta anomalias en stock, margenes, costes, mermas | Diario |
| **Decisor** | Propone accion concreta basada en datos | Tras observacion |
| **Ejecutor** | Implementa accion aprobada en Supabase | Tras aprobacion |
| **Evaluador** | Mide resultado 24h despues | Diario |
| **Memorizador** | Actualiza reglas operativas segun resultados | Tras evaluacion |

**Flujo:**
```
Supabase (datos reales)
    ↓
Observador → detecta anomalia
    ↓
Decisor → propone accion
    ↓
[USUARIO APRUEBA]
    ↓
Ejecutor → implementa
    ↓
Evaluador → mide 24h despues
    ↓
Memorizador → actualiza reglas
    ↑___________________________|
```

**Principios:**
1. **Asistido, NO autonomo**: todo requiere aprobacion manual en MVP
2. **Trazabilidad**: cada accion queda registrada con impacto estimado vs real
3. **Aprendizaje**: el score de cada accion retroalimenta las reglas
4. **Sin reglas propias en alertas**: las alertas llegan del modulo origen, agentes solo reaccionan

**Stack de agentes:** Ruflo + Claude Code via MCP (orquestacion), Supabase (datos), Python (ML)

**Agentes de coordinacion interdepartamental (evento como ejemplo):**

Cuando comercial confirma un evento, los agentes distribuyen automaticamente a cada departamento:

```
Comercial confirma evento (200 pax, boda, sabado)
    |
    ├─► Agente Cocina
    │   → Genera plan produccion por partida
    │   → Calcula ingredientes necesarios
    │   → Cruza con stock → detecta faltantes
    │   → Genera mise en place por departamento
    │   → Notifica a head_chef con resumen
    │
    ├─► Agente Compras
    │   → Recibe lista de faltantes de cocina
    │   → Genera pedidos sugeridos por proveedor
    │   → Verifica lead times y hora_corte
    │   → Notifica a procurement con urgencia si aplica
    │
    ├─► Agente Sala
    │   → Recibe BEO con layout, horarios, setup
    │   → Genera checklist de montaje (mesas, manteleria, decoracion)
    │   → Asigna tareas al personal de sala
    │   → Notifica a room con timeline de montaje
    │
    ├─► Agente Direccion
    │   → Recibe resumen ejecutivo del evento
    │   → Estado actual, presupuesto, margen estimado
    │   → Timeline de preparacion con semaforo
    │   → Notifica a direction con dashboard evento
    │
    └─► Agente Comercial
        → Actualiza estado del evento en CRM
        → Genera BEO versionado (PDF exportable)
        → Confirma al cliente (email/WhatsApp opcional)
        → Mantiene historial de cambios
```

**Cuando hay cambio (pax, menu, horario, sala):**
```
Comercial actualiza evento (de 200 a 250 pax, cambio menu)
    |
    ├─► Todos los agentes reciben notificacion de cambio
    ├─► Cocina: recalcula produccion, detecta nuevos faltantes
    ├─► Compras: ajusta pedidos pendientes o genera nuevos
    ├─► Sala: actualiza layout y checklist
    ├─► Direccion: actualiza presupuesto y margen
    └─► Se genera HOJA DE CAMBIOS (PDF exportable):
        - Evento: Boda Familia Garcia
        - Cambio: 200 → 250 pax + cambio menu entrante
        - Impacto cocina: +25% produccion, 3 productos nuevos a pedir
        - Impacto compras: 2 pedidos urgentes generados
        - Impacto sala: 5 mesas adicionales, nuevo layout
        - Aprobado por: Ana (comercial), 14/04/2026 16:30
```

**Entidades adicionales:**
| Tabla | Campos clave |
|---|---|
| `event_notifications` | id, hotel_id, event_id, department (kitchen/procurement/room/direction/commercial), notification_type (confirmed/updated/cancelled), payload (jsonb), change_summary, pdf_url, sent_at, read_by (jsonb) |
| `event_change_log` | id, event_id, hotel_id, field_changed, old_value, new_value, impact_summary (jsonb), changed_by, change_reason, pdf_generated |

**Hoja exportable (PDF):**
Cada cambio o confirmacion genera un PDF con:
- Datos del evento (nombre, fecha, pax, menus, salas)
- Impacto por departamento (cocina, compras, sala)
- Acciones requeridas por departamento
- Timeline actualizado
- Firma/aprobacion de quien confirmo el cambio
- Historial de versiones del evento

---

### Fase 4+ — Futuro

---

#### M16. Marketplace

**Objetivo**: Ecosistema expandible de recetas, proveedores y plugins.

**Funcionalidades (futuro):**
- Biblioteca de recetas descargables (por chefs invitados)
- Red de proveedores con sincronizacion directa
- Plugins de terceros (integraciones, herramientas)
- Plantillas de eventos/menus compartibles

---

## Apendice A. Reglas de negocio adicionales (desde specs GitHub)

### Productos
- **Anti-duplicados**: unique key = `hotel_id + proveedor_id + codigo_proveedor` (previene duplicados en re-import Excel)
- **Import Excel**: con validacion de duplicados, re-import actualiza precios sin crear duplicados
- **Recetas bloqueadas**: si un ingrediente no esta mapeado a un Producto, la receta queda "Pendiente de mapeo" y NO puede activarse

### Proveedores
- **ProveedorConfig** (tabla separada): dias_entrega, hora_corte_pedido, lead_time_min_horas, pedido_minimo_importe, pedido_minimo_unidades, ventana_recepcion, permite_entrega_urgente
- **Incidencias**: tabla `incidencia_proveedor` con tipo (retraso/calidad/cantidad/no_entrega)
- **Metricas auto-generadas**: % pedidos completos, % entregas a tiempo, incidencias ultimos 30 dias
- **Alertas proveedor**: pedido no llega a tiempo (CRITICO), fuera de cut-off (AVISO), recepcion incompleta (CRITICO)

### Eventos
- **Servicios dentro de evento**: un evento puede tener multiples servicios independientes (coffee, cocktail, comida, cena), cada uno con su horario, menu y pax propios
- **Tabla evento_sala**: relacion N:M entre eventos y salas (un evento es unico aunque use multiples salas)
- **Auto-trigger**: cambio en pax/menu/servicios → revision automatica de produccion y compras
- **Import Excel**: con validacion duplicados (hotel+fecha+hora+nombre)
- **Menus**: cerrados (del catalogo) o a peticion (PDF/imagen con OCR)

### Compras
- **Necesidad ≠ Pedido ≠ Recepcion**: 3 entidades separadas con flujo claro
- **1 Pedido = 1 Proveedor** siempre (agrupa multiples necesidades/eventos)
- **Trazabilidad linea**: cada linea del pedido guarda origen (evento/produccion/manual) + departamento
- **PDF generado**: estado "Enviado" genera PDF oficial para compras
- **Pedidos sugeridos** (automatizaciones): calcula necesidades futuras → resta stock → agrupa por proveedor → valida reglas → genera sugerencia (NO ejecuta)
- **Foto albaran obligatoria** en recepcion

### Inventario
- **Caducidad obligatoria** cuando aplica al tipo de producto
- **Motivos de merma** (enum): caducidad, sobreproduccion, error_preparacion, mala_conservacion, rotura_accidente, devolucion, sobras_evento, otros
- **Registro rapido merma**: < 10 segundos desde movil
- **Sin culpables**: el objetivo es mejorar procesos, no personas
- **Alertas configurables**: caduca en 48h/7d, lotes sin movimiento X dias, merma alta

### Produccion
- **Plantillas repetitivas**: tabla `plantilla_repetitiva` con byweekday, turno_objetivo, asignado_a para tareas recurrentes (limpieza, checklist diarios)
- **Tipos de tarea**: elaboracion/receta, operativa (limpieza/checklist), control
- **2 vistas**: jefe (desktop completo) vs personal (movil simple, 1 pantalla)
- **Cierre de turno/dia**: accion formal que mueve/reasigna tareas pendientes
- **Timestamps anti-abuso**: inicio/fin registrados para controlar ejecucion real
- **Cambio evento → revision**: si cambia pax/menu, tareas ligadas pasan a "Pendiente de revision"

### Etiquetado
- **Tratamiento enum**: congelado, descongelado, pasteurizado, regenerado — cada uno recalcula caducidad
- **Barcode/QR**: Code128 o QR con payload (nombre, fecha, caducidad, evento)
- **Escaneo rapido**: identificar lote → sacar/merma/mover/congelar/descongelar
- **ReglaCaducidad**: tabla con vida_util_horas que auto-calcula fecha expiracion segun tipo de tratamiento

### Alertas
- **Deduplicacion**: no duplicar si alerta activa existe para mismo (hotel + origen_modulo + origen_id + severidad)
- **Sin reglas propias**: el modulo de alertas solo decide cuando/a quien/como avisar, no genera alertas
- **Destinatarios por rol**: notifica a jefe_cocina, compras, etc. — NO por usuario individual
- **Severidad viene del origen**: INFO, AVISO, CRITICO — nunca se redefine en alertas

### Domain Events (contratos internos)
- **Regla de oro**: modulos nunca se llaman directamente entre si; emiten eventos → otros reaccionan
- **20 eventos tipados**: evento.updated, evento.cancelled, tarea_produccion.created/updated, pedido.sent/received_partial/received_complete, inventario.lote_created/lote_expiring/merma_recorded, proveedor.incidencia_created, automatizacion.pedido_sugerido
- **Matriz de consumo**: cada evento define que modulos lo consumen (Alertas, Automatizaciones, Dashboard)

### Conversiones de unidades
- **3 contextos**: unidad_stock, unidad_compra, unidad_receta — cada una puede ser diferente
- **Factor conversion** por producto×proveedor (ej: 1 caja proveedor X = 12 kg)

---

## Apendice B. Tablas adicionales (desde specs GitHub)

| Tabla | Modulo | Campos clave |
|---|---|---|
| `proveedor_config` | M3 | hotel_id, proveedor_id, dias_entrega, hora_corte_pedido, lead_time_min_horas, pedido_minimo_importe, pedido_minimo_unidades, ventana_recepcion, permite_entrega_urgente |
| `incidencia_proveedor` | M3 | hotel_id, proveedor_id, pedido_id, tipo (retraso/calidad/cantidad/no_entrega), descripcion, severidad, fecha |
| `precio_historial` | M3 | hotel_id, producto_id, proveedor_id, fecha, precio_anterior, precio_nuevo, variacion_pct |
| `referencia_proveedor` | M3 | hotel_id, producto_id, proveedor_id, codigo_proveedor, nombre_proveedor, unidad_compra, factor_conversion |
| `necesidad` | M4 | hotel_id, producto_id, cantidad, origen_tipo (evento/produccion/manual), origen_id, departamento, fecha_necesidad, status |
| `evento_sala` | M1 | hotel_id, evento_id, sala_id, setup_type, capacity, notas |
| `sala` | M1 | hotel_id, nombre, capacidad_max, equipamiento (jsonb), is_active |
| `plantilla_repetitiva` | M6 | hotel_id, titulo, tipo_tarea, receta_id, departamento, byweekday (jsonb), turno_objetivo, asignado_a, activa |
| `regla_caducidad` | M9 | hotel_id, producto_id, tipo_tratamiento (fresco/abierto/congelado/descongelado/pasteurizado/regenerado), vida_util_horas |
| `plantilla_etiqueta` | M9 | hotel_id, nombre, tipo, campos (jsonb), formato_barcode (code128/qr), is_default |
| `ubicacion` | M5 | hotel_id, storage_location_id, nombre, zona, posicion, notas |
| `pedido_sugerido` | M8 | hotel_id, proveedor_id, fecha_sugerida, status (pendiente/aprobado/descartado), generado_por_agente |
| `pedido_sugerido_linea` | M8 | pedido_sugerido_id, producto_id, cantidad_sugerida, motivo, necesidad_id |

---

## 4. State machines (resumen)

| Entidad | Estados | Transiciones clave |
|---|---|---|
| **Event** | draft → pending_confirmation → confirmed → in_preparation → in_operation → completed / cancelled → archived | confirm requiere menu; emite domain event |
| **Recipe** | draft → review_pending → approved → deprecated → archived | approve solo head_chef/direction |
| **Purchase Request** | draft → pending_approval → approved → consolidated / cancelled | approve requiere rol procurement+ |
| **Purchase Order** | draft → pending_approval → approved → sent → confirmed → partially_received → received / cancelled | send valida lineas y calcula total |
| **Task** | todo → in_progress → blocked → done / cancelled | block → workflow at_risk |
| **Workflow** | pending → active → at_risk → completed / cancelled | auto-complete si todas las tareas done |
| **Stock Reservation** | reserved → partially_released → consumed / released | FIFO por caducidad |
| **Production Plan** | draft → active → in_progress → completed | generado desde eventos |
| **Kitchen Order Item** | pending → cooking → ready → served / cancelled | KDS tracking |
| **APPCC Record** | pending → completed → alert → corrected | alerta si fuera de rango |
| **Stock Count** | in_progress → completed → reviewed | blind count disponible |

---

## 5. Reglas de negocio criticas

### Costeo
- **Coste receta** = SUM(qty_neta * precio_preferido_proveedor)
- **qty_neta** = qty_bruta * (1 - merma_estandar%)
- **Coste menu** = SUM(coste_por_racion de cada receta)
- **Coste real evento** = SUM(qty_consumida * coste_unitario_lote) desde stock_movements
- **Food cost %** = (coste_ingredientes / precio_venta) * 100
- **Varianza** = ((coste_teorico - coste_real) / coste_teorico) * 100

### Inventario FIFO
- Reserva: ORDER BY expiry_date ASC NULLS LAST, received_at ASC
- Crea stock_movements por cada reserva/consumo/merma
- Shortfall tracking si stock < necesidad

### Produccion
- Consolida todos los eventos del dia + servicios regulares
- Agrupa por receta → suma servings
- Escala ingredientes proporcionalmente
- Genera mise en place por departamento/partida
- Lista de compras = necesidad - stock disponible

### APPCC
- Temperaturas fuera de rango → alerta inmediata
- Registros no completados → alerta al cierre de turno
- Trazabilidad: recall completo en < 2 horas (requisito legal)

---

## 6. Pricing

| Tier | EUR/mes | Target | Limites |
|---|---|---|---|
| **Pilot** | 249 | 1 hotel piloto / 1 catering mediano | 1 cocina, 1 almacen, 300 recetas, 3 servicios |
| **Pro** | 499 | Hotel 3-5* con banquetes | 3 centros, 1500 recetas, 8 servicios, 20 eventos/mes |
| **Premium** | 899 | Hotel+Eventos grande / catering grande | 10 centros, 5000 recetas, 1 integracion PMS/POS |
| **Enterprise** | Custom | Cadenas hoteleras | Ilimitado, deploy on-premise, SLA |

**Todos los tiers: usuarios ilimitados.**

**Metricas de escalado:** centros (cocinas + almacenes), servicios activos, eventos/mes.

**Founding customers:** 50% descuento 12 meses a cambio de logo + testimonios + feedback semanal.

**Setup/onboarding:** 500-1500 EUR segun complejidad.

---

## 7. Go-to-market

### ICP concreto
"Hotel 3-4* en Galicia con buffet desayuno + banquetes (bodas/empresa) y 1-2 cocinas"

### Canales
1. **Red local**: Hostalaria.Gal, Cluster Turismo de Galicia
2. **Asociaciones**: CEHAT (16,000+ establecimientos)
3. **Ferias**: HIP (Horeca Professional Expo)
4. **Partners PMS/POS**: integradores Mews, consultoras hoteleras
5. **Contenido**: operativas reales de cocina hotelera (autoridad de chef)

### Contenido diferenciador
- "Como calcular un buffet de desayuno con variacion por ocupacion y nacionalidad"
- "Plantilla de produccion para banquete: del BEO a la partida"
- "Errores tipicos del escandallo hotelero"

### Ciclo de venta
- Hoteles: 3-8 semanas sin integraciones, 2-4 meses con IT
- Catering: 2-6 semanas
- Eventos pequenos: 1-3 semanas

---

## 8. Metricas de exito

### Producto
- Tiempo de onboarding < 1 semana
- DAU/MAU > 60% (adopcion real)
- NPS > 40

### Negocio
- 1 piloto pagable en 3 meses
- 5 clientes en 6 meses
- ARR 30K en 12 meses
- Churn < 5% mensual

### Impacto en cliente
- Reduccion food cost 3-5% en primer trimestre
- Reduccion merma 15-25%
- Ahorro 4+ horas/dia en tareas admin
- Tiempo de recall < 2 horas (compliance)

---

## 9. Riesgos y mitigacion

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---|---|---|
| Onboarding demasiado complejo | Alta | Alto | MVP minimo, templates pre-cargados, wizard guided |
| Calidad de datos pobre | Alta | Alto | OCR de albaranes, import masivo, validacion progresiva |
| Competidor enterprise baja precio | Media | Medio | Foco en hotel mediano espanol, expertise de chef |
| Integracion PMS compleja | Alta | Medio | Fase 3; empezar con export/import manual |
| Founder solo = cuello de botella | Alta | Alto | Automatizar onboarding, docs self-service, comunidad |

---

## 10. Roadmap visual

```
Q2 2026 (Abr-Jun)     Q3 2026 (Jul-Sep)     Q4 2026 (Oct-Dic)     Q1 2027+
├─ MVP ──────────────┤                       │                      │
│ D0 Identidad       │ M8 Automatizacion     │ M11 Analytics+ML     │ M16 Marketplace
│ M1 Comercial       │ M9 Compliance APPCC   │ M12 Integraciones    │
│ M2 Recetas         │ M10 Documentos PDF    │ M13 RRHH             │
│ M3 Catalogo        │ M14 Notificaciones    │ M15 Agentes          │
│ M4 Compras         │                       │                      │
│ M5 Inventario      │ ► 3-5 clientes        │ ► Diferenciacion     │
│ M6 Produccion      │                       │   competitiva        │
│ M7 Direccion       │                       │                      │
│                    │                       │ Acumulacion datos     │
│ ► 1 piloto pagable │                       │ para XGBoost (180d)  │
```

## Resumen de modulos (16 + 1 base)

| # | Modulo | Fase | Tablas | Descripcion |
|---|---|---|---|---|
| D0 | Identidad | MVP | 6 | Multi-tenant, RBAC, audit, 13 roles |
| M1 | Comercial | MVP | 7 | Eventos, BEO, clientes, salas, servicios |
| M2 | Recetas | MVP | 7 | Escandallos, alergenos, fichas, sub-recetas |
| M3 | Catalogo | MVP | 9 | Productos, proveedores, ofertas, config, incidencias |
| M4 | Compras | MVP | 8 | Necesidades, POs, recepciones, OCR, sugeridos |
| M5 | Inventario | MVP | 8 | FIFO, lotes, merma, transfers, auditoria forense |
| M6 | Produccion | MVP | 8 | Plan por partida, KDS, mise en place, plantillas repetitivas |
| M7 | Direccion | MVP | 3 | Dashboard KPIs, food cost por servicio/evento |
| M8 | Automatizacion | F2 | 4 | Jobs async, webhooks, domain events (20 contratos) |
| M9 | Compliance | F2 | 5 | APPCC, temperaturas, etiquetado QR, trazabilidad, reglas caducidad |
| M10 | Documentos | F2 | — | PDFs: fichas tecnicas, BEO, hojas produccion |
| M11 | Analytics+ML | F3 | 7 | XGBoost forecast, 3 modelos ML, product scoring, 10 agentes |
| M12 | Integraciones | F3 | — | Mews, OPERA, Lightspeed, Simphony |
| M13 | RRHH | F3 | 4 | Turnos, fichajes, cuadrantes, horas_objetivo |
| M14 | Notificaciones | F2 | — | In-app, email, push, WhatsApp |
| M15 | Agentes | F3 | 2 | Swarm automejora (5 agentes), aprobacion manual |
| M16 | Marketplace | F4+ | — | Recetas, proveedores, plugins |

**Totales:** ~78 tablas, 15 agentes autonomos, 4 modelos ML, 5 APIs externas, 20 domain event contracts

---

*Documento generado el 2026-04-14. Actualizado con specs de GitHub rai1001/ChefOs + Arquitectura Agentes y Forecasting (boveda Obsidian).*
*Fuentes: ChefOS v1 (57 RPCs), 20 competidores, GastroChain OS, research GPT, specs GitHub (20 docs modulo), arquitectura agentes/ML.*
