# Testing Strategy

## Coverage Goals

- **Core Domain**: >80% (Entities, Value Objects, Domain Services)
- **Use Cases**: >70% (Application Logic)
- **Repositories**: >60% (Infrastructure Adapters)
- **UI Components**: >40% (Presentation Logic)

## Test Types

- **Unit**: Vitest (Fast, isolated tests for Core logic)
- **Integration**: Vitest + Firebase Emulators (Testing repositories and adapters)
- **E2E**: Playwright (Critical user flows)
- **Visual Regression**: Chromatic (Future scope)

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it.
2. **Property-Based Testing**: Use `fast-check` to verify invariants across a wide range of inputs (e.g., stock can never be negative).
3. **Edge Cases**: Always test zero, negative, null, empty array, and large value scenarios.
