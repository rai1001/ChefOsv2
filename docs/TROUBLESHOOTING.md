# Troubleshooting Guide - Supabase Migration

## Common Issues and Solutions

---

## 1. Page Not Loading After Migration

### Symptom

Application fails to load, blank screen or error in browser console about Supabase client initialization.

### Root Cause

Incomplete or missing `VITE_SUPA_KEY` in the `.env` file.

### Solution

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/settings/api

2. Copy the **anon/public** key (NOT the service_role key)

3. Update `packages/web/.env`:

```env
VITE_SUPA_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ2V3aHZpam1ydGhzbnJyeGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzExMzMsImV4cCI6MjA4MjkwNzEzM30.04IvQ0-HezX9J9Cj4ZoJPxpCCc4hawWM4GPOPGYC7qc
```

4. Restart the dev server:

```bash
npm run dev
```

### Verification

- Page should load successfully
- No console errors about Supabase initialization

---

## 2. Edge Function Returns 403 PERMISSION_DENIED

### Symptom

When using Smart AI features (document scanning, ingredient enrichment), you get errors in the Edge Function logs:

```
Error 403: PERMISSION_DENIED - Requests to this API method are blocked
```

### Root Cause

Your Gemini API key has restrictions that block requests from Supabase Edge Functions (Deno runtime on Google Cloud).

### Solution

#### Step 1: Create Unrestricted API Key

1. Go to Google AI Studio: https://aistudio.google.com/apikey

