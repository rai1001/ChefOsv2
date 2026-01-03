# scan-document Edge Function

Scans invoices, delivery notes, menus, and other documents using Gemini Vision AI.

## Endpoint

```
POST https://xrgewhvijmrthsnrrxdw.supabase.co/functions/v1/scan-document
```

## Authentication

Requires Supabase JWT token in Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

## Request Body

```typescript
{
  imageBase64: string;           // Base64 encoded image (with or without data URI prefix)
  type?: 'invoice' | 'menu' | 'sports_menu' | 'delivery_note'; // Optional, defaults to generic
  outletId?: string;             // Optional, for usage tracking
}
```

## Response

```typescript
{
  success: boolean;
  data?: {
    items: Array<{
      name: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      totalPrice?: number;
      category?: string;
      code?: string;
      description?: string;
    }>;
    rawText?: string;
    metadata?: {
      totalAmount?: number;
      currency?: string;
      date?: string;
      vendor?: string;
      documentType?: string;
    };
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number; // in USD
  };
  error?: string;
}
```

## Example Usage

### From Frontend (JavaScript/TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get user session token
const {
  data: { session },
} = await supabase.auth.getSession();

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

// Call the function
const file = document.querySelector('input[type=file]').files[0];
const imageBase64 = await fileToBase64(file);

const { data, error } = await supabase.functions.invoke('scan-document', {
  body: {
    imageBase64,
    type: 'invoice',
    outletId: 'your-outlet-id',
  },
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Scanned items:', data.data.items);
  console.log('Cost:', data.usage.estimatedCost);
}
```

### From curl

```bash
curl -i --location --request POST 'https://xrgewhvijmrthsnrrxdw.supabase.co/functions/v1/scan-document' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "type": "invoice"
  }'
```

## Local Development

```bash
# Start Supabase locally
npx supabase start

# Deploy function locally
npx supabase functions serve scan-document

# Test locally
curl -i --location --request POST 'http://localhost:54321/functions/v1/scan-document' \
  --header 'Authorization: Bearer eyJhbGc...' \
  --header 'Content-Type: application/json' \
  --data '{
    "imageBase64": "...",
    "type": "invoice"
  }'
```

## Production Deployment

```bash
# Deploy to production
.\supabase-cli.bat functions deploy scan-document

# View logs
.\supabase-cli.bat functions logs scan-document --tail
```

## Cost Estimation

- Gemini 1.5 Flash pricing:
  - Input: $0.10 per 1M tokens
  - Output: $0.40 per 1M tokens
- Typical invoice scan: ~1,200 input tokens, ~300 output tokens
- Estimated cost per scan: ~$0.0015 USD

## Error Handling

The function returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad request (missing imageBase64)
- `405`: Method not allowed (not POST)
- `500`: Server error (Gemini API failure, parsing error, etc.)

## Dependencies

- Deno Standard Library (HTTP server)
- Gemini 1.5 Flash API
- Shared modules:
  - `_shared/cors.ts`
  - `_shared/gemini-client.ts`
  - `_shared/prompts.ts`
  - `_shared/types.ts`
