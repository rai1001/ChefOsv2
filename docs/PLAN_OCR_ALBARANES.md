# Plan OCR de albaranes — sprint post-demo

> Fase 4 Bloque A. Decisiones tomadas 2026-04-16 con Israel.
>
> **Stack:** Claude Vision (Sonnet 4.6) vía Anthropic API. Edge Function en Supabase. Storage en bucket `delivery-notes`.
> **NO usar:** Mistral Pixtral (fallback opcional), Google Document AI (más complejo, mejor reservar).

---

## Por qué Claude Vision como primario

| Criterio | Claude Sonnet 4.6 | Mistral Pixtral | Google Doc AI |
|---|---|---|---|
| Setup | API key, 2 min | API key + endpoint | Crear processor + ML model |
| Coste/foto | ~$0.005 | gratis (free tier) / ~$0.002 | $1.50 / 1000 págs |
| Output JSON estructurado | Tool use nativo | Function calling | Forma JSON propietaria |
| Razonamiento contextual | Excelente (typos, abreviaturas, "kgs" vs "kg") | Bueno | Limitado a structure |
| Manejo de tablas | Muy bueno con prompt | Bueno | Excelente |
| Multilingüe español | Perfecto | Bueno | Bueno |

Mistral como **fallback** si Claude falla o el coste se dispara.

---

## Arquitectura

```
Usuario en /procurement/orders/[id]
   │
   ├─→ "📷 Subir foto albarán" → upload a Supabase Storage (bucket delivery-notes)
   │                              │
   │                              └─→ insert en goods_receipts.delivery_note_image (URL)
   │
   ├─→ Trigger encolar job: enqueue_job(type='ocr_receipt', payload={receipt_id, image_url})
   │
   └─→ automation-worker procesa → Edge Function ocr-receipt
                                      │
                                      ├─→ download imagen desde Storage
                                      ├─→ Claude Vision API (tool use → JSON)
                                      ├─→ ocr_data = JSON estructurado
                                      ├─→ RPC process_ocr_receipt(receipt_id, ocr_data)
                                      │     │
                                      │     ├─→ match_product_by_alias por cada línea
                                      │     ├─→ crear goods_receipt_lines
                                      │     ├─→ trigger auto crea stock_lots (ya existe 00009)
                                      │     ├─→ detectar cambios precio vs PO
                                      │     └─→ si delta > 5%: alert + recalcular escandallos
                                      │
                                      └─→ notification al usuario "Albarán procesado, 2 ítems requieren revisión"
```

---

## Esquema JSON que devuelve Claude Vision

```json
{
  "supplier_name_detected": "Pescados Nores S.L.",
  "delivery_note_number": "ALB-2026-04812",
  "delivery_date": "2026-04-23",
  "lines": [
    {
      "raw_text": "Pulpo congelado 8 kg",
      "product_name_extracted": "Pulpo congelado",
      "quantity": 8.0,
      "unit": "kg",
      "unit_price": 18.50,
      "line_total": 148.00,
      "lot_number": "L-NORES-2604-A",
      "expiry_date": "2026-07-23",
      "match_confidence": null
    }
  ],
  "subtotal": 384.00,
  "vat_amount": 38.40,
  "total": 422.40,
  "warnings": ["línea 3 ilegible parcialmente", "fecha caducidad no encontrada en línea 4"]
}
```

---

## Tareas (orden de ejecución)

### Bloque 1 — Backend (4-5h)

- [ ] **Migración 00039** — `purchase_order_lines.last_unit_price` (snapshot histórico) + tabla `price_change_log` (product_id, old_price, new_price, source, detected_at)
- [ ] **RPC `match_product_by_alias(p_hotel_id, p_query text)`** — devuelve `{product_id, name, confidence}` ordenado. Estrategia: ILIKE > similarity (pg_trgm) > unaccent. Confidence ≥ 0.85 = auto-match
- [ ] **RPC `process_ocr_receipt(p_hotel_id, p_receipt_id, p_ocr_data jsonb)`**:
  - Por cada `lines[i]`: llamar a `match_product_by_alias`. Si match ≥ 0.85, crear `goods_receipt_lines` directo. Si < 0.85, marcar `quality_status='partial'` + `rejection_reason='ocr_review_needed'`
  - Insertar `lot_number` y `expiry_date` extraídos
  - Detectar cambios de precio vs `purchase_order_lines.unit_price` correspondiente
  - Si cambio precio > 5%: insert en `price_change_log` + crear `alert(type='cost_overrun')`
  - Devolver `{lines_processed, lines_pending_review, price_alerts}`
