export const generateSocialChefPrompt = (recipeName: string, businessType: string) => `
ROL: Actúa como un experto en Marketing Gastronómico.

ANÁLISIS DE IMAGEN:
Analiza esta imagen del plato "${recipeName}" y determina:
1. Nivel de sofisticación del emplatado (alta gastronomía vs. cocina casera)
2. Técnicas culinarias visibles
3. Presentación general (moderna, tradicional, rústica, minimalista)

TONO DE COMUNICACIÓN:
- Si detectas presentación sofisticada/moderna/minimalista → Usa tono ELEGANTE y PREMIUM (apropiado para Hotel de lujo)
- Si detectas presentación casera/abundante/rústica → Usa tono CERCANO y CÁLIDO (apropiado para Restaurante familiar)

TIPO DE NEGOCIO: ${businessType}

GENERA (formato JSON estricto):
{
  "copy": "Descripción apetecible para Instagram (80-120 caracteres, incluye 2-3 emojis estratégicos)",
  "hashtags": [
    "Array de 10 hashtags",
    "OBLIGATORIO incluir: #Galicia",
    "Mezcla hashtags populares (#foodporn, #instafood) con nicho gastronómico (#GaliciaCuisine)",
    "Incluye hashtag de ciudad/región"
  ],
  "suggestedTime": "HH:mm - Justificación breve (ej: 13:30 - Hora de apetito pre-comida)",
  "toneUsed": "premium | casual"
}

IMPORTANTE:
- Responde ÚNICAMENTE con el JSON, sin texto adicional
- No uses markdown, no uses backticks
- Asegura que el JSON sea válido y parseable
`;

export const generateSocialManagerPrompt = (
  contentType: 'EVENTO' | 'INSTALACIONES' | 'PROMOCION' | 'GENERAL',
  businessType: 'HOTEL' | 'RESTAURANT',
  additionalContext?: string
) => {
  const contentTypePrompts = {
    EVENTO: `
TIPO DE CONTENIDO: Evento
- Identifica: tipo de evento, ambiente, momento del día
- Genera expectativa y FOMO (Fear of Missing Out)
- Usa lenguaje emocional que invite a participar
- Si ves fecha/hora, inclúyela; si no, usa formato genérico ("Próximamente")
`,
    INSTALACIONES: `
TIPO DE CONTENIDO: Instalaciones/Local
- Destaca: confort, diseño, experiencia del espacio
- Usa lenguaje sensorial (luz, texturas, atmósfera)
- Enfócate en beneficios emocionales y experienciales
- Crea deseo de visitar/conocer el lugar
`,
    PROMOCION: `
TIPO DE CONTENIDO: Promoción/Oferta
- Detecta: tipo de oferta, descuento, urgencia
- Crea sentido de urgencia sin ser agresivo
- Call-to-action claro y persuasivo
- Usa verbos de acción (Reserva, Descubre, Aprovecha)
`,
    GENERAL: `
TIPO DE CONTENIDO: Publicidad General
- Adapta al contenido visual detectado
- Mantén versatilidad para reutilización
- Enfoque en brand awareness y valores de marca
`,
  };

  return `
ROL: Actúa como un Social Media Manager Senior con 10+ años de experiencia en marketing gastronómico y hotelero.

ANÁLISIS DE IMAGEN:
Analiza esta imagen en detalle:
1. Elementos visuales clave (colores dominantes, personas, productos, ambiente)
2. Momento/ocasión (día/noche, casual/formal, temporada del año)
3. Emociones que transmite
4. Target audience implícito

${contentTypePrompts[contentType]}

CONTEXTO ADICIONAL: ${additionalContext || 'No proporcionado'}
TIPO DE NEGOCIO: ${businessType}

CONSIDERACIONES DE TONO:
${
  businessType === 'HOTEL'
    ? '- Tono PREMIUM, SOFISTICADO, EXPERIENCIAL (hotel de lujo)'
    : '- Tono CERCANO, APASIONADO, FOODIE (restaurante acogedor)'
}

GENERA CONTENIDO PARA MÚLTIPLES PLATAFORMAS (JSON estricto):

{
  "analysis": {
    "visualElements": ["elemento1", "elemento2", "elemento3"],
    "detectedMoment": "Descripción del momento/contexto",
    "suggestedObjective": "Objetivo de comunicación sugerido"
  },
  "content": {
    "instagram": {
      "copy": "Copy de 100-150 caracteres con 3-4 emojis estratégicos",
      "hashtags": [
        "#Galicia",
        "#ACoruña",
        "8-18 hashtags más mezclando populares y nicho"
      ],
      "callToAction": "Invitación específica a la acción",
      "suggestedTime": "HH:mm - Justificación"
    },
    "facebook": {
      "copy": "Copy de 200-300 caracteres con storytelling emocional",
      "postType": "POST | EVENT | OFFER",
      "engagementQuestion": "Pregunta para generar comentarios",
      "suggestedLink": "URL sugerida si aplica"
    },
    ${
      businessType === 'HOTEL'
        ? `
    "linkedin": {
      "copy": "Copy profesional de 150-250 caracteres enfocado en valores corporativos",
      "hashtags": ["#Hospitalidad", "#TurismoGalicia", "#ExperienciaCliente", "..."],
      "corporateFocus": "Aspecto corporativo destacado (excelencia/sostenibilidad/equipo/innovación)"
    },
    `
        : ''
    }
    "twitter": {
      "copy": "Copy ultra-conciso de máx 250 caracteres, impactante y directo",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
    }
  },
  "metadata": {
    "estimatedEngagement": "HIGH | MEDIUM | LOW",
    "bestPlatforms": ["instagram", "facebook"],
    "tipsForPosting": [
      "Consejo 1 específico para este contenido",
      "Consejo 2 sobre timing o frecuencia"
    ]
  }
}

VALIDACIONES CRÍTICAS:
- Copy de Twitter debe tener máximo 250 caracteres
- Instagram debe tener mínimo 10 hashtags
- Facebook debe incluir pregunta para engagement
- Todos los copies deben incluir elementos locales gallegos cuando sea relevante
- Responde SOLO con JSON válido, sin markdown ni texto adicional
`;
};
