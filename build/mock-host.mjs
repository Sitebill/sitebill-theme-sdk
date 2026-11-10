// Упрощённый хост для проверки темы без сайта: `sitebill-theme check` рендерит
// каждый слот на сервере с этими данными и ловит ошибки до загрузки пакета.
// Те же данные пригодятся песочнице (фаза 4). Форма — как у ThemeHost и DTO
// в src/contract/*.ts; поменяли контракт — поправьте и здесь.

export const HOST_KEY = Symbol.for('sitebill.theme-host')

const image = (id, label) => ({
  id, url: `https://placehold.co/800x600?text=${label}`, thumbUrl: `https://placehold.co/400x300?text=${label}`,
  webpUrl: null, alt: label, width: 800, height: 600,
})

export function fixtureSummary(i = 1) {
  return {
    id: String(i),
    href: `/belgrad/kvartiry/prodazha/kvartira-${i}`,
    title: `2-к квартира в центре, №${i}`,
    dealType: 'sale', dealTypeLabel: 'Продажа',
    type: 'apartment', typeLabel: 'Квартира',
    price: 135000 + i, currency: 'EUR', priceFormatted: `${135000 + i} €`,
    areaTotal: 68, areaLabel: '2 комн., 68 м²', rooms: 2, floor: 3, floorsTotal: 9,
    buildingTypeLabel: 'Кирпичный',
    address: 'Белград, Стари-Град, ул. Князя Михаила, 10',
    city: { id: '1', name: 'Белград' }, district: { id: '2', name: 'Стари-Град' },
    coverUrl: image(`c${i}`, 'cover').url, imagesCount: 3,
    isNewBuilding: i % 2 === 0, isFavorited: false, isPublished: true,
    publishedAt: '2026-11-03T10:00:00Z', publishedLabel: 'Опубликовано 3 ноября 2026',
    badges: ['Лифт', 'Парковка'],
  }
}

export function fixtureDetail() {
  return {
    ...fixtureSummary(1),
    heading: '2-к квартира в центре Белграда',
    descriptionHtml: '<p>Светлая квартира с ремонтом.</p>',
    images: [image('i1', 'photo1'), image('i2', 'photo2')],
    floorPlans: [image('p1', 'plan')],
    documents: [{ url: 'https://example.com/doc.pdf', name: 'Техпаспорт.pdf', mimeType: 'application/pdf', size: 120000 }],
    characteristics: [
      { key: 'rooms', label: 'Комнаты', value: '2' },
      { key: 'area_total', label: 'Площадь', value: '68 м²' },
    ],
    pricePerAreaFormatted: '1 985 €/м²',
    videoEmbedUrl: null, tourUrl: null,
    location: { lat: 44.8176, lng: 20.4569 },
    agent: { name: 'Иван Петров', organization: 'Агентство', avatarUrl: null, sourceUrl: null },
    contact: { name: 'Иван Петров', roleLabel: 'Агент', phone: '+381 11 000-00-00', avatarUrl: null, ctaLabel: 'Написать агенту', isPersonal: true },
    booking: null, viewsCount: 42, updatedAt: '2026-11-04T10:00:00Z',
    viewerCanManage: false, editHref: null,
  }
}

/** Пропсы слота для проверочного рендера (data — выгрузка с сайта, если есть). */
export function fixtureProps(slot, data = null) {
  switch (slot) {
    case 'PropertyCard': return { property: data?.fresh?.[0] ?? fixtureSummary(1), viewMode: 'grid' }
    case 'PropertyDetail': return { property: data?.detail ?? fixtureDetail(), similar: data?.similar ?? [fixtureSummary(2), fixtureSummary(3)] }
    case 'HomeSections': return { fresh: data?.fresh ?? [fixtureSummary(1), fixtureSummary(2)] }
    default: return {}
  }
}

// Общие тексты host.common() — как на сайте (ключи CommonTextKey).
const COMMON_TEXTS = {
  ru: { login: 'Войти', logout: 'Выйти', register: 'Регистрация', favorites: 'Избранное', messages: 'Сообщения', map: 'Поиск по карте', addProperty: 'Добавить объект', newBuilding: 'Новостройка', notFound: 'Объявление не найдено', similarProperties: 'Похожие объекты', leaveRequest: 'Оставить заявку', description: 'Описание', characteristics: 'Характеристики', address: 'Адрес', documents: 'Проектная документация', floorPlans: 'Планировки' },
  en: { login: 'Log In', logout: 'Log out', register: 'Sign up', favorites: 'Favorites', messages: 'Messages', map: 'Map search', addProperty: 'Add listing', newBuilding: 'New building', notFound: 'Listing not found', similarProperties: 'Similar listings', leaveRequest: 'Leave a request', description: 'Description', characteristics: 'Characteristics', address: 'Address', documents: 'Documents', floorPlans: 'Floor plans' },
}

const COMPONENT_NAMES = [
  'SbLink', 'SbLogo', 'SbSearchForm', 'SbAiSearch', 'SbPropertyGallery', 'SbCharacteristics', 'SbFavoriteButton',
  'SbContactBlock', 'SbMap', 'SbMortgageCalculator', 'SbBookingWidget', 'SbFloorPlans', 'SbNotificationBell',
  'SbFooterMenu', 'SbFooterCounters', 'SbCopyright', 'SbClientOnly',
  'UButton', 'UBadge', 'UIcon', 'UContainer', 'UAvatar', 'UDropdownMenu', 'UNavigationMenu', 'UColorModeButton',
]

