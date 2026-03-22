import type { PageMeta } from './types'

export function orderedPages(list: PageMeta[]): PageMeta[] {
  const byParent = new Map<string | null, PageMeta[]>()
  for (const p of list) {
    const k = p.parent_id
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(p)
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title))
  }
  const out: PageMeta[] = []
  function walk(pid: string | null) {
    for (const c of byParent.get(pid) ?? []) {
      out.push(c)
      walk(c.id)
    }
  }
  walk(null)
  return out
}

export function depthOf(p: PageMeta, list: PageMeta[]): number {
  const map = new Map(list.map((x) => [x.id, x]))
  let d = 0
  let cur: string | null = p.parent_id
  while (cur) {
    d++
    cur = map.get(cur)?.parent_id ?? null
  }
  return d
}
