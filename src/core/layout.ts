/**
 * Tidy forest layout from a parent array.
 *
 * Each node occupies one column; a subtree is as wide as its leaf count and
 * a parent is centred over its children. Trees are packed left to right and
 * wrap onto a new row once a row would exceed `maxCols` columns.
 */
export interface ForestLayout {
  x: Float32Array
  y: Float32Array
  cols: number
  rows: number
  /** Children of each node, sorted by index. */
  children: number[][]
}

export function layoutForest(parent: ArrayLike<number>, maxCols = 12): ForestLayout {
  const n = parent.length
  const children: number[][] = Array.from({ length: n }, () => [])
  const roots: number[] = []
  for (let i = 0; i < n; i++) {
    if (parent[i] === i) roots.push(i)
    else children[parent[i]].push(i)
  }

  const width = new Int32Array(n)
  const height = new Int32Array(n)
  const measure = (v: number): void => {
    let w = 0
    let h = 0
    for (const c of children[v]) {
      measure(c)
      w += width[c]
      h = Math.max(h, height[c] + 1)
    }
    width[v] = Math.max(1, w)
    height[v] = h
  }
  for (const r of roots) measure(r)

  const x = new Float32Array(n)
  const y = new Float32Array(n)
  const place = (v: number, left: number, top: number): void => {
    x[v] = left + (width[v] - 1) / 2
    y[v] = top
    let cursor = left
    for (const c of children[v]) {
      place(c, cursor, top + 1)
      cursor += width[c]
    }
  }

  let cols = 0
  let rowTop = 0
  let cursor = 0
  let rowHeight = 0
  for (const r of roots) {
    if (cursor > 0 && cursor + width[r] > maxCols) {
      rowTop += rowHeight + 1
      cursor = 0
      rowHeight = 0
    }
    place(r, cursor, rowTop)
    cursor += width[r]
    rowHeight = Math.max(rowHeight, height[r])
    cols = Math.max(cols, cursor)
  }
  return { x, y, cols, rows: n === 0 ? 0 : rowTop + rowHeight + 1, children }
}
