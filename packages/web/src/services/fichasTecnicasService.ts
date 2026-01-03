/**
 * @file src/services/fichasTecnicasService.ts
 * @description CRUD service for Fichas Técnicas with versioning support.
 */

import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS, COLLECTIONS as collections } from '@/config/collections';
import { calcularCostosFicha } from './costosService';
import type {
  FichaTecnica,
  CreateFichaDTO,
  UpdateFichaDTO,
  VersionFicha,
  Recipe,
  Ingredient,
  IngredienteFicha,
} from '@/types';
import { where, orderBy, documentId } from '@/utils/mockFirestore';

/**
 * Creates a new Ficha Técnica.
 */
export async function crearFichaTecnica(
  data: CreateFichaDTO,
  userId: string
): Promise<FichaTecnica> {
  // 1. Calculate costs automatically
  const costos = await calcularCostosFicha(data);

  const id = uuidv4();
  const now = new Date().toISOString();

  const ficha: FichaTecnica = {
    ...(data as any),
    id,
    version: 1,
    activa: true,
    costos,
    creadoPor: userId,
    fechaCreacion: now,
    ultimaModificacion: now,
  };

  // E2E Mock Bypass for Create
  const mockDBStr = localStorage.getItem('E2E_MOCK_DB');
  if (mockDBStr) {
    const db = JSON.parse(mockDBStr);
    if (!db.fichasTecnicas) db.fichasTecnicas = [];
    db.fichasTecnicas.push({ ...ficha, id });
    localStorage.setItem('E2E_MOCK_DB', JSON.stringify(db));
    return { ...ficha, id };
  }

  // 2. Save to Firestore
  const generatedId = await firestoreService.create(collections.FICHAS_TECNICAS, ficha as any);

  return { ...ficha, id: generatedId };
}

/**
 * Gets the active version of a Ficha Técnica.
 */
export async function obtenerFichaTecnica(id: string): Promise<FichaTecnica | null> {
  // E2E Mock Bypass
  const mockDB = localStorage.getItem('E2E_MOCK_DB');
  if (mockDB) {
    try {
      const db = JSON.parse(mockDB);
      return db.fichasTecnicas?.find((f: any) => f.id === id) || null;
    } catch (e) {
      console.error(e);
    }
  }

  const ficha = await firestoreService.getById<FichaTecnica>(COLLECTIONS.FICHAS_TECNICAS, id);
  return ficha || null;
}

/**
 * Updates a Ficha Técnica with versioning.
 */
export async function actualizarFichaTecnica(
  id: string,
  updates: UpdateFichaDTO,
  userId: string,
  crearVersion = true
): Promise<FichaTecnica> {
  const currentFicha = await obtenerFichaTecnica(id);
  if (!currentFicha) throw new Error('Ficha not found');

  const now = new Date().toISOString();

  // E2E Mock Bypass for Update
  const mockDBStr = localStorage.getItem('E2E_MOCK_DB');
  if (mockDBStr) {
    const db = JSON.parse(mockDBStr);
    const index = db.fichasTecnicas.findIndex((f: any) => f.id === id);
    if (index !== -1) {
      const updatedData = {
        ...currentFicha,
        ...updates,
        version: crearVersion ? currentFicha.version + 1 : currentFicha.version,
        ultimaModificacion: now,
        modificadoPor: userId,
      };
      // Recalculate costs if needed
      if (updates.ingredientes || updates.porciones !== undefined) {
        updatedData.costos = await calcularCostosFicha(updatedData);
      }
      db.fichasTecnicas[index] = updatedData;
      localStorage.setItem('E2E_MOCK_DB', JSON.stringify(db));
      return updatedData;
    }
  }

  // 1. If versioning is requested, save current as a snapshot
  if (crearVersion) {
    const versionId = uuidv4();
    const snapshot: VersionFicha = {
      id: versionId,
      fichaId: id,
      version: currentFicha.version,
      snapshot: currentFicha,
      fechaVersion: now,
      cambiosRealizados: updates.notas || 'Actualización de versión',
      versionadaPor: userId,
    };
    await firestoreService.create(COLLECTIONS.VERSIONES_FICHAS, versionData);
  }

  // 2. Prepare updated data
  const updatedData = {
    ...currentFicha,
    ...updates,
    version: crearVersion ? currentFicha.version + 1 : currentFicha.version,
    ultimaModificacion: now,
    modificadoPor: userId,
  };

  // 3. Recalculate costs if ingredients or portions changed
  if (updates.ingredientes || updates.porciones !== undefined) {
    updatedData.costos = await calcularCostosFicha(updatedData);
  }

  // 4. Save updates
  await firestoreService.update(COLLECTIONS.FICHAS_TECNICAS, id, updatedData);

  return updatedData as FichaTecnica;
}

/**
 * Lists Fichas Técnicas for an outlet.
 */
