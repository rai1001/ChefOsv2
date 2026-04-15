import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn (classnames helper)', () => {
  it('combina clases string', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('ignora valores falsy', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar')
  })

  it('resuelve conflictos tailwind (twMerge)', () => {
    // twMerge debe descartar el primer px-2 cuando viene px-4 después
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('acepta arrays y objetos (clsx)', () => {
    expect(cn(['foo', 'bar'], { baz: true, qux: false })).toBe('foo bar baz')
  })
})
