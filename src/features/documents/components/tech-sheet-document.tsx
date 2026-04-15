// Ficha Técnica de Receta — @react-pdf/renderer
// Importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TechSheetData } from '../types'
import {
  RECIPE_CATEGORY_LABELS,
  RECIPE_DIFFICULTY_LABELS,
  ALLERGEN_LABELS,
  DIETARY_TAG_LABELS,
} from '@/features/recipes/types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  header: {
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 8,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  hotelName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  docTitle: { fontSize: 9, color: '#666', marginTop: 2 },
  recipeName: { fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  recipeCategory: { fontSize: 9, color: '#666', textAlign: 'right', marginTop: 2 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#555',
    marginBottom: 4,
    marginTop: 12,
    borderBottom: '0.5px solid #ccc',
    paddingBottom: 2,
  },
  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  infoBox: {
    borderRadius: 4,
    border: '0.5px solid #ddd',
    padding: '4px 8px',
    alignItems: 'center',
    minWidth: 60,
  },
  infoValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  infoLabel: { fontSize: 7, color: '#888', marginTop: 1 },
  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: {
    borderRadius: 3,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    color: '#444',
  },
  allergenTag: {
    borderRadius: 3,
    backgroundColor: '#fff3cd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    color: '#856404',
  },
  // Ingredients table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottom: '0.3px solid #e5e5e5',
  },
  colIngredient: { flex: 1 },
  colQty: { width: 55, textAlign: 'right' },
  colWaste: { width: 40, textAlign: 'right', color: '#888' },
  colNet: { width: 55, textAlign: 'right' },
  colUnit: { width: 35, textAlign: 'right', color: '#888' },
  colCost: { width: 55, textAlign: 'right', color: '#444' },
  colTotal: { width: 55, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tableHeaderText: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#555' },
  // Steps
  stepRow: { flexDirection: 'row', marginBottom: 6, gap: 8 },
  stepNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: { fontSize: 8, color: '#fff', fontFamily: 'Helvetica-Bold' },
  stepContent: { flex: 1 },
  stepInstruction: { color: '#1a1a1a', lineHeight: 1.4 },
  stepMeta: { color: '#888', fontSize: 8, marginTop: 2 },
  // Cost summary
  costBox: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 24,
    borderTop: '0.5px solid #ddd',
    paddingTop: 8,
  },
  costItem: { alignItems: 'flex-end' },
  costLabel: { color: '#666', fontSize: 8 },
  costValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  fcBadge: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#c00',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#888',
    fontSize: 7,
    borderTop: '0.5px solid #ccc',
    paddingTop: 4,
  },
})

function fmt(n: number | null | undefined, decimals = 3) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function fmtEur(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}

interface Props {
  data: TechSheetData
}

