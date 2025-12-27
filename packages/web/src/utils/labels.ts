// Translations and label mappings

export const roleLabels: Record<string, string> = {
    'HEAD_CHEF': 'Jefe Cocina',
    'COOK_MORNING': 'Cocinero Mañanas',
    'COOK_ROTATING': 'Cocinero Rotativo'
};

export const shiftTypeLabels: Record<string, string> = {
    'MORNING': 'Mañana',
    'AFTERNOON': 'Tarde',
    'OFF': 'Libre'
};

export const purchaseStatusLabels: Record<string, string> = {
    'DRAFT': 'Borrador',
    'ORDERED': 'Pedido',
    'RECEIVED': 'Recibido',
    'CANCELLED': 'Cancelado'
};

export const wasteReasonLabels: Record<string, string> = {
    'CADUCIDAD': 'Caducidad',
    'ELABORACION': 'Error Elaboración',
    'DETERIORO': 'Deterioro',
    'EXCESO_PRODUCCION': 'Exceso Producción',
    'OTROS': 'Otros'
};

export const pccTypeLabels: Record<string, string> = {
    'FRIDGE': 'Nevera',
    'FREEZER': 'Congelador',
    'HOT_HOLDING': 'Mantenimiento Caliente',
    'COOLING': 'Enfriamiento',
    'OTHER': 'Otro'
};

/**
 * Get localized label for a role
 */
export const getRoleLabel = (role: string): string => {
    return roleLabels[role] || role.replace('_', ' ');
};

/**
 * Get localized label for a shift type
 */
export const getShiftLabel = (type: string): string => {
    return shiftTypeLabels[type] || type;
};
