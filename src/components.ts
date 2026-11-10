import { defineComponent, h, type DefineComponent } from 'vue'
import type { HostComponentName } from './contract/host'
import type { MediaImage, PropertyDetailData } from './contract/dto'
import { useHost } from './runtime'

/**
 * Обёртки над компонентами сайта.
 *
 * Тема пишет `import { SbFavoriteButton } from '@sitebill/theme-sdk/components'`,
 * а настоящий компонент берётся у хоста при рендере (host.components). Так
 * внутренний компонент платформы может меняться как угодно, пока хост
 * держит эти пропсы.
 */
function hostComponent<P extends object>(name: HostComponentName): DefineComponent<P> {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const host = useHost()
      return () => h(host.components[name], attrs, slots)
    },
  }) as unknown as DefineComponent<P>
}

// Пропсы компонентов сайта — часть контракта: добавлять можно, менять и удалять — только с мажором.

export interface SbLinkProps { to: string, external?: boolean }
export interface SbLogoProps { size?: 'sm' | 'md' | 'lg' }
/** Форма поиска сайта (поля настраиваются в админке тенанта). */
export type SbSearchFormProps = Record<string, never>
export type SbAiSearchProps = Record<string, never>
export interface SbPropertyGalleryProps { images: MediaImage[] }
/** Полный блок характеристик объекта, включая кастомные поля тенанта и их группы. */
export interface SbCharacteristicsProps { property: PropertyDetailData, hideTitle?: boolean }
export interface SbFavoriteButtonProps { propertyId: string, isFavorited: boolean }
/** Контакт + кнопка заявки + телефон + ссылка на источник. Событие `lead` — показать форму заявки. */
export interface SbContactBlockProps { property: PropertyDetailData }
export interface SbMapProps { lat: number, lng: number, zoom?: number, title?: string }
export interface SbMortgageCalculatorProps { price: number, currency: string }
/** Виджет бронирования; показывать, когда property.booking?.enabled. */
export interface SbBookingWidgetProps { property: PropertyDetailData }
export interface SbFloorPlansProps { images: MediaImage[] }
export type SbNotificationBellProps = Record<string, never>
export type SbFooterMenuProps = Record<string, never>
export type SbFooterCountersProps = Record<string, never>
export type SbCopyrightProps = Record<string, never>
export type SbClientOnlyProps = Record<string, never>

export const SbLink = hostComponent<SbLinkProps>('SbLink')
export const SbLogo = hostComponent<SbLogoProps>('SbLogo')
export const SbSearchForm = hostComponent<SbSearchFormProps>('SbSearchForm')
export const SbAiSearch = hostComponent<SbAiSearchProps>('SbAiSearch')
export const SbPropertyGallery = hostComponent<SbPropertyGalleryProps>('SbPropertyGallery')
export const SbCharacteristics = hostComponent<SbCharacteristicsProps>('SbCharacteristics')
export const SbFavoriteButton = hostComponent<SbFavoriteButtonProps>('SbFavoriteButton')
export const SbContactBlock = hostComponent<SbContactBlockProps>('SbContactBlock')
export const SbMap = hostComponent<SbMapProps>('SbMap')
export const SbMortgageCalculator = hostComponent<SbMortgageCalculatorProps>('SbMortgageCalculator')
export const SbBookingWidget = hostComponent<SbBookingWidgetProps>('SbBookingWidget')
export const SbFloorPlans = hostComponent<SbFloorPlansProps>('SbFloorPlans')
export const SbNotificationBell = hostComponent<SbNotificationBellProps>('SbNotificationBell')
export const SbFooterMenu = hostComponent<SbFooterMenuProps>('SbFooterMenu')
export const SbFooterCounters = hostComponent<SbFooterCountersProps>('SbFooterCounters')
export const SbCopyright = hostComponent<SbCopyrightProps>('SbCopyright')
export const SbClientOnly = hostComponent<SbClientOnlyProps>('SbClientOnly')

// Nuxt UI: пропсы — как в документации Nuxt UI v3 версии, которую использует сайт.
// Типы свободные: тянуть @nuxt/ui в зависимости SDK ради типов не хотим.
type LooseProps = Record<string, unknown>
export const UButton = hostComponent<LooseProps>('UButton')
export const UBadge = hostComponent<LooseProps>('UBadge')
export const UIcon = hostComponent<{ name: string } & LooseProps>('UIcon')
export const UContainer = hostComponent<LooseProps>('UContainer')
export const UAvatar = hostComponent<LooseProps>('UAvatar')
export const UDropdownMenu = hostComponent<LooseProps>('UDropdownMenu')
export const UNavigationMenu = hostComponent<LooseProps>('UNavigationMenu')
export const UColorModeButton = hostComponent<LooseProps>('UColorModeButton')
