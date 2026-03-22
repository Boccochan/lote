export type PageMeta = {
  id: string
  title: string
  parent_id: string | null
  updated_at: string
}

export type PageDetail = {
  meta: PageMeta
  body: string
}
