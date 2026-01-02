# Unified Import System Documentation

## Overview

The Unified Import System in ChefOS v2 centralizes all data ingestion into a single, robust mechanism capable of handling various file types (Excel, CSV, ICS, Images, PDF) and data entities (Ingredients, Recipes, Menus, Events, Staff, Suppliers, etc.).

## Architecture

At the core of the system is the `UniversalImporter` component, which orchestrates the import process:

1.  **File Selection**: User uploads a file via the simplified modal UI.
2.  **Mode Detection**:
    - **Smart Mode (AI)**: Uses computer vision/LLMs (via `analyzeDocument` Cloud Function) to extract structured data from unstructured files (PDFs, Images).
    - **Structured Mode**: Uses `parseStructuredFile` Cloud Function or specialized frontend parsers (like for ICS).
3.  **Preview & Edit**: Data is presented in a grid (`ImportPreviewGrid`) for user validation.
4.  **Confirm & Commit**: Validated data is sent to the backend (`commitImport` Cloud Function) for persistence.

### Key Components

- **`UniversalImporter.tsx`**: The main UI entry point. Manages the modal, upload state, and coordinates the flow.
- **`EventImportModal.tsx`**: A specialized legacy modal maintained for specific Matrix/Scan/Sync event workflows, now simplified to delegate general file parsing.
- **`packages/functions/src/ingestion.ts`**: Backend logic handling Parsing, AI Analysis, and Committing data to Firestore.
- **`utils/icsParser.ts`**: Frontend utility for parsing iCalendar (.ics) files before sending structured data to the backend.

## Supported Import Types

| Import Type     | File Formats         | Processing Method          |
| :-------------- | :------------------- | :------------------------- |
| **Ingrediente** | Excel, CSV, PDF, Img | Standard / AI              |
| **Receta**      | Excel, CSV, PDF, Img | Standard / AI              |
| **Menú**        | Excel, CSV           | Standard                   |
| **Evento**      | .ics, Excel          | Frontend Parser / Standard |
| **Staff**       | Excel, CSV           | Standard                   |
| **Proveedor**   | Excel, CSV           | Standard                   |
| **Inventario**  | Excel, CSV           | Standard                   |
| **HACCP**       | Excel, CSV           | Standard                   |
| **Ocupación**   | Excel, CSV           | Standard                   |

## Integration Guide

To add the importer to a new page:

```tsx
import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';

export const MyPage = () => {
  return (
    <div>
      {/* ... */}
      <UniversalImporter defaultType="ingredient" />
    </div>
  );
};
```

## Legacy Migration

The old `DataImportModal` has been deprecated. All new implementations should use `UniversalImporter`.
`EventImportModal` remains only for:

- **Matriz Planing** (Specialized Excel format)
- **OCR Scanner** (BEO specific scanning)
- **Cloud Sync** (Google/Outlook integration)
