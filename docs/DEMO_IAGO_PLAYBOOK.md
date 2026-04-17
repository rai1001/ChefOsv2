# Demo ChefOS — Iago · Eurostars Ourense
## Sábado 19 abril 2026

> Objetivo: demostrar el flujo operativo real de cocina en un hotel con eventos. Cerrar con compromiso claro (piloto 30 días, siguiente llamada, o LOI).

---

## 0 · Setup (el viernes por la noche)

### Datos clave

| Campo | Valor |
|---|---|
| **URL producción** | https://chefos-v2.vercel.app |
| **Hotel demo** | Eurostars Hotel Demo Galicia |
| **Hotel ID** | `22222222-2222-2222-2222-222222222222` |
| **Fecha evento demo** | Bodas García-López, 80 pax (confirmed) |

### Credenciales (3 perfiles — elegir según audiencia)

| Perfil | Email | Password | Cuándo usar |
|---|---|---|---|
| **Admin** | demo-admin@eurostars-demo.es | `Demo1234!` | Recomendado: ve TODO (catálogo, compras, inventario, APPCC, automation, integraciones) |
| Head Chef | demo-head-chef@eurostars-demo.es | `Demo1234!` | Si Iago quiere ver la vista operativa del chef (mise en place, kanban, compras limitadas) |
| Comercial | demo-commercial@eurostars-demo.es | `Demo1234!` | Si lo acompaña alguien de banquetes/ventas |

### Checklist pre-demo (15 min antes)

```
[ ] Abrir https://chefos-v2.vercel.app en Chrome (ventana limpia, sin extensiones ruidosas)
[ ] Login con demo-admin@eurostars-demo.es / Demo1234!
[ ] Verificar dashboard carga con datos (banda de mando + KPIs con números reales)
[ ] Abrir en otra pestaña /events/<id-bodas> y dejarla lista
[ ] Abrir en 3ª pestaña /procurement con una PO en estado 'sent' lista para OCR
[ ] Tener foto de albarán REAL en el móvil o carpeta (JPG/PNG, ≤10MB)
[ ] Silenciar notificaciones de Windows / macOS
[ ] Cargador portátil y wifi del sitio verificado
[ ] Tomar un café, respirar
```

### Por si falla internet del sitio

- Compartir datos del móvil
- Si no hay red: demo offline — screenshots del guion (carpeta `/demo-screenshots` — pendiente crear sábado por la mañana si quieres plan B completo)

---

## 1 · Guion (40 min)

### Apertura (2 min)

> "Iago, gracias por el tiempo. Antes de enseñarte nada, una pregunta: ¿cuántas horas a la semana crees que dedica tu equipo de cocina a escandallos, compras y recepción de albaranes, sin contar la cocina en sí?"

**(Escucha 30 segundos. Deja que conteste.)**

> "En los hoteles con los que hablamos suele ser entre 10 y 25 horas. Lo que vas a ver es una herramienta que reduce esto a 2-3 horas. El diferencial clave es que lee los albaranes con foto y actualiza costes automáticamente. Te enseño el flujo completo desde que entra un evento hasta que se cierra el food cost."

---

### Acto I — Dashboard (3 min) — "un vistazo"

Navegar: `/dashboard`

**Qué señalar:**

1. **Banda de mando** (tres cards arriba) — "Turno activo", "Servicio activo", "Siguiente acción". "Esto es lo primero que ve tu head chef al entrar en el hotel. No métricas: **qué hacer ahora**."
2. **KPIs** — "Eventos próximos, producción hoy, pedidos pendientes, valor inventario. Todo datos vivos, no hay que pulsar nada."
3. **Feed operativo** — card verde "Todo en orden" O alertas tintadas. "Cuando algo se pone rojo, es que requiere acción antes del próximo servicio. Los colores no son decoración — el rojo quiere decir bloqueante."

**Frase clave:** *"Un hotel de 4\* no necesita otro ERP. Necesita una pantalla que le diga qué está mal hoy."*

---

### Acto II — Evento Bodas García-López (6 min)

