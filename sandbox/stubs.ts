// Заглушки компонентов сайта (Sb* и Nuxt UI) для песочницы. Цель — увидеть раскладку
// темы, а не повторить сайт: настоящие компоненты (галерея с лайтбоксом, карта, форма
// поиска с полями тенанта) рисует только сайт. Пропсы — как в контракте (src/components.ts).
import { defineComponent, h, inject, ref, type Component } from 'vue'
import type { MediaImage, NavItem, PropertyCharacteristic, PropertyDetailData, ThemeHost } from '../src'
import { THEME_HOST_KEY } from '../src/runtime'

const box = (label: string, extra = '') =>
  h('div', { class: `rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-xs text-slate-500 ${extra}`, 'data-sb-stub': label }, label)

const useHostSafe = () => inject(THEME_HOST_KEY) as ThemeHost

function navLinks(items: NavItem[], cls: string) {
  return items.map(i => h('a', { href: i.to ?? '#', class: cls, onClick: (e: Event) => { e.preventDefault(); i.onSelect?.() } }, i.label))
}

const SbLink = defineComponent({
  inheritAttrs: false,
  props: { to: { type: String, default: '#' }, external: Boolean },
  setup(props, { slots, attrs }) {
    // В песочнице переходов нет: ссылка только показывает адрес в подсказке.
    return () => h('a', { ...attrs, href: props.to, title: props.to, onClick: (e: Event) => e.preventDefault() }, slots.default?.())
  },
})

const SbLogo = defineComponent({
  setup() {
    const host = useHostSafe()
    return () => host.site.value.logoUrl
      ? h('img', { src: host.site.value.logoUrl, alt: host.site.value.title, class: 'h-8' })
      : h('span', { class: 'font-bold text-lg' }, host.site.value.title || 'Logo')
  },
})

const SbPropertyGallery = defineComponent({
  props: { images: { type: Array as () => MediaImage[], default: () => [] } },
  setup(props, { attrs }) {
    return () => h('div', { class: ['grid grid-cols-3 gap-2', attrs.class] },
      props.images.length
        ? props.images.slice(0, 6).map((img, i) => h('img', { key: img.id, src: img.thumbUrl, alt: img.alt, class: i === 0 ? 'col-span-3 h-72 w-full rounded-xl object-cover' : 'h-24 w-full rounded-lg object-cover' }))
        : [box('SbPropertyGallery: нет фото', 'col-span-3 h-48')])
  },
})

const SbCharacteristics = defineComponent({
  props: { property: { type: Object as () => PropertyDetailData, required: true }, hideTitle: Boolean },
  setup(props, { attrs }) {
    const host = useHostSafe()
    return () => h('div', { class: attrs.class }, [
      props.hideTitle ? null : h('h2', { class: 'mb-3 text-lg font-semibold' }, host.common('characteristics')),
      h('dl', { class: 'grid grid-cols-2 gap-x-6 gap-y-2 text-sm' }, (props.property.characteristics as PropertyCharacteristic[]).flatMap(c => [
        h('dt', { class: 'text-slate-500' }, c.label), h('dd', { class: 'font-medium' }, c.value),
      ])),
      h('p', { class: 'mt-2 text-[11px] text-slate-400' }, 'На сайте здесь также кастомные поля тенанта и их группы'),
    ])
  },
})

const SbFavoriteButton = defineComponent({
  props: { propertyId: String, isFavorited: Boolean },
  setup(props) {
    const on = ref(props.isFavorited)
    return () => h('button', { type: 'button', class: 'rounded-full bg-white/90 px-2 py-1 text-sm shadow', onClick: (e: Event) => { e.preventDefault(); on.value = !on.value } }, on.value ? '♥' : '♡')
  },
})

const SbContactBlock = defineComponent({
  props: { property: { type: Object as () => PropertyDetailData, required: true } },
  emits: ['lead'],
  setup(props, { emit }) {
    return () => {
      const c = props.property.contact
      return h('div', { class: 'space-y-3 text-sm' }, [
        c.name ? h('div', [h('p', { class: 'text-xs text-slate-500' }, c.roleLabel), h('p', { class: 'font-semibold' }, c.name)]) : null,
        h('button', { type: 'button', class: 'w-full rounded-lg bg-primary/10 px-3 py-2 font-medium text-primary', onClick: () => emit('lead') }, c.ctaLabel),
        c.phone ? h('a', { href: `tel:${c.phone}`, class: 'block rounded-lg bg-primary px-3 py-2 text-center font-semibold text-white' }, c.phone) : null,
      ])
    }
  },
})

const SbFloorPlans = defineComponent({
  props: { images: { type: Array as () => MediaImage[], default: () => [] } },
  setup(props) {
    return () => h('div', { class: 'grid grid-cols-3 gap-3' }, props.images.map(img => h('img', { key: img.id, src: img.thumbUrl, alt: img.alt, class: 'rounded-lg border' })))
  },
})

