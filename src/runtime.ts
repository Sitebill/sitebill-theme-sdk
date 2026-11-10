import { inject, type InjectionKey } from 'vue'
import type { ThemeHost } from './contract/host'

/**
 * Ключ, под которым сайт делает provide(ThemeHost).
 *
 * Symbol.for, а не Symbol(): SDK вшивается в бандл каждой темы (наружу
 * выносится только `vue`), и у хоста своя копия этого модуля. Обычные символы
 * в двух копиях разные, и inject бы ничего не нашёл; глобальный реестр
 * символов даёт один и тот же ключ во всех копиях.
 */
export const THEME_HOST_KEY: InjectionKey<ThemeHost> = Symbol.for('sitebill.theme-host') as InjectionKey<ThemeHost>

/**
 * API сайта для темы. Вызывать в setup компонента темы.
 */
export function useHost(): ThemeHost {
  const host = inject(THEME_HOST_KEY, null)
  if (!host) {
    throw new Error(
      '[theme-sdk] useHost() вызван вне сайта: компонент темы рендерится без хоста. '
      + 'Запускайте тему через песочницу (sitebill-theme dev) или на сайте.',
    )
  }
  return host
}
