# Kinship Forest — Plan

## Goal

Make the disjoint-set (union-find) data structure *visible*. Users should be able to
watch trees merge, see ranks/sizes grow, and — the money shot — build a deliberately
tall chain, call `find` on the deepest node, and watch every node along the walk snap
sideways to hang directly off the root in one animated collapse.

Then reuse the exact same structure to power two classic applications: Kruskal's MST
and site percolation on a grid.

## Features

1. Disjoint-set with toggleable strategies: naive / union by rank / union by size,
   plus path compression and path halving toggles.
2. Forest view: each set drawn as a tree of rounded nodes; union animates one root
   sliding under another.
3. Find animation: highlight the walk to the root, then show compression reparenting
   as arcs.
4. Kruskal mode: random weighted graph; edges considered in weight order; accepted
   edges glow, rejected (cycle-forming) edges shake.
5. Percolation mode: N x N grid; open cells one at a time until top connects to
   bottom; report the open-fraction threshold estimate.
6. Stats: set count, max tree height, total parent hops so far.
7. Scripted operation input (`u 1 2; f 5`) for reproducible demos.

## Architecture

```
src/
  core/
    unionFind.ts     Typed-array parent/rank/size. find() records the traversed
                     path + the reparenting it performed so the UI can animate it.
    kruskal.ts       Hand-written edge sort (merge sort) + UnionFind acceptance.
    percolation.ts   N*N + 2 virtual nodes (top/bottom). Reports open fraction.
    layout.ts        Pure function: UnionFind -> forest layout (x, y per node).
    script.ts        Parser for "u a b; f c" style op scripts.
    *.test.ts        Vitest specs.
  ui/
    App.tsx          Mode tabs (Forest / Kruskal / Percolation), stats bar.
    ForestView.tsx   SVG forest; nodes transition via CSS transforms.
    KruskalView.tsx  SVG graph; edge states: pending / considering / accepted / rejected.
    PercolationView.tsx  Grid of cells; full cells tinted by connection to top.
    Controls.tsx     Strategy toggles, script box, step buttons.
```

Core is pure TypeScript with no React imports so it can be unit-tested in the
`node` vitest environment. The UI drives a `UnionFind` instance imperatively and
snapshots state into React after each operation; animations are CSS transitions on
SVG `transform` so a change in layout automatically animates.

## Milestones

- [ ] M1: plan, license, scaffold (vite + react-ts + tailwind v4 + vitest)
- [ ] M2: core `UnionFind`, `kruskal`, `Percolation` + tests green
- [ ] M3: forest view with union/find animations and strategy toggles
- [ ] M4: Kruskal and percolation modes
- [ ] M5: stats, script input, polish, responsive pass, smoke test, README
- [ ] M6: publish to private GitHub repo