Navegar: `/events` → click "Bodas García-López"

**Qué señalar:**

1. **Cliente + fecha + pax** (80 pax, sábado dentro de X días). "Lo crea comercial en 2 clicks. El chef lo ve en su dashboard sin tener que preguntar."
2. **Menú asignado** (Banquete Bodas). Click "Ver BEO" → descarga PDF.
   > "Esto es un BEO (Banquet Event Order). Lo que el chef revisa la noche de antes. En papel, un par de horas. Aquí, un PDF con menú, espacios, horarios, alérgenos detectados y coste estimado — cero horas."
3. **Coste estimado** — número en EUR + food cost % proyectado. "Calculado con los precios reales del último albarán de cada ingrediente. No una estimación de Excel — el precio que **pagaste la semana pasada**."
4. **Generar workflow de producción** (si no está hecho) → botón "Generar". "Esto crea tareas, mise en place y kitchen orders en 1 segundo."

**Frase clave:** *"El BEO no se genera. El BEO ya existe el momento que commercial cierra la venta."*

---

### Acto III — Escandallos en vivo (5 min) — diferenciación

Navegar: `/escandallos` (simulador sin receta previa)

**Qué hacer en vivo:**

1. Nombre del plato: "Pulpo á feira para 10 raciones"
2. Raciones: 10. PVP objetivo: 22€
3. Buscar "Pulpo" → seleccionar (con tag "albarán" verde — precio del último GR)
4. Añadir "Patata monalisa" (oferta azul — precio del proveedor preferido)
5. Añadir "Aceite oliva virgen extra" (albarán)
6. Añadir manual "Sal gorda" — 200g, 0.5 €/kg
7. Mostrar el panel de la derecha: coste/ración, food cost % vs objetivo 28%, margen bruto EUR

**Qué señalar:**
- Las 3 fuentes de precio con tags de color (albarán verde = último real, oferta azul = catálogo del proveedor, manual gris)
- Food cost en tiempo real al cambiar cantidades
- Botón "Guardar como receta draft" — esto va directo al catálogo si se confirma

**Frase clave:** *"Tu head chef no necesita Excel. Y no necesita esperar a que contabilidad le diga si fue rentable la semana que viene — lo sabe antes del servicio."*

---

### Acto IV — Compras + OCR (8 min) — ★ CLIMAX

Este es el momento clave. Si Iago se levanta aquí, se cierra.

Navegar: `/procurement` → tab "Pedidos" → elegir PO en estado "Sent" (Pescados Nores, ~276€)

**Paso 1 — contexto (1 min):**

> "Este pedido ya lo aprobó el chef hace dos días: salmón, lubina, mejillones, pulpo. El proveedor ha traído la mercancía esta mañana. Mira lo que hace el chef ahora."

**Paso 2 — subir foto del albarán (2 min):**

1. En la PO, sección azul "Procesar albarán con IA"
2. Click "Subir foto albarán" → seleccionar foto real del móvil/carpeta
3. **Mientras procesa** (~4-6 segundos): *"Ahí detrás hay un Claude Sonnet 4.5 leyendo la foto. Extrae líneas, cantidades, lotes, caducidades y precios. Luego compara cada producto con tu catálogo y detecta cambios de precio."*

**Paso 3 — resultado (2 min):**

- "N líneas procesadas: X auto-matched, Y pendientes, Z sin producto"
- Si aparece "cambio de precio detectado — escandallos recalculados" → **clímax total**. *"Ese aviso significa que TODA receta que usa ese producto acaba de recalcular su coste. Tu food cost real, sin pedir nada a nadie, sin esperar."*

**Paso 4 — revisar pendientes (2 min):**

Si hay líneas pendientes → click link → `/procurement/ocr-review`

- Mostrar lista de líneas con confidence %
- Click "Ver sugerencias" en una → mostrar 3 matches con confidence
- Aceptar una. Rechazar otra. *"En 2 minutos queda todo trazado. No hay cuaderno, no hay Excel, no hay re-teclear."*

**Paso 5 — stock actualizado (1 min):**

