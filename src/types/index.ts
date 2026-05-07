export interface Project {
  path: string
  name: string
  lastOpened: string
  arbFiles: ArbFile[]
}

export interface ArbFile {
  locale: string
  path: string
  entryCount: number
}

export interface TranslationEntry {
  key: string
  value: string
  description?: string
  placeholders?: Record<string, Placeholder>
}

export interface Placeholder {
  type?: string
  format?: string
  example?: string
}

export interface NavItem {
  label: string
  icon: string
  to: string
}
