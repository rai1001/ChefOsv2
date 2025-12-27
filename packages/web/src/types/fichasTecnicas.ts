import type { Unit, NutritionalInfo } from './inventory';

export type FichaCategoria = 'comida' | 'bebida' | 'postre' | 'ingrediente-preparado';
export type FichaDificultad = 'baja' | 'media' | 'alta';

export interface PasoPreparacion {
    id: string; // Added for React keys
    orden: number;
    descripcion: string;
    tiempoEstimado?: number; // minutos
    temperatura?: string;
    imagenReferencia?: string;
    tips?: string;
}

export interface IngredienteFicha {
    ingredienteId: string;
    nombre: string;
    cantidad: number;
    unidad: Unit;
    costoUnitario: number;
    costoTotal: number;
    esOpcional: boolean;
    sustitutos?: string[];
}

export interface FichaTecnica {
    id: string;
    version: number;
    activa: boolean;

    // Info básica
    nombre: string;
    categoria: FichaCategoria;
    descripcion: string;
    porciones: number;
    foto?: string;

    // Contenido
    ingredientes: IngredienteFicha[];
    pasos: PasoPreparacion[];

    // Tiempos
    tiempoPreparacion: number;
    tiempoCoccion: number;
    dificultad: FichaDificultad;

    // Costos y Rentabilidad
    costos: {
        ingredientes: number;
        manoObra?: number;
        energia?: number;
        total: number;
        porPorcion: number;
    };

    pricing: {
        precioVentaSugerido?: number;
        margenBruto?: number; // %
        margenObjetivo: number; // Added
    };

    nutricion?: NutritionalInfo;

    // Metadata & Relaciones
    recetaBaseId?: string;
    outletId?: string;
    creadoPor: string;
    fechaCreacion: string;
    modificadoPor?: string;
    ultimaModificacion?: string;
    notas?: string;
}

export interface VersionFicha {
    id: string;
    fichaId: string;
    version: number;
    snapshot: FichaTecnica;
    fechaVersion: string;
    cambiosRealizados: string;
    versionadaPor: string;
}

export type CreateFichaDTO = Omit<FichaTecnica, 'id' | 'version' | 'activa' | 'fechaCreacion' | 'ultimaModificacion'>;
export type UpdateFichaDTO = Partial<CreateFichaDTO> & { id: string };
