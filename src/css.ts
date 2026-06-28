import type { CSSProperties } from 'react'

/**
 * Convert a raw CSS declaration string (as used in the design prototype's
 * inline `style="..."` attributes) into a React style object. This lets the
 * screens stay pixel-faithful to the handoff by carrying the exact same
 * property values, while remaining valid React.
 */
export function css(input: string): CSSProperties {
  const out: Record<string, string> = {}
  for (const rule of input.split(';')) {
    const idx = rule.indexOf(':')
    if (idx === -1) continue
    const rawKey = rule.slice(0, idx).trim()
    const value = rule.slice(idx + 1).trim()
    if (!rawKey || !value) continue
    // Leave custom properties (--foo) untouched; camelCase the rest.
    const key = rawKey.startsWith('--')
      ? rawKey
      : rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    out[key] = value
  }
  return out as CSSProperties
}
