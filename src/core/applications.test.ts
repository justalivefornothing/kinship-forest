import { describe, expect, it } from 'vitest'
import { kruskal, kruskalOrder, mergeSort, randomGraph, type Edge } from './kruskal'
import { Percolation, percolationTrial, shuffledCells } from './percolation'
import { layoutForest } from './layout'
import { parseScript } from './script'
import { chainOf } from './unionFind'

describe('kruskal', () => {
  it('finds the minimum spanning tree weight', () => {
    expect(
      kruskal(4, [
        [0, 1, 1],
        [1, 2, 2],
        [2, 3, 3],
        [0, 3, 10],
        [0, 2, 4],
      ]).totalWeight,
    ).toBe(6)
  })

  it('rejects the cycle-forming edge and stops once spanning', () => {
    const edges: Edge[] = [
      [0, 1, 1],
      [1, 2, 2],
      [0, 2, 3],
      [2, 3, 4],
    ]
    const r = kruskal(4, edges)
    expect(r.steps).toEqual([
      { edge: 0, accepted: true },
      { edge: 1, accepted: true },
      { edge: 2, accepted: false },
      { edge: 3, accepted: true },
    ])
    expect(r.tree).toEqual([0, 1, 3])
  })

  it('sorts stably by weight with a hand-written merge sort', () => {
    expect(mergeSort([5, 3, 9, 1, 3], (a, b) => a - b)).toEqual([1, 3, 3, 5, 9])
    const edges: Edge[] = [
      [0, 1, 2],
      [1, 2, 1],
      [2, 3, 2],
    ]
    expect(kruskalOrder(edges)).toEqual([1, 0, 2])
  })

  it('generates a connected random graph with unique edges', () => {
    let s = 7
    const rng = () => ((s = (s * 48271) % 2147483647) / 2147483647)
    const g = randomGraph(8, 5, rng)
    expect(g.edges.length).toBe(13)
    expect(new Set(g.edges.map(([u, v]) => (u < v ? `${u}-${v}` : `${v}-${u}`))).size).toBe(13)
    expect(kruskal(g.n, g.edges).tree.length).toBe(7)
  })
})

describe('Percolation', () => {
  it('percolates once a column of open cells spans the grid', () => {
    const p = new Percolation(3)
    for (const r of [0, 1, 2]) for (const c of [0, 1, 2]) p.open(r, c)
    expect(p.percolates()).toBe(true)
  })

  it('does not percolate across a blocked row and avoids backwash', () => {
    const p = new Percolation(3)
    p.open(0, 0)
    p.open(1, 0)
    expect(p.percolates()).toBe(false)
    expect(p.isFull(1, 0)).toBe(true)
    p.open(2, 2)
    expect(p.isFull(2, 2)).toBe(false)
    p.open(2, 0)
    expect(p.percolates()).toBe(true)
    expect(p.isFull(2, 2)).toBe(false)
    expect(p.openFraction()).toBeCloseTo(4 / 9)
  })

  it('shuffles every cell exactly once and runs a trial', () => {
    const cells = shuffledCells(4, () => 0.5)
    expect(cells.length).toBe(16)
    expect(new Set(cells.map(([r, c]) => r * 4 + c)).size).toBe(16)
    const frac = percolationTrial(6, Math.random)
    expect(frac).toBeGreaterThan(0)
    expect(frac).toBeLessThanOrEqual(1)
  })
})

describe('layoutForest', () => {
  it('centres parents over children and wraps rows', () => {
    const uf = chainOf(3)
    const l = layoutForest(uf.parent)
    expect(Array.from(l.y)).toEqual([0, 1, 2])
    expect(l.cols).toBe(1)
    expect(l.rows).toBe(3)

    const wide = layoutForest([0, 0, 0, 3, 3], 2)
    expect(wide.x[0]).toBe(0.5)
    expect(wide.cols).toBe(2)
    expect(wide.rows).toBe(4)
    expect(wide.y[3]).toBe(2)
    expect(layoutForest([0, 0, 0, 3, 3], 4).rows).toBe(2)
  })
})

describe('parseScript', () => {
  it('parses unions, finds and connectivity checks', () => {
    const { ops, errors } = parseScript('u 1 2; f 5\nconnected(0, 3) # comment', 6)
    expect(errors).toEqual([])
    expect(ops).toEqual([
      { kind: 'union', a: 1, b: 2 },
      { kind: 'find', a: 5 },
      { kind: 'connected', a: 0, b: 3 },
    ])
  })

  it('reports bad verbs and out-of-range nodes', () => {
    const { ops, errors } = parseScript('x 1; u 1 9; f', 5)
    expect(ops).toEqual([])
    expect(errors.length).toBe(3)
  })
})
