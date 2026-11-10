// Типы тестового хоста (mock-host.mjs): для песочницы и для тех, кто тестирует тему сам.
import type { PropertyDetailData, PropertySummary, ThemeHost, ThemeSlot } from '../src/index'

export declare const HOST_KEY: symbol
export declare const COMPONENT_NAMES: string[]

/** Выгрузка с сайта (админка → «Свои шаблоны» → «Данные для песочницы»). */
export interface SandboxData {
  version?: number
  site?: ThemeHost['site']['value']
  nav?: { main?: unknown[], footer?: unknown[], user?: unknown[] }
  links?: ThemeHost['links']
  fresh?: PropertySummary[]
  detail?: PropertyDetailData | null
  similar?: PropertySummary[]
  cities?: Array<{ id: string, name: string, count: number, href: string }>
  stats?: { listings: number, cities: number } | null
}

export declare function fixtureSummary(i?: number): PropertySummary
export declare function fixtureDetail(): PropertyDetailData
export declare function fixtureProps(slot: ThemeSlot, data?: SandboxData | null): Record<string, unknown>

export declare function createMockHost(vue: unknown, opts?: {
  locale?: string
  messages?: Record<string, object>
  onMissingKey?: (key: string) => void
  data?: SandboxData | null
  components?: Record<string, unknown>
  onLocaleChange?: (code: string) => void
}): ThemeHost