export async function listarFichas(outletId: string): Promise<FichaTecnica[]> {
  // E2E Mock Bypass
  const mockDBStr = localStorage.getItem('E2E_MOCK_DB');
  if (mockDBStr) {
    try {
      const db = JSON.parse(mockDBStr);
      return (db.fichasTecnicas || []).filter(
        (f: any) => f.outletId === outletId && f.activa !== false
      );
    } catch (e) {
      console.error('E2E Mock Read Error', e);
    }
  }

  /*
  // Original usage was getDocs with an array of constraints.
  // firestoreService.query signature: (ref, options, ...constraints)
  */
  const fichas = await firestoreService.query<FichaTecnica>(
    COLLECTIONS.FICHAS_TECNICAS,
    {},
    where('outletId', '==', outletId),
    where('active', '==', true),
    orderBy('nombre', 'asc')
  );
  return fichas;
}

/**
 * Soft deletes a Ficha Técnica.
 */
export async function eliminarFichaTecnica(id: string): Promise<void> {
  await firestoreService.update(COLLECTIONS.FICHAS_TECNICAS, id, { activa: false } as any);
}

/**
 * Duplicates an existing Ficha Técnica.
 */
export async function duplicarFicha(
  id: string,
  nuevoNombre: string,
  userId: string
): Promise<FichaTecnica> {
  const original = await obtenerFichaTecnica(id);
  if (!original) throw new Error('Ficha not found');

  const { id: _, version: __, ...rest } = original;
  return crearFichaTecnica(
    {
      ...rest,
      nombre: nuevoNombre,
      notas: `Duplicado de: ${original.nombre}`,
    } as any,
    userId
  );
}

/**
 * Converts a regular Recipe into a Ficha Técnica.
 */
export async function convertirRecetaAFicha(
  recipeId: string,
  outletId: string,
  userId: string
): Promise<string> {
  const recipe = await firestoreService.getById<Recipe>(COLLECTIONS.RECIPES, recipeId);
  if (!recipe) throw new Error('Receta no encontrada');

  // Fetch ingredients efficiently with batching (limit 30 per query)
  const ingredientIds = [...new Set(recipe.ingredients.map((i) => i.ingredientId))];
  const chunks = [];
  for (let i = 0; i < ingredientIds.length; i += 30) {
    chunks.push(ingredientIds.slice(i, i + 30));
  }

  const inventoryChunks = await Promise.all(
    chunks.map((chunk) =>
      firestoreService.query<Ingredient>(
        COLLECTIONS.INGREDIENTS as any,
        {},
        where(documentId(), 'in', chunk)
      )
    )
  );

  const inventory = inventoryChunks.flat();
  const ingredientMap = new Map<string, Ingredient>(inventory.map((i) => [i.id, i]));

  const ingredientesFicha: IngredienteFicha[] = recipe.ingredients.map((ri) => {
    const inv = ingredientMap.get(ri.ingredientId);
    const costoUnitario = inv?.costPerUnit || 0;
    return {
      ingredienteId: ri.ingredientId,
      nombre: inv?.name || 'Ingrediente Desconocido',
      cantidad: ri.quantity,
      unidad: (inv?.unit || 'u') as any,
      costoUnitario,
      costoTotal: ri.quantity * costoUnitario,
      esOpcional: false,
    };
  });

  const costoTotal = ingredientesFicha.reduce((acc, i) => acc + i.costoTotal, 0);
  const yieldPax = recipe.yieldPax || 1;

  const dto: CreateFichaDTO = {
    nombre: recipe.name,
    categoria: 'comida',
    descripcion: `Ficha técnica generada automáticamente desde la receta: ${recipe.name}`,
    porciones: yieldPax,
    ingredientes: ingredientesFicha,
    pasos: [],
    tiempoPreparacion: 30,
    tiempoCoccion: 0,
    dificultad: 'media',
    costos: {
      ingredientes: costoTotal,
      total: costoTotal,
      porPorcion: costoTotal / yieldPax,
    },
    pricing: {
      precioVentaSugerido: (costoTotal / yieldPax) * 3,
      margenBruto: 66,
      margenObjetivo: 70,
    },
    creadoPor: userId,
    outletId,
    notas: `Diferencial de costo respecto a receta base: 0`,
  };

  const fichaId = await crearFichaTecnica(dto as any, userId);
  return typeof fichaId === 'string' ? fichaId : (fichaId as any).id;
}

/**
 * Lists all versions (snapshots) for a specific Ficha Técnica.
 */
export async function listarVersionesFicha(fichaId: string): Promise<VersionFicha[]> {
  const versiones = await firestoreService.query<VersionFicha>(
    COLLECTIONS.VERSIONES_FICHAS,
    {},
    where('fichaId', '==', fichaId),
    orderBy('version', 'desc')
  );
  return versiones;
}

/**
 * Gets a specific version snapshot.
 */
export async function obtenerVersionSnapshot(versionId: string): Promise<VersionFicha | null> {
  const version = await firestoreService.getById<VersionFicha>(
    COLLECTIONS.VERSIONES_FICHAS,
    versionId
  );
  return version || null;
}
