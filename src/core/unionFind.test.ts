import { describe, expect, it } from 'vitest'
import { UnionFind, chainOf } from './unionFind'

describe('UnionFind', () => {
  it('merges sets and tracks the count', () => {
    const uf = new UnionFind(5)
    uf.union(0, 1)
    uf.union(1, 2)
    expect(uf.find(0)).toBe(uf.find(2))
    expect(uf.count).toBe(3)
  })

  it('full compression points every node on the path at the root', () => {
    const uf = chainOf(5) /* parent: 4->3->2->1->0 */
    uf.find(4)
    expect(uf.parent[4]).toBe(0)
    expect(uf.parent[3]).toBe(0)
  })

  it('union by rank keeps rank 1 after attaching two singletons', () => {
    const uf = new UnionFind(3, { byRank: true })
    uf.union(0, 1)
    uf.union(0, 2)
    expect(uf.rank[uf.find(0)]).toBe(1)
  })

  it('records the walked path and every reparenting', () => {
    const uf = chainOf(5)
    const t = uf.findTrace(4)
    expect(t.path).toEqual([4, 3, 2, 1, 0])
    expect(t.root).toBe(0)
    expect(t.reparented.map((r) => r.node)).toEqual([4, 3, 2])
    expect(uf.hops).toBe(4)
  })

  it('path halving points visited nodes at their grandparent', () => {
    const uf = chainOf(5, { compression: 'halving' })
    uf.find(4)
    // 4 skips over 3 to 2, then 2 skips over 1 to 0; 3 is left alone.
    expect(Array.from(uf.parent)).toEqual([0, 0, 0, 2, 2])
    expect(uf.maxHeight()).toBe(2)
  })

  it('naive union with no compression grows a tall chain', () => {
    const uf = new UnionFind(4, { compression: 'none' })
    uf.union(2, 3)
    uf.union(1, 2)
    uf.union(0, 1)
    expect(uf.maxHeight()).toBe(3)
    expect(uf.roots()).toEqual([0])
  })

  it('union by size hangs the smaller tree under the larger', () => {
    const uf = new UnionFind(4, { bySize: true })
    uf.union(0, 1)
    uf.union(0, 2)
    uf.union(3, 0)
    expect(uf.find(3)).toBe(0)
    expect(uf.size[0]).toBe(4)
  })

  it('rejects out-of-range nodes', () => {
    const uf = new UnionFind(3)
    expect(() => uf.find(3)).toThrow(RangeError)
    expect(uf.union(0, 0)).toBe(false)
  })
})
