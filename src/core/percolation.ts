import { UnionFind, type UnionFindOptions } from './unionFind'

/**
 * Site percolation on an n x n grid.
 *
 * Cells are union-find nodes 0..n*n-1. Two virtual nodes sit above and below
 * the grid: TOP is unioned with every open cell in row 0, BOTTOM with every
 * open cell in the last row. The system percolates once TOP and BOTTOM share a
 * root. A second structure without BOTTOM answers "is this cell full?" so a
 * percolating system doesn't back-wash fullness into cells that only touch
 * the bottom.
 */
export class Percolation {
  readonly n: number
  readonly top: number
  readonly bottom: number
  private readonly grid: Uint8Array
  private readonly both: UnionFind
  private readonly fromTop: UnionFind
  openCount = 0

  constructor(n: number, opts?: UnionFindOptions) {
    if (!Number.isInteger(n) || n < 1) throw new RangeError(`grid size must be >= 1, got ${n}`)
    this.n = n
    this.top = n * n
    this.bottom = n * n + 1
    this.grid = new Uint8Array(n * n)
    const o = { byRank: true, ...opts }
    this.both = new UnionFind(n * n + 2, o)
    this.fromTop = new UnionFind(n * n + 1, o)
  }

  index(row: number, col: number): number {
    if (row < 0 || row >= this.n || col < 0 || col >= this.n) {
      throw new RangeError(`cell (${row}, ${col}) outside ${this.n}x${this.n} grid`)
    }
    return row * this.n + col
  }

  isOpen(row: number, col: number): boolean {
    return this.grid[this.index(row, col)] === 1
  }

  /** Open and connected to the top row through open cells. */
  isFull(row: number, col: number): boolean {
    const i = this.index(row, col)
    return this.grid[i] === 1 && this.fromTop.connected(i, this.top)
  }

  /** Open a cell; returns false if it was already open. */
  open(row: number, col: number): boolean {
    const i = this.index(row, col)
    if (this.grid[i] === 1) return false
    this.grid[i] = 1
    this.openCount++
    const link = (j: number) => {
      this.both.union(i, j)
      if (j !== this.bottom) this.fromTop.union(i, j)
    }
    if (row === 0) link(this.top)
    if (row === this.n - 1) link(this.bottom)
    if (row > 0 && this.isOpen(row - 1, col)) link(i - this.n)
    if (row < this.n - 1 && this.isOpen(row + 1, col)) link(i + this.n)
    if (col > 0 && this.isOpen(row, col - 1)) link(i - 1)
    if (col < this.n - 1 && this.isOpen(row, col + 1)) link(i + 1)
    return true
  }

  percolates(): boolean {
    return this.both.connected(this.top, this.bottom)
  }

  /** Fraction of cells currently open — the threshold estimate once it percolates. */
  openFraction(): number {
    return this.openCount / (this.n * this.n)
  }
}

/** Fisher-Yates shuffle of every (row, col) pair. */
export function shuffledCells(n: number, rng: () => number = Math.random): Array<[number, number]> {
  const cells: Array<[number, number]> = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c])
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells
}

/** Open random cells until the grid percolates; returns the open fraction. */
export function percolationTrial(n: number, rng: () => number = Math.random): number {
  const p = new Percolation(n)
  for (const [r, c] of shuffledCells(n, rng)) {
    p.open(r, c)
    if (p.percolates()) break
  }
  return p.openFraction()
}
