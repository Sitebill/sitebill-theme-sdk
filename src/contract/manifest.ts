import { ALL_SLOTS, REQUIRED_SLOTS, type ListingLayout, type ThemeSlot } from './slots'
import { THEME_API_MAJOR } from './version'

/**
 * manifest.json в корне пакета темы. Только данные: код темы — в бандлах
 * server.mjs / client.mjs. Те же правила проверяет бэкенд при загрузке
 * архива (apps/api), эта функция — для CLI SDK и песочницы, чтобы ошибку
 * было видно до загрузки.
 */
export interface ThemeManifest {
  /** Латиница, цифры, дефис; 3–40 символов. Становится частью tenants.theme (`custom:<id>`). */
  id: string
  name: string
  /** semver: 1.2.0 */
  version: string
  /** Мажор контракта, под который собрана тема (`"1"`). */
  sdk: string
  /** Какие слоты тема заменяет; остальные берутся из стандартной темы. */
  slots: ThemeSlot[]
  listing?: ListingLayout
  /** Языки, для которых в пакете есть locales/<code>.json. */
  locales: string[]
  description?: string
  author?: string
  /** Картинка-превью внутри пакета (`preview.png`). */
  preview?: string
  /** CSS темы внутри пакета (`style.css`); сайт подключает их на страницах с темой. */
  styles?: string[]
  /**
   * Бандл для сервера (SSR). Не задан — сервер грузит тот же client.mjs: компоненты,
   * собранные для браузера, Vue умеет рендерить и на сервере, просто медленнее.
   */
  server?: string
}

export interface ManifestIssue {
  field: string
  message: string
}

const ID_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const KNOWN_LOCALES = ['ru', 'en', 'sr', 'tg']

/**
 * Проверка манифеста. Возвращает список проблем (пустой — всё в порядке).
 * Сообщения на русском: их читает разработчик темы в выводе CLI.
 */
export function validateManifest(input: unknown): ManifestIssue[] {
  const issues: ManifestIssue[] = []
  const add = (field: string, message: string) => issues.push({ field, message })

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [{ field: '', message: 'manifest.json должен быть объектом' }]
  }
  const m = input as Record<string, unknown>

  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) {
    add('id', 'латиница в нижнем регистре, цифры и дефис, 3–40 символов, без дефиса по краям')
  }
  if (typeof m.name !== 'string' || m.name.trim() === '' || m.name.length > 80) {
    add('name', 'обязательное название до 80 символов')
  }
  if (typeof m.version !== 'string' || !SEMVER_RE.test(m.version)) {
    add('version', 'версия в формате semver, например 1.0.0')
  }
  if (typeof m.sdk !== 'string' || !/^\d+$/.test(m.sdk)) {
    add('sdk', 'мажорная версия контракта строкой, например "1"')
  } else if (Number(m.sdk) !== THEME_API_MAJOR) {
    add('sdk', `эта версия SDK поддерживает контракт ${THEME_API_MAJOR}, в манифесте — ${m.sdk}`)
  }

  if (!Array.isArray(m.slots) || m.slots.length === 0) {
    add('slots', 'список заменяемых слотов не может быть пустым')
  } else {
    for (const s of new Set(m.slots)) {
      if (!(ALL_SLOTS as readonly unknown[]).includes(s)) {
        add('slots', `неизвестный слот «${String(s)}»; доступны: ${ALL_SLOTS.join(', ')}`)
      }
    }
    if (new Set(m.slots).size !== m.slots.length) add('slots', 'слоты повторяются')
  }

  if (!Array.isArray(m.locales)) {
    add('locales', 'список языков обязателен (может быть пустым, если в теме нет своих текстов)')
  } else {
    for (const l of m.locales) {
      if (!KNOWN_LOCALES.includes(l as string)) {
        add('locales', `неизвестный язык «${String(l)}»; доступны: ${KNOWN_LOCALES.join(', ')}`)
      }
    }
  }

  for (const field of ['styles'] as const) {
    const v = m[field]
    if (v === undefined) continue
    if (!Array.isArray(v) || v.some(f => !isPackagePath(f))) add(field, 'список относительных путей внутри пакета (без «..» и «/» в начале)')
  }
  for (const field of ['preview', 'server'] as const) {
    if (m[field] !== undefined && !isPackagePath(m[field])) add(field, 'относительный путь внутри пакета (без «..» и «/» в начале)')
  }

  if (m.listing !== undefined) {
    const l = m.listing as Record<string, unknown> | null
    const grid = l?.gridClass as Record<string, unknown> | undefined
    if (!l || typeof l.showViewToggle !== 'boolean' || typeof grid?.grid !== 'string' || typeof grid?.list !== 'string') {
      add('listing', 'ожидается { showViewToggle: boolean, gridClass: { grid: string, list: string } }')
    }
  }

  return issues
}

/** Путь к файлу внутри пакета: без выхода наружу, без абсолютных путей и обратных слешей. */
export function isPackagePath(value: unknown): value is string {
  return typeof value === 'string'
    && /^[A-Za-z0-9._/-]{1,200}$/.test(value)
    && !value.startsWith('/')
    && !value.split('/').some(part => part === '..' || part === '')
}

/** Слоты, которые придут из стандартной темы, потому что тема их не заменяет. */
export function fallbackSlots(manifest: Pick<ThemeManifest, 'slots'>): ThemeSlot[] {
  return REQUIRED_SLOTS.filter(s => !manifest.slots.includes(s))
}
