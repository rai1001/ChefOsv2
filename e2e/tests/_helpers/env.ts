export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(
      `[e2e] Missing required env var: ${name}. Set it in your shell or .env.test.local before running tests. See docs/TESTING.md.`
    )
  }
  return v
}
