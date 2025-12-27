# 004. Core-First Architecture & Quality Standards

## Status

Accepted

## Context

As the application scales, we need to enforce stricter architectural boundaries and quality standards to ensure maintainability and testability. The current mixture of domain logic in the Web layer and partial Core adoption creates ambiguity.

## Decision

We will adopt a strict **Core-First Architecture** where:

1.  **All** domain entities, value objects, and business rules must reside in `@culinaryos/core`.
2.  The Web layer (and other consumers) must depend **only** on Core use cases and ports (interfaces), never implementing business logic directly.
3.  Testing must be rigorous, with a focus on property-based testing and edge case coverage in Core.

## Consequences

### Positive

- Clear separation of concerns.
- Business logic is isolated and testable without UI/Framework dependencies.
- Shared domain logic across potential future frontends (Mobile, CLI).

### Negative

- Initial overhead in creating Core wrappers for simple CRUD operations.
- Learning curve for strictly adhering to Clean Architecture ports/adapters.

## Risks & Mitigation

### Risk: Team reverts to legacy patterns

**Probability:** Medium
**Impact:** High
**Mitigation:**

- PR reviews check for core usage
- Linter rules to prevent web/domain imports
- Weekly architecture review meetings

### Risk: Coverage goal not realistic

**Probability:** Low
**Impact:** Medium
**Mitigation:**

- Measure current coverage first
- Adjust goal if needed (60-70% acceptable)
- Focus on critical paths first

## External Dependencies

### Required for success:

- [ ] Product accepts 30% velocity reduction weeks 3-8
- [ ] Senior dev available full-time
- [ ] Team training on Clean Architecture (1 day workshop)
- [ ] Stakeholder buy-in for 12-week timeline

### Blockers if missing:

- Budget for Algolia/Typesense ($50-200/month)
- Firebase quota increase (if needed)