export function TechSheetDocument({ data }: Props) {
  const { recipe, ingredients, steps, hotel_name } = data
  const generatedAt = new Date().toLocaleString('es-ES')

  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0) + (recipe.rest_time_min ?? 0)

  return (
    <Document title={`Ficha Técnica — ${recipe.name}`} author="ChefOS v2">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{hotel_name}</Text>
            <Text style={styles.docTitle}>Ficha Técnica de Receta</Text>
          </View>
          <View>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <Text style={styles.recipeCategory}>
              {RECIPE_CATEGORY_LABELS[recipe.category]} · {RECIPE_DIFFICULTY_LABELS[recipe.difficulty]}
            </Text>
          </View>
        </View>

        {/* Info grid */}
        <Text style={styles.sectionTitle}>Información general</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoValue}>{recipe.servings}</Text>
            <Text style={styles.infoLabel}>Raciones</Text>
          </View>
          {recipe.prep_time_min != null && (
            <View style={styles.infoBox}>
              <Text style={styles.infoValue}>{recipe.prep_time_min}{"'"}</Text>
              <Text style={styles.infoLabel}>Prep.</Text>
            </View>
          )}
          {recipe.cook_time_min != null && (
            <View style={styles.infoBox}>
              <Text style={styles.infoValue}>{recipe.cook_time_min}{"'"}</Text>
              <Text style={styles.infoLabel}>Cocción</Text>
            </View>
          )}
          {recipe.rest_time_min != null && (
            <View style={styles.infoBox}>
              <Text style={styles.infoValue}>{recipe.rest_time_min}{"'"}</Text>
              <Text style={styles.infoLabel}>Reposo</Text>
            </View>
          )}
          {totalTime > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoValue}>{totalTime}{"'"}</Text>
              <Text style={styles.infoLabel}>Total</Text>
            </View>
          )}
          {recipe.food_cost_pct > 0 && (
            <View style={styles.infoBox}>
              <Text style={[styles.infoValue, { color: recipe.food_cost_pct > 35 ? '#c00' : '#1a1a1a' }]}>
                {recipe.food_cost_pct.toFixed(1)}%
              </Text>
              <Text style={styles.infoLabel}>Food cost</Text>
            </View>
          )}
          {recipe.target_price != null && (
            <View style={styles.infoBox}>
              <Text style={styles.infoValue}>{fmtEur(recipe.target_price)}</Text>
              <Text style={styles.infoLabel}>PVP obj.</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {recipe.description && (
          <>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={{ color: '#444', lineHeight: 1.4 }}>{recipe.description}</Text>
          </>
        )}

        {/* Allergens */}
        {recipe.allergens.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Alérgenos</Text>
            <View style={styles.tagRow}>
              {recipe.allergens.map((a) => (
                <Text key={a} style={styles.allergenTag}>
                  {ALLERGEN_LABELS[a] ?? a}
                </Text>
              ))}
            </View>
          </>
        )}

        {/* Dietary tags */}
        {recipe.dietary_tags.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Etiquetas dietéticas</Text>
            <View style={styles.tagRow}>
              {recipe.dietary_tags.map((t) => (
                <Text key={t} style={styles.tag}>
                  {DIETARY_TAG_LABELS[t] ?? t}
                </Text>
              ))}
            </View>
          </>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ingredientes ({ingredients.length})</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.colIngredient, styles.tableHeaderText]}>Ingrediente</Text>
              <Text style={[styles.colQty, styles.tableHeaderText]}>Bruto</Text>
              <Text style={[styles.colWaste, styles.tableHeaderText]}>Merma%</Text>
              <Text style={[styles.colNet, styles.tableHeaderText]}>Neto</Text>
              <Text style={[styles.colUnit, styles.tableHeaderText]}>Ud.</Text>
              <Text style={[styles.colCost, styles.tableHeaderText]}>€/ud</Text>
              <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
            </View>
            {ingredients.map((ing) => {
              const lineTotal = (ing.unit_cost ?? 0) * (ing.quantity_net ?? ing.quantity_gross)
              return (
                <View key={ing.id} style={styles.tableRow}>
                  <Text style={styles.colIngredient}>{ing.ingredient_name}</Text>
                  <Text style={styles.colQty}>{fmt(ing.quantity_gross)}</Text>
                  <Text style={styles.colWaste}>{ing.waste_pct > 0 ? ing.waste_pct + '%' : '—'}</Text>
                  <Text style={styles.colNet}>{fmt(ing.quantity_net)}</Text>
                  <Text style={styles.colUnit}>{ing.unit?.abbreviation ?? '—'}</Text>
                  <Text style={styles.colCost}>{fmtEur(ing.unit_cost)}</Text>
                  <Text style={styles.colTotal}>{fmtEur(lineTotal)}</Text>
                </View>
              )
            })}
          </>
        )}

        {/* Cost summary */}
        <View style={styles.costBox}>
          {recipe.total_cost > 0 && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Coste total</Text>
              <Text style={styles.costValue}>{fmtEur(recipe.total_cost)}</Text>
            </View>
          )}
          {recipe.cost_per_serving > 0 && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Coste / ración</Text>
              <Text style={styles.costValue}>{fmtEur(recipe.cost_per_serving)}</Text>
            </View>
          )}
          {recipe.food_cost_pct > 0 && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Food cost</Text>
              <Text style={[styles.costValue, styles.fcBadge]}>
                {recipe.food_cost_pct.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Steps */}
        {steps.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Elaboración</Text>
            {steps.map((step) => (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step_number}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                  {(step.duration_min || step.temperature || step.equipment) && (
                    <Text style={styles.stepMeta}>
                      {[
                        step.duration_min ? `${step.duration_min} min` : null,
                        step.temperature ? `${step.temperature}` : null,
                        step.equipment ? step.equipment : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {step.notes && (
                    <Text style={[styles.stepMeta, { fontStyle: 'italic' }]}>{step.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Notes */}
        {recipe.notes && (
          <>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={{ color: '#444', lineHeight: 1.4 }}>{recipe.notes}</Text>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ChefOS v2 — {hotel_name}</Text>
          <Text>Generado: {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
