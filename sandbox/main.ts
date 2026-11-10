// Приложение песочницы: панель (страница, язык, плитка/список, тёмный режим) и слоты
// темы с тестовым хостом. Хост пересоздаётся при смене языка — как на сайте, где
// язык выбирает запрос.
import * as Vue from 'vue'
import { computed, createApp, defineComponent, h, provide, ref, Suspense, watch } from 'vue'
import theme from 'virtual:sitebill-theme-entry'
import manifest from 'virtual:sitebill-theme-manifest'
import messages from 'virtual:sitebill-theme-messages'
import data from 'virtual:sitebill-sandbox-data'
import { createMockHost, fixtureDetail, fixtureSummary } from '../build/mock-host.mjs'
import { THEME_HOST_KEY } from '../src/runtime'
import { SANDBOX_COMPONENTS } from './stubs'
import './sandbox.css'

// Тема на сайте берёт Vue из глобала; в песочнице он тот же, что у приложения.
;(globalThis as any).__SB_HOST__ = { vue: Vue }

const PAGES = [
  { id: 'home', label: 'Главная', slots: ['Header', 'Hero', 'HomeSections', 'Footer'] },
  { id: 'list', label: 'Список', slots: ['Header', 'PropertyCard', 'Footer'] },
  { id: 'detail', label: 'Объект', slots: ['Header', 'PropertyDetail', 'Footer'] },
] as const

const params = new URLSearchParams(location.search)
const page = ref<string>(params.get('page') ?? 'home')
const locales: string[] = manifest.locales?.length ? manifest.locales : ['ru']
const locale = ref<string>(params.get('locale') ?? locales[0]!)
const viewMode = ref<'grid' | 'list'>('grid')
const leadClicks = ref(0)
watch([page, locale], () => {
  const q = new URLSearchParams({ page: page.value, locale: locale.value })
  history.replaceState(null, '', `?${q}`)
})

const fresh = (data?.fresh?.length ? data.fresh : [1, 2, 3, 4, 5, 6].map(fixtureSummary))
const detail = data?.detail ?? fixtureDetail()
const similar = data?.similar ?? [fixtureSummary(2), fixtureSummary(3)]
const has = (slot: string) => manifest.slots?.includes(slot) && theme?.components?.[slot]

/** Слот темы или пометка «берётся у сайта». */
function slot(name: string, props: Record<string, unknown> = {}) {
  return has(name)
    ? h(theme.components[name], { key: `${name}-${locale.value}`, ...props })
    : h('div', { class: 'my-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800' },
        `${name}: тема не заменяет этот слот — на сайте здесь будет стандартная тема (board)`)
}

const ThemeArea = defineComponent({
  setup() {
    // Хост на язык: область темы пересоздаётся по ключу locale (см. App ниже), как запрос на сайте.
    provide(THEME_HOST_KEY, createMockHost(Vue, { locale: locale.value, messages, data, components: SANDBOX_COMPONENTS, onLocaleChange: (code: string) => { locale.value = code } }))
    const gridClass = computed(() => manifest.listing?.gridClass?.[viewMode.value]
      ?? (viewMode.value === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'))

    return () => {
      const current = PAGES.find(p => p.id === page.value) ?? PAGES[0]
      const body = current.slots.map((s) => {
        if (s === 'PropertyCard') {
          return h('main', { class: 'mx-auto max-w-7xl px-4 py-6' }, [
            h('div', { class: gridClass.value }, fresh.map((p: unknown) => slot('PropertyCard', { property: p, viewMode: viewMode.value }))),
          ])
        }
        if (s === 'PropertyDetail') {
          return h('main', { class: 'mx-auto max-w-7xl px-4 py-6' }, [slot('PropertyDetail', { property: detail, similar, onOpenLeadForm: () => { leadClicks.value++ } })])
        }
        if (s === 'Hero') return h('main', { class: 'mx-auto max-w-7xl px-4 pt-4' }, [slot('Hero')])
        if (s === 'HomeSections') {
          return h('div', { class: 'mx-auto max-w-7xl px-4' }, [has('HomeSections') ? slot('HomeSections', { fresh }) : h('p', { class: 'text-xs text-slate-400 py-4' }, 'HomeSections не задан — на сайте здесь стандартные секции главной')])
        }
        return slot(s)
      })
      return h('div', { class: 'flex min-h-screen flex-col' }, body)
    }
  },
})

const Toolbar = defineComponent({
  setup() {
    const btn = (active: boolean) => `rounded px-2 py-1 ${active ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-slate-700'}`
    return () => h('div', { class: 'sticky top-0 z-[100] flex flex-wrap items-center gap-2 bg-slate-900 px-3 py-1.5 text-xs text-white' }, [
      h('b', `Песочница: ${manifest.name ?? '?'} ${manifest.version ?? ''}`),
      h('span', { class: 'opacity-60' }, data ? '· данные сайта' : '· тестовые данные'),
      h('span', { class: 'mx-2 opacity-30' }, '|'),
      ...PAGES.map(p => h('button', { class: btn(page.value === p.id), onClick: () => { page.value = p.id } }, p.label)),
      h('span', { class: 'mx-2 opacity-30' }, '|'),
      ...locales.map(l => h('button', { class: btn(locale.value === l), onClick: () => { locale.value = l } }, l.toUpperCase())),
      page.value === 'list' ? h('button', { class: btn(false), onClick: () => { viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid' } }, viewMode.value === 'grid' ? 'Плитка → список' : 'Список → плитка') : null,
      h('button', { class: btn(false), onClick: () => document.documentElement.classList.toggle('dark') }, 'Тёмный режим'),
      leadClicks.value ? h('span', { class: 'ml-auto text-amber-300' }, `open-lead-form ×${leadClicks.value}`) : null,
    ])
  },
})

createApp({
  render: () => h('div', [
    h(Toolbar),
    // Suspense — как на сайте: слоты могут ждать данные (await host.data.use(...)).
    h(Suspense, null, { default: () => h(ThemeArea, { key: `${locale.value}-${page.value}` }), fallback: () => h('p', { class: 'p-6 text-sm' }, 'Загрузка…') }),
  ]),
}).mount('#app')
