import type { Component, Ref } from 'vue'
import type { CityWithCount, PropertySummary, SiteStats } from './dto'

/**
 * API хоста: всё, что тема может узнать о сайте и сделать на нём.
 *
 * Тема получает его через useHost(). Реализация — в apps/web (на сервере свой
 * экземпляр на каждый запрос, поэтому безопасна для SSR) и упрощённая — в
 * песочнице SDK. Внутренние композаблы платформы (useTenantBranding,
 * useAuthStore, useGqlClient…) теме недоступны: они не входят в контракт и
 * меняются без предупреждения.
 */
export interface ThemeHost {
  /** Версия контракта, которую реализует хост (`1.3`). */
  readonly apiVersion: string

  readonly site: Readonly<Ref<SiteInfo>>
  /** null — посетитель не вошёл. На сервере всегда null: состояние входа известно только в браузере. */
  readonly user: Readonly<Ref<UserInfo | null>>
  readonly nav: SiteNavigation
  readonly links: SiteLinks

  /** Перевод ключа из locales/ темы (префикс темы добавляется сам). */
  t(key: string, params?: Record<string, unknown>): string
  /**
   * Перевод с выбором формы по числу. Формы через `|` в порядке категорий языка
   * (Intl.PluralRules): ru/sr — «{n} объект | {n} объекта | {n} объектов», en — «{n} item | {n} items».
   * В тексте доступны {n} и {count}.
   */
  tc(key: string, count: number, params?: Record<string, unknown>): string
  /** Перевод общего текста сайта из закрытого списка — чтобы не дублировать «Войти», «Избранное» в каждой теме. */
  common(key: CommonTextKey): string

  /** Путь с префиксом текущего языка: `/search` → `/en/search`. */
  localePath(path: string): string
  navigate(to: string): Promise<void>

  readonly format: HostFormatters
  readonly data: HostData

  /** Мета-теги страницы (обёртка над useHead). Заголовок и SEO страницы объекта сайт ставит сам. */
  head(input: HeadInput): void

  readonly actions: HostActions

  /**
   * Компоненты сайта для темы. Тема обращается к ним через обёртки из
   * `@sitebill/theme-sdk/components`, напрямую сюда лазить не нужно.
   */
  readonly components: Readonly<Record<HostComponentName, Component>>
}

export interface SiteInfo {
  title: string
  logoUrl: string | null
  logoThumbUrl: string | null
  faviconUrl: string | null
  contacts: {
    email: string | null
    phone: string | null
    address: string | null
    hours: string | null
  }
  /** Текущий язык (`ru`, `en`, `sr`, `tg`). */
  locale: string
  /** Языки, включённые на сайте. */
  locales: Array<{ code: string, name: string }>
  /** Что включено на сайте: тема прячет ссылки на выключенное. */
  features: {
    map: boolean
    chat: boolean
    aiSearch: boolean
    booking: boolean
    mortgageCalculator: boolean
    registration: boolean
  }
  /** `community` или `cloud`. */
  edition: string
}

export interface UserInfo {
  name: string
  avatarUrl: string | null
}

export interface NavItem {
  label: string
  to?: string
  icon?: string
  /** Внешняя ссылка — открывать в новой вкладке. */
  external?: boolean
  children?: NavItem[]
  /** Для пунктов-действий (выход, смена языка). */
  onSelect?: () => void
}

export interface SiteNavigation {
  /** Главное меню (настраивается в админке тенанта). */
  readonly main: Readonly<Ref<NavItem[]>>
  /** Меню пользователя (кабинет, избранное, выход); пусто для гостя. */
  readonly user: Readonly<Ref<NavItem[]>>
  /** Меню подвала из /admin/menus; пусто, если тенант его не настраивал (тогда — SbFooterMenu с меню по умолчанию). */
  readonly footer: Readonly<Ref<NavItem[]>>
  /** Переключатель языков: пункт на каждый включённый язык. */
  readonly languages: Readonly<Ref<NavItem[]>>
}

/** Готовые ссылки с префиксом языка. */
export interface SiteLinks {
  readonly home: string
  readonly search: string
  readonly map: string
  readonly login: string
  readonly register: string
  readonly account: string
  readonly favorites: string
  readonly messages: string
  readonly addProperty: string
}

export interface HostFormatters {
  price(value: number | null | undefined, currency: string): string
  area(value: number | null | undefined): string
  /** ISO-дата → «3 ноября 2026» на языке сайта. */
  date(iso: string | null | undefined): string
  number(value: number): string
}

/**
 * Именованные запросы данных. Произвольный GraphQL в v1 не даём: иначе вся схема
 * платформы стала бы публичным API. Нужен ещё запрос — добавляем его в контракт.
 */
export interface HostQueries {
  freshProperties: { vars: { limit?: number, dealType?: string }, result: PropertySummary[] }
  citiesWithCount: { vars: { limit?: number }, result: CityWithCount[] }
  siteStats: { vars: Record<string, never>, result: SiteStats }
}

export type HostQueryName = keyof HostQueries

export interface AsyncState<T> {
  readonly data: Readonly<Ref<T | null>>
  readonly pending: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<Error | null>>
  refresh(): Promise<void>
}

export interface HostData {
  /**
   * Загрузить данные. Вызывать в setup. Чтобы данные попали в HTML с сервера
   * (SEO, без мигания), результат нужно дождаться: `const fresh = await host.data.use(...)`
   * в `<script setup>`. Без await данные придут уже в браузере.
   */
  use<N extends HostQueryName>(name: N, vars?: HostQueries[N]['vars']): AsyncState<HostQueries[N]['result']> & PromiseLike<AsyncState<HostQueries[N]['result']>>
}

export interface HeadInput {
  title?: string
  meta?: Array<Record<string, string>>
  link?: Array<Record<string, string>>
}

export interface HostActions {
  /** Открыть вход (страница или модальное окно — решает сайт). */
  openLogin(): void
  logout(): Promise<void>
  /** Переключить язык сайта. */
  setLocale(code: string): Promise<void>
}

/**
 * Общие тексты сайта, доступные теме через host.common(). Закрытый список:
 * ключи платформы меняются, а эти обещаны контрактом.
 */
export type CommonTextKey =
  | 'login'
  | 'logout'
  | 'register'
  | 'favorites'
  | 'messages'
  | 'map'
  | 'addProperty'
  | 'newBuilding'
  | 'notFound'
  | 'similarProperties'
  | 'leaveRequest'
  | 'description'
  | 'characteristics'
  | 'address'
  | 'documents'
  | 'floorPlans'

/** Имена компонентов сайта, которые хост обязан отдать теме (обёртки — в components.ts). */
export const HOST_COMPONENT_NAMES = [
  // Компоненты платформы с замороженными пропсами.
  'SbLink',
  'SbLogo',
  'SbSearchForm',
  'SbAiSearch',
  'SbPropertyGallery',
  'SbCharacteristics',
  'SbFavoriteButton',
  'SbContactBlock',
  'SbMap',
  'SbMortgageCalculator',
  'SbBookingWidget',
  'SbFloorPlans',
  'SbNotificationBell',
  'SbFooterMenu',
  'SbFooterCounters',
  'SbCopyright',
  'SbClientOnly',
  // Разрешённый набор Nuxt UI: стили уже есть в CSS сайта и следуют цветам тенанта.
  'UButton',
  'UBadge',
  'UIcon',
  'UContainer',
  'UAvatar',
  'UDropdownMenu',
  'UNavigationMenu',
  'UColorModeButton',
] as const

export type HostComponentName = typeof HOST_COMPONENT_NAMES[number]