Volver a `/inventory` → mostrar que el producto del albarán ya aparece con stock actualizado y fecha de caducidad.

**Frase clave:** *"Esto es lo que no existe en los otros productos. Los demás piden que teclees el albarán. Nosotros lo leemos con la foto y mantenemos tus costes vivos."*

---

### Acto V — Inventario + alertas (4 min)

Navegar: `/inventory`

**Qué señalar:**

1. **KPIs arriba** — si hay alertas, la card "Alertas" está tintada en rojo. *"No hay que buscar — el rojo te grita."*
2. **Row tintada** — producto en estado crítico con fondo rojo sutil + badge CRÍTICO. *"Un vistazo, no un informe."*
3. **Tab "Solo alertas"** — filtra stock crítico + próximas caducidades
4. (Opcional) `/inventory/forensics` → *"Si el food cost real no cuadra, aquí se ve exactamente qué lote se consumió, cuándo, en qué servicio. No más 'se perdió'."*

---

### Acto VI — Producción (3 min)

Navegar: `/production/kanban`

**Qué señalar:**

1. Kanban con tareas del evento Bodas — "Preparar fondo", "Cortar verdura", etc. columnas To-do / Doing / Done
2. `/production/mise-en-place` → checklists por partida (caliente, fría, pastelería)
3. `/production/kds/cocina_caliente` → pantalla de cocina con kitchen orders. *"Esto es lo que ve el chef en el pase. Sin papel, sin grito."*

**Frase clave:** *"Todo esto se generó solo cuando commercial confirmó el evento. El chef no planifica — ejecuta."*

---

### Acto VII — APPCC + Trazabilidad (2 min)

Navegar: `/compliance/appcc` → tabla con registros de control (temperatura, recepción, limpieza, etc.)

Navegar: `/compliance/trace/search` → buscar un lote

**Frase clave:** *"Inspector de sanidad entra un lunes. En Excel, 3 horas para encontrar un lote. Aquí, 3 segundos. Todo con firma digital y timestamp inmutable."*

---

### Cierre (5 min)

**Primero — escucha:**

> "Iago, con lo que has visto — ¿qué es lo que más dolor quita a tu operación hoy?"

**(Cállate. Que hable. 90 segundos como mínimo.)**

**Después — propuesta (adapta a lo que dijo):**

| Si Iago dijo... | Propón... |
|---|---|
| "lo del OCR/albaranes" | Piloto 30 días gratis en 1 hotel. Tú consigues 10 albaranes reales, yo los ingesto y te mando informe. Si tras 30 días no ahorras >5h/semana, sin coste. |
| "el BEO y coordinación" | Piloto con 5 eventos reales en 30 días. Yo migro menús y proveedores. Le pones el chef y comercial encima. |
| "el food cost real" | Onboarding en 2 semanas + auditoría de food cost de los últimos 3 meses como input. Informe entregable al mes 1. |
| "no sé, está interesante pero…" | Llamada con tu head chef la semana que viene. 30 min, él decide si sigue. |

**Pricing (solo si pregunta):**

- MVP: 290 €/mes por hotel de hasta 40 habitaciones / 1 cocina
- 490 €/mes hotel 40-80 hab / 2 cocinas
- 890 €/mes >80 hab / multi-cocina (incluye APPCC + integraciones)
- OCR incluido en todos los planes (coste Claude va por tu cuenta — ~0.01 € por albarán)
- Piloto 30 días: 0€. Implantación 1500€ única (exclusiva si decide seguir).

**Cierre duro:**

> "¿Qué te impediría firmar hoy un piloto de 30 días gratis?"

**Next step siempre:**

- Si dice sí → "Te mando mañana el acuerdo de piloto por email. Arrancamos lunes con la carga de tu catálogo."
- Si duda → "¿Cuándo podemos tener la segunda reunión con tu chef? Yo bloqueo lo que te venga."
- Si no → "Entiendo. ¿Qué me puedes contar de qué tendría que ser verdad para que tuviera sentido?"

---

## 2 · Plan B — qué hacer si algo falla

