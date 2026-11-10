import type { Component } from 'vue'
import type { OptionalSlot, RequiredSlot } from './contract/slots'
import { THEME_API_VERSION } from './contract/version'

export type ThemeComponents = Partial<Record<RequiredSlot | OptionalSlot, Component>>

export interface ThemeModule {
  /** Признак, по которому хост отличает модуль темы от случайного ESM. */
  readonly __sitebillTheme: 1
  /** Версия контракта, с которой собрана тема (хост сверяет мажор с манифестом). */
  readonly apiVersion: string
  readonly components: ThemeComponents
}

/**
 * Точка входа темы (src/index.ts → export default defineTheme(...)).
 *
 * Список слотов и настройки листинга живут в manifest.json, а не здесь:
 * бэкенд проверяет пакет без запуска кода темы.
 */
export function defineTheme(options: { components: ThemeComponents }): ThemeModule {
  return {
    __sitebillTheme: 1,
    apiVersion: THEME_API_VERSION,
    components: options.components,
  }
}

export function isThemeModule(value: unknown): value is ThemeModule {
  return !!value && typeof value === 'object' && (value as ThemeModule).__sitebillTheme === 1
}