const SbFooterMenu = defineComponent({
  setup() {
    const host = useHostSafe()
    return () => h('nav', { class: 'flex flex-wrap gap-4 text-sm' }, navLinks(host.nav.footer.value, 'hover:text-primary'))
  },
})

const SbCopyright = defineComponent({
  setup() {
    const host = useHostSafe()
    return () => h('span', `© ${new Date().getFullYear()} ${host.site.value.title}`)
  },
})

const named = (label: string, extra = '') => defineComponent({ setup: () => () => box(label, extra) })
const passthrough = defineComponent({ setup: (_, { slots }) => () => slots.default?.() })

// ── Nuxt UI ────────────────────────────────────────────────────────────────
const UButton = defineComponent({
  inheritAttrs: false,
  props: { label: String, icon: String, trailingIcon: String, to: String, color: String, variant: String, size: String, block: Boolean, loading: Boolean },
  setup(props, { slots, attrs }) {
    return () => h(props.to ? 'a' : 'button', {
      ...attrs,
      href: props.to,
      type: props.to ? undefined : 'button',
      class: ['inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
        props.variant === 'ghost' || props.variant === 'link' ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : props.variant === 'soft' ? 'bg-primary/10 text-primary' : 'bg-primary text-white',
        props.block ? 'w-full' : '', attrs.class],
    }, [props.icon ? h('span', { class: 'text-xs opacity-60' }, '◆') : null, slots.default?.() ?? props.label])
  },
})
const UBadge = defineComponent({
  inheritAttrs: false,
  props: { color: String, variant: String, size: String },
  setup(props, { slots, attrs }) {
    return () => h('span', { ...attrs, class: ['inline-flex rounded px-1.5 py-0.5 text-xs font-medium', props.variant === 'solid' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', attrs.class] }, slots.default?.())
  },
})
const UIcon = defineComponent({
  inheritAttrs: false,
  props: { name: String },
  setup(props, { attrs }) {
    return () => h('span', { ...attrs, title: props.name, class: ['inline-block rounded-sm bg-current opacity-30', attrs.class || 'size-4'] })
  },
})
const UContainer = defineComponent({ setup: (_, { slots }) => () => h('div', { class: 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' }, slots.default?.()) })
const UAvatar = defineComponent({
  props: { src: String, alt: String },
  setup(props) {
    return () => props.src ? h('img', { src: props.src, alt: props.alt, class: 'size-8 rounded-full' }) : h('span', { class: 'inline-flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs' }, (props.alt ?? '?').slice(0, 1))
  },
})
const UNavigationMenu = defineComponent({
  inheritAttrs: false,
  props: { items: { type: Array as () => NavItem[], default: () => [] }, orientation: String },
  setup(props, { attrs }) {
    return () => h('nav', { class: [props.orientation === 'vertical' ? 'flex flex-col gap-1' : 'flex items-center gap-4', 'text-sm font-medium', attrs.class] }, navLinks(props.items, 'hover:text-primary'))
  },
})
// Выпадающее меню: в песочнице — только кнопка-триггер (что внутри, видно в nav.* данных).
const UDropdownMenu = passthrough
const UColorModeButton = defineComponent({
  setup() {
    const dark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
    return () => h('button', { type: 'button', class: 'rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800', onClick: () => { dark.value = !dark.value; document.documentElement.classList.toggle('dark', dark.value) } }, dark.value ? '☀' : '☾')
  },
})

export const SANDBOX_COMPONENTS: Record<string, Component> = {
  SbLink,
  SbLogo,
  SbSearchForm: named('SbSearchForm — форма поиска сайта (поля настраивает тенант)', 'py-6 text-center bg-white/60 dark:bg-slate-800/60'),
  SbAiSearch: named('SbAiSearch — ИИ-поиск сайта', 'mt-2'),
  SbPropertyGallery,
  SbCharacteristics,
  SbFavoriteButton,
  SbContactBlock,
  SbMap: named('SbMap — карта сайта', 'h-48 flex items-center justify-center'),
  SbMortgageCalculator: named('SbMortgageCalculator — ипотечный калькулятор', 'py-6'),
  SbBookingWidget: named('SbBookingWidget — бронирование', 'py-6'),
  SbFloorPlans,
  SbNotificationBell: named('🔔'),
  SbFooterMenu,
  SbFooterCounters: named('SbFooterCounters — счётчики аналитики'),
  SbCopyright,
  SbClientOnly: passthrough,
  UButton, UBadge, UIcon, UContainer, UAvatar, UDropdownMenu, UNavigationMenu, UColorModeButton,
}

