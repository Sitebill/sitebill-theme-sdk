import type { PropertyDetailData, PropertySummary } from './dto'

/**
 * Слоты темы v1 — то, что тема может заменить. Подмножество ThemeDefinition.components
 * платформы (apps/web/app/themes/types.ts). Слоты листинга и карты (FiltersPanel,
 * SearchMap, ListingShell…) в v1 не входят: их интерфейс завязан на внутреннюю
 * модель фильтров и будет отдан наружу после упрощения.
 */
export const REQUIRED_SLOTS = ['Header', 'Footer', 'Hero', 'PropertyCard', 'PropertyDetail'] as const
export const OPTIONAL_SLOTS = ['HomeSections'] as const
export const ALL_SLOTS = [...REQUIRED_SLOTS, ...OPTIONAL_SLOTS] as const

export type RequiredSlot = typeof REQUIRED_SLOTS[number]
export type OptionalSlot = typeof OPTIONAL_SLOTS[number]
export type ThemeSlot = typeof ALL_SLOTS[number]

/** Шапка сайта. Данные — через useHost(): site, user, nav. */
export type HeaderProps = Record<string, never>

/** Подвал сайта. Меню подвала, счётчики и копирайт — SbFooterMenu, SbFooterCounters, SbCopyright. */
export type FooterProps = Record<string, never>

/** Первый экран главной. Форма поиска — SbSearchForm, ИИ-поиск — SbAiSearch. */
export type HeroProps = Record<string, never>

/**
 * Карточка объекта в выдаче, подборках и блоке «похожие».
 * События: `favorite-toggled` (isFavorited: boolean) — если тема рисует своё
 * избранное; при использовании SbFavoriteButton хост обработает всё сам.
 */
export interface PropertyCardProps {
  property: PropertySummary
  viewMode: 'grid' | 'list'
}

/**
 * Содержимое страницы объекта (без хлебных крошек и панели владельца — их рисует сайт).
 * События: `open-lead-form` — показать форму заявки (её рисует сайт).
 */
export interface PropertyDetailProps {
  property: PropertyDetailData
  similar: PropertySummary[]
}

/**
 * Секции главной ниже Hero. Если слот не задан, сайт рисует стандартные секции.
 * Другие данные (города, статистика) — через useHost().data.
 */
export interface HomeSectionsProps {
  fresh: PropertySummary[]
}

export interface SlotProps {
  Header: HeaderProps
  Footer: FooterProps
  Hero: HeroProps
  PropertyCard: PropertyCardProps
  PropertyDetail: PropertyDetailProps
  HomeSections: HomeSectionsProps
}

/** Классы сетки карточек для страниц выдачи (данные, не функция: хранятся в манифесте). */
export interface ListingLayout {
  /** Показывать переключатель «плитка/список». */
  showViewToggle: boolean
  gridClass: { grid: string, list: string }
}