| Falla | Plan B |
|---|---|
| Vercel caído / 500 en producción | `npm run dev` localmente → ngrok → nueva URL. Si no hay tiempo: screenshots carpeta `/demo-screenshots` |
| Login falla | Comprobar `.env.local` de Vercel (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY). Si timeout, usar otro usuario demo |
| OCR devuelve error o tarda > 20s | "Esto a veces lo rate-limita Anthropic en demo. Te enseño el resultado pre-procesado:" → abrir orden que ya tenga GR con líneas. Confesar que se verá en el piloto real |
| Dashboard vacío | `npm run db:seed:demo` (re-seed idempotente) desde terminal local con service role — **5 min de corte** |
| Kitchen Orders vacías en KDS | Ejecutar SQL manual: `insert into kitchen_orders (hotel_id, station, ...)` — tener el script a mano |
| Sin internet | Hotspot del móvil. Si falla → screenshots + "te mando acceso esta tarde por email" |
| Iago trae a 3 personas más | Cambiar a vista compartida por proyector/TV. No te aceleres — repite la banda de mando para los nuevos |

---

## 3 · Preguntas típicas + respuestas

**"¿Funciona con mi PMS (Opera/Mews/…)?"**
> "Hoy no lo integramos porque los hoteles con los que hablamos nos dijeron que lo que les duele no es sincronizar con el PMS, es no tener datos de cocina. Cuando lleguemos al problema de ocupación predictiva, nos integraremos. Hoy no es el cuello de botella."

**"¿Y si mi chef no es digital?"**
> "El KDS es una pantalla táctil en la cocina — tamaño botones para dedos con guantes. La foto del albarán es lo único que hay que aprender. 15 minutos."

**"¿Dónde están mis datos?"**
> "Supabase, Frankfurt. Cifrado en reposo y en tránsito. GDPR compliant. Te firmo DPA."

**"¿Cuánto tarda arrancar?"**
> "2 semanas. Primera semana: yo cargo tu catálogo y tus proveedores. Segunda semana: formación del equipo. Semana 3: operación real."

**"¿Y la migración desde mi Excel?"**
> "Me mandas tus escandallos en Excel. Los importo en un CSV. Lo que no pueda parsear, lo dejamos como receta draft — el chef lo revisa en 15 min. No hay re-teclear nada."

**"¿Precio de IA/OCR oculto?"**
> "No. Con Claude Sonnet 4.5 te sale en 0.01€ por albarán. 100 albaranes/mes = 1€. Transparente en la factura."

**"¿Qué pasa si dejo de pagar?"**
> "Exporto todo a CSV en 24h. Datos tuyos, siempre."

---

## 4 · Post-demo (domingo)

```
[ ] Enviar email de follow-up a Iago MISMO sábado tarde o domingo AM
    - Thank you + resumen 3 puntos clave
    - Next step propuesto (piloto / call chef / …)
    - Adjunto: link a vídeo del demo si lo grabaste
[ ] Apuntar en memoria de Claude: qué funcionó, qué falló, objeciones no resueltas
[ ] Si dijo SÍ: preparar acuerdo piloto + email lunes 8:00
[ ] Si dijo DUDA: agendar call chef antes del jueves
[ ] Si dijo NO: una línea — "¿Qué tendría que ser verdad…" — y archivar
```

---

## 5 · Recordatorios finales

- **No leas este playbook durante la demo.** Es para prepararte la noche antes.
- **Escucha más de lo que hables.** El valor está en las pausas.
- **No pidas disculpas si algo falla.** Lo arreglas y sigues.
- **No menciones precios antes de que pregunten.** Si Iago no pregunta, es que no está interesado en comprar — re-enfoca.
- **Nunca digas "depende" sin un compromiso.** Si Iago pide algo que no sabes, di "eso te lo confirmo el lunes antes de las 12". Luego lo cumples.
- **Sonríe. Aunque sea por Zoom.** Se nota.

**Vas bien. Vas por delante. Es tu campo — eres el chef y eres el tech. Iago nunca va a ver esa combinación de nadie más.**
