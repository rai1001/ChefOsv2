/**
 * CORS utilities for Supabase Edge Functions
 * Handles Cross-Origin Resource Sharing headers
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Creates a Response with CORS headers
 */
export function createCorsResponse(body: any, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

/**
 * Creates an error Response with CORS headers
 */
export function createErrorResponse(error: string, status = 400): Response {
  return createCorsResponse(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Creates a success Response with CORS headers
 */
export function createSuccessResponse<T>(data: T, usage?: any): Response {
  return createCorsResponse({
    success: true,
    data,
    usage,
  });
}

/**
 * Handles OPTIONS requests for CORS preflight
 */
export function handleCorsPreflightRequest(): Response {
  return new Response('ok', { headers: corsHeaders });
}