function lookup(messages, key) {
  let node = messages
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

export { COMPONENT_NAMES }

/**
 * @param vue — модуль vue (тот же, которым идёт рендер)
 * @param {{
 *   locale?: string,
 *   messages?: Record<string, object>,
 *   onMissingKey?: (key: string) => void,
 *   data?: SandboxData | null,
 *   components?: Record<string, any>,
 *   onLocaleChange?: (code: string) => void,
 * }} opts
 *
 * SandboxData — выгрузка с настоящего сайта (админка → «Свои шаблоны» → «Данные для
 * песочницы»): { site, nav, links, fresh, detail, similar, cities, stats }. Чего нет —
 * берётся из тестовых данных.
 */
export function createMockHost(vue, opts = {}) {
  const { ref, defineComponent, h } = vue
  const locale = opts.locale ?? 'ru'
  const messages = opts.messages ?? {}
  const data = opts.data ?? {}

  // Компоненты сайта — заглушки: обёртка с именем и содержимое слотов.
  const stubs = Object.fromEntries(COMPONENT_NAMES.map(name => [name, defineComponent({
    name: `Mock${name}`,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      return () => h(name === 'SbLink' ? 'a' : 'div', { 'data-sb': name, href: name === 'SbLink' ? attrs.to : undefined }, slots.default?.())
    },
  })]))
  const components = { ...stubs, ...(opts.components ?? {}) }

  const text = (key) => {
    const t = lookup(messages[locale], key) ?? lookup(messages.ru, key) ?? lookup(messages.en, key)
    if (t === undefined) opts.onMissingKey?.(key)
    return t
  }
  const fill = (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : s)

  const navItem = (label, to) => ({ label, to })
  const asyncState = (value) => {
    const state = { data: ref(value), pending: ref(false), error: ref(null), refresh: async () => {} }
    const promise = Promise.resolve().then(() => state)
    return Object.assign({ ...state }, { then: promise.then.bind(promise) })
  }

  return {
    apiVersion: '1.0',
    site: ref(data.site ? { ...data.site, locale } : {
      title: 'Тестовый сайт', logoUrl: null, logoThumbUrl: null, faviconUrl: null,
      contacts: { email: 'info@example.com', phone: '+381 11 000-00-00', address: 'Белград', hours: '9–18' },
      locale, locales: [{ code: 'ru', name: 'Русский' }, { code: 'en', name: 'English' }],
      features: { map: true, chat: true, aiSearch: false, booking: false, mortgageCalculator: true, registration: true },
      edition: 'community',
    }),
    user: ref(null),
    nav: {
      main: ref(data.nav?.main ?? [navItem('Недвижимость', '/nedvizhimost'), navItem('Карта', '/karta'), navItem('Блог', '/blog')]),
      user: ref(data.nav?.user ?? []),
      footer: ref(data.nav?.footer ?? [navItem('О компании', '/about')]),
      languages: ref((data.site?.locales ?? [{ code: 'ru', name: 'Русский' }, { code: 'en', name: 'English' }])
        .map(l => ({ label: l.name, onSelect: () => opts.onLocaleChange?.(l.code) }))),
    },
    links: data.links ?? { home: '/', search: '/search', map: '/karta', login: '/auth/login', register: '/auth/register', account: '/account/general', favorites: '/account/favorites', messages: '/messages', addProperty: '/account/properties/create' },
    t: (key, params) => { const s = text(key); return s === undefined ? key : fill(s, params) },
    tc: (key, count, params) => {
      const s = text(key)
      if (s === undefined) return key
      const forms = s.split('|').map(f => f.trim())
      const rules = new Intl.PluralRules(locale)
      const order = ['zero', 'one', 'two', 'few', 'many', 'other'].filter(c => rules.resolvedOptions().pluralCategories.includes(c))
      const idx = Math.min(Math.max(order.indexOf(rules.select(count)), 0), forms.length - 1)
      return fill(forms[idx], { n: count, count, ...params })
    },
    common: key => COMMON_TEXTS[locale]?.[key] ?? COMMON_TEXTS.ru[key] ?? key,
    localePath: path => path,
    navigate: async () => {},
    format: {
      price: (v, c) => (v == null ? '' : `${v} ${c}`),
      area: v => (v == null ? '' : `${v} м²`),
      date: iso => (iso ? new Date(iso).toLocaleDateString('ru-RU') : ''),
      number: v => String(v),
    },
    data: {
      use: (name, vars) => asyncState(
        name === 'freshProperties' ? (data.fresh ?? [fixtureSummary(1), fixtureSummary(2)]).slice(0, vars?.limit ?? 6)
          : name === 'citiesWithCount' ? (data.cities ?? [{ id: '1', name: 'Белград', count: 10, href: '/belgrad/nedvizhimost' }]).slice(0, vars?.limit ?? 8)
            : (data.stats ?? { listings: 10, cities: 1 })),
    },
    head: () => {},
    actions: { openLogin: () => {}, logout: async () => {}, setLocale: async (code) => { opts.onLocaleChange?.(code) } },
    components,
  }
}