- [ ] **Trigger** `trg_recalc_recipe_costs_on_price_change`: cuando `price_change_log` insert → llamar `_recalc_recipes_using_product(product_id)` que actualice `recipe_ingredients.unit_cost` y `recipes.cost_per_serving` en cascada
- [ ] **Edge Function `ocr-receipt`**:
  - Input: `{receipt_id, image_url}` (vía automation_jobs)
  - Download imagen de Storage con service_role
  - Llamar a Anthropic API con prompt + tool use (schema JSON arriba)
  - Llamar a `process_ocr_receipt` RPC
  - Marcar job como completed + emitir notification

### Bloque 2 — Storage (30 min)

- [ ] Crear bucket `delivery-notes` (público o firmado, decidir con Israel)
- [ ] Policy: solo miembros del hotel pueden upload/read sus albaranes (path `{hotel_id}/{receipt_id}.jpg`)
- [ ] Migración de RLS para `goods_receipts.delivery_note_image`

### Bloque 3 — UI (3-4h)

- [ ] **Componente `<DeliveryNoteUpload />`** en `/procurement/orders/[id]`:
  - Botón "📷 Subir foto albarán" (mobile-first: capture="environment")
  - Preview de imagen subida
  - Spinner mientras OCR procesa (poll `automation_jobs.status`)
  - Mostrar resultado: "X líneas procesadas automáticamente, Y requieren revisión"
- [ ] **Pantalla `/procurement/orders/[id]/review-ocr`**:
  - Lista de líneas con `quality_status='partial'`
  - Por cada una: texto extraído + dropdown de productos sugeridos (top 3 por confidence)
  - Drag para reasignar producto, ajustar cantidad/precio
  - Botón "Confirmar y crear stock"
- [ ] **Banner en orden** si hay `price_change_log` reciente: "⚠️ 3 productos cambiaron de precio. Escandallos recalculados. Ver impacto."

### Bloque 4 — QA + ajuste prompt (2h)

- [ ] Crear 5 albaranes de prueba (foto real + sintéticos): Pescados Nores, Carnes Bandeira, distribuidor genérico, factura escaneada borrosa, ticket pequeño
- [ ] Iterar prompt de Claude Vision hasta 90%+ accuracy en lineas
- [ ] Documentar coste real por imagen
- [ ] Test end-to-end: subir foto → matching → stock actualizado → escandallo recalculado → alert si precio cambió

### Bloque 5 — Documentación (30 min)

- [ ] Actualizar README con sección "OCR de albaranes"
- [ ] Documentar cómo añadir alias para productos mal detectados
- [ ] Memoria sesión actualizada

---

## Estimación total

| Bloque | Horas |
|---|---|
| Backend (migración + RPCs + Edge Function) | 4-5h |
| Storage + RLS | 0.5h |
| UI (upload + review pantalla) | 3-4h |
| QA + ajuste prompt | 2h |
| Docs | 0.5h |
| **TOTAL** | **10-12h** |

Realista: **2-3 jornadas** de trabajo concentrado.

---

## Métricas de éxito

- ≥85% líneas auto-matched sin intervención humana
- ≥90% accuracy en cantidades y precios extraídos
- <30s desde upload foto hasta stock actualizado
- 0 errores que crucen un albarán con otro pedido
- Coste API < €0.01/albarán

---

## Decisiones aún pendientes (preguntar antes de empezar)

1. ¿Bucket `delivery-notes` público o firmado? (público = simple pero URLs adivinables; firmado = más seguro pero más overhead)
2. ¿Mostrar las imágenes en el detalle del GR para auditoría posterior?
3. ¿Permitir múltiples albaranes por una misma PO (caso real cuando llega en varios viajes)?
4. ¿Notificar por email al head_chef cuando cambia precio en albarán o solo in-app?
5. ¿Qué hacer si el OCR detecta un producto que NO está en el catálogo? (auto-crear como pending review vs descartar)