2. Create a **new API key** (don't reuse old ones with restrictions)

3. When creating the key:
   - **Do NOT add application restrictions**
   - **Do NOT add API restrictions**
   - Leave it completely unrestricted

4. Copy the new key (example format: `AIzaSyBxQVqkOEaiUHv6LcTqP4JDmP9q2jB4rrc`)

#### Step 2: Configure Secret in Supabase Vault

1. Go to Supabase Vault: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/settings/vault

2. Click **"New Secret"**

3. Enter:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your new unrestricted API key

4. Click **"Add Secret"**

#### Step 3: Update Local Environment (Optional)

Update `supabase/.env.local` for local testing:

```env
GEMINI_API_KEY=AIzaSyBxQVqkOEaiUHv6LcTqP4JDmP9q2jB4rrc
```

#### Step 4: Redeploy Edge Functions

Edge Functions need to be redeployed to pick up the new secret:

1. Via Supabase Dashboard:
   - Go to Edge Functions
   - Click on `scan-document`
   - Click **"Deploy"** → **"Redeploy"**
   - Repeat for `enrich-ingredient`

2. Via CLI (if you have deployment permissions):

```bash
npx supabase functions deploy scan-document
npx supabase functions deploy enrich-ingredient
```

### Verification

Test the Edge Function directly:

```bash
curl -X POST \
  https://xrgewhvijmrthsnrrxdw.supabase.co/functions/v1/enrich-ingredient \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ingredientName":"Tomate"}'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "nutritionalInfo": { "calories": 18, ... },
    "allergens": [],
    "category": "Vegetables"
  },
  "usage": {
    "inputTokens": 234,
    "outputTokens": 156,
    "estimatedCost": 0.000086
  }
}
```

---

## 3. Supabase CLI Authentication Issues

### Symptom

Commands like `npx supabase link` or `npx supabase secrets set` fail with 403 or permission errors.

### Root Cause

The access token doesn't have sufficient permissions for the requested operation.

### Solution

#### Generate New Access Token

1. Go to: https://supabase.com/dashboard/account/tokens

2. Click **"Generate new token"**

3. Give it a descriptive name: `ChefOS CLI Token`

4. **Important**: Select appropriate scopes:
   - For linking projects: `projects.read`
   - For deploying functions: `functions.write`
   - For managing secrets: `secrets.write`
   - Or select **"All access"** for full permissions

5. Copy the token (format: `sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

6. Set the token as environment variable:

**Windows (PowerShell):**

```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_6df23c97ffb16723d826963a354c44499361be16"
```

**Windows (CMD):**

```cmd
set SUPABASE_ACCESS_TOKEN=sbp_6df23c97ffb16723d826963a354c44499361be16
```

**Mac/Linux:**

```bash
export SUPABASE_ACCESS_TOKEN=sbp_6df23c97ffb16723d826963a354c44499361be16
```

7. Try the command again:

```bash
npx supabase link --project-ref xrgewhvijmrthsnrrxdw
```

### Alternative: Manual Operations via Dashboard

If CLI continues to fail, use the Supabase Dashboard:

- **Secrets**: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/settings/vault
- **Edge Functions**: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/functions
- **Deploy**: Use GitHub integration or manual upload via dashboard

---

## 4. Smart AI Toggle Not Working

### Symptom

The "Smart AI" toggle in UniversalImporter is disabled or doesn't trigger AI scanning.

### Root Cause

`IS_AI_CONFIGURED` is set to `false` in the component.

### Solution

Update [packages/web/src/presentation/components/common/UniversalImporter.tsx](../packages/web/src/presentation/components/common/UniversalImporter.tsx):

```typescript
// Change this:
const IS_AI_CONFIGURED = false;

// To this:
const IS_AI_CONFIGURED = true; // Using Supabase Edge Functions for AI
```

### Verification

- Smart AI toggle should be enabled
- Tooltip should say: "AI requires Supabase configuration"
- When enabled and uploading a file, AI scanning should trigger

---

## 5. Edge Function Timeout

### Symptom

Edge Function returns timeout error after 30-60 seconds.

### Root Cause

- Large images taking too long to process
- Gemini API being slow
- Network issues

### Solution

#### Option 1: Optimize Image Size

Before sending to Edge Function, resize images on the client:

```typescript
async function resizeImage(file: File, maxWidth: 2000): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

#### Option 2: Increase Timeout in Edge Function

Currently Edge Functions have a default timeout of 30s. Contact Supabase support to increase if needed.

#### Option 3: Use Smaller Model

In Edge Function, switch to faster model:

```typescript
// In gemini-client.ts
private defaultModel = 'gemini-1.5-flash-8b'; // Faster, cheaper
```

---

## 6. CORS Errors

### Symptom

Browser console shows CORS errors when calling Edge Functions:

```
Access to fetch at 'https://...supabase.co/functions/v1/scan-document'
has been blocked by CORS policy
```

### Root Cause

Edge Function not returning proper CORS headers.

### Solution

Ensure all Edge Functions use the CORS helper from `_shared/cors.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createSuccessResponse,
  createErrorResponse,
  handleCorsPreflightRequest,
} from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    // Your logic here
    return createSuccessResponse(data);
  } catch (error) {
    return createErrorResponse(error.message);
  }
});
```

### Verification

- Preflight OPTIONS requests should return 200
- Actual requests should include proper CORS headers
- No CORS errors in browser console

---

## 7. Environment Variables Not Loading

### Symptom

Edge Functions can't read environment variables or secrets.

### Root Cause

- Secrets not configured in Supabase Vault
- Wrong variable name
- Functions not redeployed after secret changes

### Solution

#### Step 1: Verify Secrets in Vault

Go to: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/settings/vault

Required secrets:

- `GEMINI_API_KEY`

#### Step 2: Check Variable Names

In Edge Function code:

```typescript
const apiKey = Deno.env.get('GEMINI_API_KEY');
if (!apiKey) {
  throw new Error('GEMINI_API_KEY not configured in Supabase Vault');
}
```

#### Step 3: Redeploy

After adding/changing secrets, **always redeploy** the Edge Functions.

#### Step 4: Test Locally

For local testing, use `supabase/.env.local`:

```env
GEMINI_API_KEY=your-key-here
```

Then run:

```bash
npx supabase functions serve scan-document --env-file supabase/.env.local
```

---

## 8. JSON Parsing Errors from Gemini

### Symptom

Edge Function logs show: `Failed to parse JSON from Gemini response`

### Root Cause

Gemini sometimes returns text with markdown code blocks or invalid JSON.

### Solution

The `GeminiClient.parseJSON()` method in `_shared/gemini-client.ts` handles this:

````typescript
parseJSON<T>(text: string): T {
  // Remove markdown code blocks
  const cleanText = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Failed to parse JSON:', cleanText);
    throw new Error(`Invalid JSON response from AI: ${error.message}`);
  }
}
````

If issues persist:

1. **Lower temperature** for more structured output:

```typescript
const { text } = await gemini.generateText(prompt, {
  temperature: 0.1, // More deterministic
});
```

2. **Add strict JSON instruction** to prompt:

```typescript
const prompt = `${basePrompt}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no code blocks.`;
```

---

## Debugging Tools

### View Edge Function Logs

**Via Dashboard:**
https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/functions

Click on a function → View logs

**Via CLI:**

```bash
npx supabase functions logs scan-document --tail
```

### Test Edge Functions Directly

```bash
# Test scan-document
curl -X POST \
  https://xrgewhvijmrthsnrrxdw.supabase.co/functions/v1/scan-document \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"data:image/jpeg;base64,...","type":"invoice"}'

# Test enrich-ingredient
curl -X POST \
  https://xrgewhvijmrthsnrrxdw.supabase.co/functions/v1/enrich-ingredient \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ingredientName":"Tomate"}'
```

### Check Browser Console

Press F12 in browser and check:

- **Console tab**: JavaScript errors, AI usage logs
- **Network tab**: Edge Function requests/responses
- **Application tab**: Supabase client initialization

---

## Getting Help

### Supabase Support

- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

### Gemini API Issues

- Documentation: https://ai.google.dev/docs
- API Status: https://status.google.com

### Project Issues

- Check recent commits in git history
- Review Edge Function logs
- Test locally before deploying
