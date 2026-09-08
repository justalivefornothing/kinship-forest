/**
 * Disjoint-set forest over typed arrays.
 *
 * Every `find` records the path it walked and every parent pointer it rewrote,
 * so a UI can replay the walk and animate the compression afterwards.
 */

export type Compression = 'none' | 'full' | 'halving'

export interface UnionFindOptions {
  /** Attach the shorter tree under the taller one. */
  byRank?: boolean
  /** Attach the smaller tree under the larger one. Ignored if byRank is set. */
  bySize?: boolean
  /** How `find` flattens the path it walked. Defaults to 'full'. */
  compression?: Compression
}

export interface Reparent {
  node: number
  from: number
  to: number
}

export interface FindTrace {
  /** Nodes visited, starting at the query node and ending at the root. */
  path: number[]
  root: number
  /** Parent pointers rewritten by compression, in the order they happened. */
  reparented: Reparent[]
}

export interface UnionTrace {
  a: number
  b: number
  findA: FindTrace
  findB: FindTrace
  /** false when a and b were already in the same set. */
  merged: boolean
  /** The root that now hangs under `parent` (only when merged). */
  child: number
  parent: number
}

export class UnionFind {
  readonly n: number
  readonly parent: Int32Array
  readonly rank: Int32Array
  readonly size: Int32Array
  readonly opts: Required<UnionFindOptions>
  /** Number of disjoint sets. */
  count: number
  /** Total parent-pointer hops performed by all finds so far. */
  hops = 0

  constructor(n: number, opts: UnionFindOptions = {}) {
    if (!Number.isInteger(n) || n < 0) throw new RangeError(`invalid size ${n}`)
    this.n = n
    this.count = n
    this.parent = new Int32Array(n)
    this.rank = new Int32Array(n)
    this.size = new Int32Array(n).fill(1)
    for (let i = 0; i < n; i++) this.parent[i] = i
    this.opts = {
      byRank: opts.byRank ?? false,
      bySize: opts.bySize ?? false,
      compression: opts.compression ?? 'full',
    }
  }

  private check(x: number): void {
    if (!Number.isInteger(x) || x < 0 || x >= this.n) {
      throw new RangeError(`node ${x} out of range [0, ${this.n})`)
    }
  }

  /** Root of x's set, compressing the path per `opts.compression`. */
  find(x: number): number {
    return this.findTrace(x).root
  }

  findTrace(x: number): FindTrace {
    this.check(x)
    const { parent } = this
    const path: number[] = [x]
    const reparented: Reparent[] = []

    if (this.opts.compression === 'halving') {
      // Every visited node is pointed at its grandparent as we pass through.
      let v = x
      while (parent[v] !== v) {
        const p = parent[v]
        const g = parent[p]
        if (g !== p) {
          parent[v] = g
          reparented.push({ node: v, from: p, to: g })
        }
        this.hops++
        v = parent[v]
        path.push(v)
      }
      return { path, root: v, reparented }
    }

    let root = x
    while (parent[root] !== root) {
      root = parent[root]
      path.push(root)
      this.hops++
    }

    if (this.opts.compression === 'full') {
      for (let i = 0; i < path.length - 1; i++) {
        const v = path[i]
        if (parent[v] !== root) {
          reparented.push({ node: v, from: parent[v], to: root })
          parent[v] = root
        }
      }
    }
    return { path, root, reparented }
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b)
  }

  /** Merge the sets of a and b. Returns true if they were separate. */
  union(a: number, b: number): boolean {
    return this.unionTrace(a, b).merged
  }

  unionTrace(a: number, b: number): UnionTrace {
    const findA = this.findTrace(a)
    const findB = this.findTrace(b)
    let ra = findA.root
    let rb = findB.root
    const base = { a, b, findA, findB }
    if (ra === rb) return { ...base, merged: false, child: ra, parent: ra }

    const { rank, size, parent } = this
    if (this.opts.byRank) {
      // Keep the taller tree on top; equal heights grow by one.
      if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra]
      else if (rank[ra] === rank[rb]) rank[ra]++
    } else if (this.opts.bySize) {
      if (size[ra] < size[rb]) [ra, rb] = [rb, ra]
    }
    // Naive: b's root always hangs under a's root.
    parent[rb] = ra
    size[ra] += size[rb]
    this.count--
    return { ...base, merged: true, child: rb, parent: ra }
  }

  /** Depth of node x (0 for a root) without compressing. */
  depth(x: number): number {
    let d = 0
    while (this.parent[x] !== x) {
      x = this.parent[x]
      d++
    }
    return d
  }

  /** Height of the tallest tree in the forest. */
  maxHeight(): number {
    return maxDepth(this.parent)
  }

  roots(): number[] {
    const out: number[] = []
    for (let i = 0; i < this.n; i++) if (this.parent[i] === i) out.push(i)
    return out
  }
}

/** Height of the tallest tree described by a parent array. */
export function maxDepth(parent: ArrayLike<number>): number {
  let best = 0
  for (let i = 0; i < parent.length; i++) {
    let d = 0
    let v = i
    while (parent[v] !== v) {
      v = parent[v]
      d++
    }
    if (d > best) best = d
  }
  return best
}

/**
 * A forest that is one straight chain: n-1 -> n-2 -> ... -> 1 -> 0.
 * Built directly so it stays a chain regardless of union strategy.
 */
export function chainOf(n: number, opts: UnionFindOptions = {}): UnionFind {
  const uf = new UnionFind(n, opts)
  for (let i = 1; i < n; i++) {
    uf.parent[i] = i - 1
    uf.size[i - 1] = n - i + 1
    uf.rank[i - 1] = n - i
  }
  uf.count = n > 0 ? 1 : 0
  return uf
}
