import { describe, expect, it } from '@jest/globals'
import type { DisplayCell } from '@aerofms/core'
import { runs } from '@/components/cdu/CduDisplay'

const cells = (text: string, over: Partial<DisplayCell> = {}): DisplayCell[] =>
  [...text].map((ch) => ({ ch, color: 'white', size: 'L', inverse: false, ...over }) as DisplayCell)

describe('CDU runs', () => {
  it('merges cells with the same style and records their start column', () => {
    const line = [...cells('RW32R   '), ...cells('1127', { size: 'S', color: 'green' }), ...cells(' 295/')]
    expect(runs(line).map((r) => [r.col, r.text, r.size])).toEqual([
      [0, 'RW32R   ', 'L'],
      [8, '1127', 'S'],
      [12, ' 295/', 'L'],
    ])
  })

  it('isolates glyphs that IBM Plex Mono lacks so they cannot shift the grid', () => {
    const line = cells('□□□°□□.□ OVFYΔ')
    const r = runs(line)
    expect(r.filter((x) => x.text === '□').map((x) => x.col)).toEqual([0, 1, 2, 4, 5, 7])
    expect(r.find((x) => x.text === 'Δ')?.col).toBe(13)
    expect(r.map((x) => x.text).join('')).toBe('□□□°□□.□ OVFYΔ')
  })
})
