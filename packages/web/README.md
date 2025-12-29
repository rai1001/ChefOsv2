# ChefOS v2 - Web Client

The frontend application for ChefOS v2, built with React, TypeScript, and Vite.

## Overview

This package contains the user interface for the ChefOS platform, structured using Clean Architecture principles.

## Key Systems

### Unified Import System

A central system for importing data from various sources (Excel, ICS, AI Analysis).
See [IMPORT_SYSTEM.md](./docs/IMPORT_SYSTEM.md) for details.

### User Management

Handles authentication, roles, and user administration.
See [USER_MANAGEMENT.md](./docs/USER_MANAGEMENT.md) for details.

## Project Structure

- `src/application`: Use Cases and Application Logic.
- `src/domain`: Entities and Repository Interfaces.
- `src/infrastructure`: External services (Firebase, API Adapters).
- `src/presentation`: React Components, Pages, and Stores.
- `src/utils`: Helper functions and parsers.

## Getting Started

1.  **Install dependencies**:

    ```bash
    pnpm install
    ```

2.  **Run development server**:

    ```bash
    pnpm dev
    ```

3.  **Build for production**:
    ```bash
    pnpm build
    ```

## Testing

Run unit tests:

```bash
npm test
```

Run E2E tests:

```bash
npx playwright test
```
