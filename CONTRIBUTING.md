# Contributing Guide

## Architecture Decision Process

1. Create ADR draft in docs/ADR/XXX-draft.md
2. Discuss in team meeting
3. Update status to "Accepted" or "Rejected"
4. Implement decision

## Core-First Development

- ALL new entities go in @culinaryos/core
- NO modifications to packages/web/domain (legacy only)
- Use adapters for legacy compatibility when necessary

## Git Workflow

### Branch Naming

- `claude/feat-*` : New features
- `claude/fix-*` : Bug fixes
- `claude/refactor-*` : Code refactoring (no behavioral change)
- `claude/test-*` : Adding or updating tests
- `claude/docs-*` : Documentation changes

### Commit Messages

Follow Conventional Commits:
`type(scope): subject`

Allowed scopes: `core`, `web`, `ui`, `functions`, `e2e`, `ci`, `docs`, `deps`
