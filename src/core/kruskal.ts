import { UnionFind, type UnionFindOptions } from './unionFind'

/** [u, v, weight] */
export type Edge = [number, number, number]

export interface KruskalStep {
  /** Index into the original edge list. */
  edge: number
  accepted: boolean
}

export interface KruskalResult {
  totalWeight: number
  /** Indices of accepted edges, in acceptance order. */
  tree: number[]
  /** Every edge considered, in the order Kruskal looked at it. */
  steps: KruskalStep[]
  /** Original edge indices in the order they were considered. */
  order: number[]
}

/** Lighter edge first; ties broken by original index so the sort is stable. */
export function compareEdges(edges: readonly Edge[]): (i: number, j: number) => number {
  return (i, j) => {
    const d = edges[i][2] - edges[j][2]
    return d !== 0 ? d : i - j
  }
}

/** Top-down merge sort so ordering never depends on the engine's sort. */
export function mergeSort<T>(items: readonly T[], cmp: (a: T, b: T) => number): T[] {
  if (items.length <= 1) return [...items]
  const mid = items.length >> 1
  const left = mergeSort(items.slice(0, mid), cmp)
  const right = mergeSort(items.slice(mid), cmp)
  const out: T[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    out.push(cmp(left[i], right[j]) <= 0 ? left[i++] : right[j++])
  }
  while (i < left.length) out.push(left[i++])
  while (j < right.length) out.push(right[j++])
  return out
}

/** Sorted edge order for Kruskal, as indices into `edges`. */
export function kruskalOrder(edges: readonly Edge[]): number[] {
  return mergeSort(
    edges.map((_, i) => i),
    compareEdges(edges),
  )
}

export function kruskal(n: number, edges: readonly Edge[], opts?: UnionFindOptions): KruskalResult {
  const uf = new UnionFind(n, { byRank: true, ...opts })
  const order = kruskalOrder(edges)
  const steps: KruskalStep[] = []
  const tree: number[] = []
  let totalWeight = 0
  for (const idx of order) {
    const [u, v, w] = edges[idx]
    const accepted = uf.union(u, v)
    steps.push({ edge: idx, accepted })
    if (accepted) {
      tree.push(idx)
      totalWeight += w
    }
    if (uf.count === 1) break
  }
  return { totalWeight, tree, steps, order }
}

/**
 * A random connected graph laid out on a jittered ring, for the demo.
 * Node positions are in [0, 1] so the view can scale them.
 */
export interface RandomGraph {
  n: number
  points: Array<[number, number]>
  edges: Edge[]
}

export function randomGraph(n: number, extraEdges: number, rng: () => number = Math.random): RandomGraph {
  const points: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.35
    const r = 0.36 + (rng() - 0.5) * 0.18
    points.push([0.5 + Math.cos(t) * r * 1.25, 0.5 + Math.sin(t) * r])
  }
  const seen = new Set<string>()
  const edges: Edge[] = []
  const add = (u: number, v: number) => {
    if (u === v) return false
    const key = u < v ? `${u}-${v}` : `${v}-${u}`
    if (seen.has(key)) return false
    seen.add(key)
    const [ax, ay] = points[u]
    const [bx, by] = points[v]
    const dist = Math.hypot(ax - bx, ay - by)
    edges.push([u, v, Math.max(1, Math.round(dist * 40 + rng() * 6))])
    return true
  }
  // Ring keeps it connected; a few chords across create cycles to reject.
  for (let i = 0; i < n; i++) add(i, (i + 1) % n)
  let guard = 0
  for (let k = 0; k < extraEdges && guard < 500; guard++) {
    const u = Math.floor(rng() * n)
    const v = (u + 2 + Math.floor(rng() * Math.max(1, n / 2 - 1))) % n
    if (add(u, v)) k++
  }
  return { n, points, edges }
}
