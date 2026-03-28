/** Stable label for a class of content; use with `id` for navigation and future search. */
export type EntityKind = string

export const ENTITY_KIND_PAGE: EntityKind = 'page'

export type EntityRef = {
  kind: EntityKind
  id: string
}

export type PageMeta = {
  /** Currently always `ENTITY_KIND_PAGE` for list/create/save responses. */
  kind: EntityKind
  id: string
  title: string
  parent_id: string | null
  updated_at: string
}

export function entityRefOf(meta: PageMeta): EntityRef {
  return { kind: meta.kind, id: meta.id }
}

/** Result row from `pages_search` / agent `search_pages`; other entity kinds may use the same shape later. */
export type SearchHit = {
  entity: EntityRef
  title: string
  snippet?: string
}

export type PageDetail = {
  meta: PageMeta
  body: string
}
