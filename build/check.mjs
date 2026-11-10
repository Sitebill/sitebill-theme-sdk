// Проверка собранного пакета темы (каталог dist/) — то же, что сайт проверит
// при загрузке, плюс пробный рендер слотов на тестовых данных. Цель — чтобы
// разработчик увидел ошибку у себя, а не после загрузки в админку.
import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SDK_SRC } from './vite.mjs'
import { createMockHost, fixtureProps, HOST_KEY } from './mock-host.mjs'

/** JSON-файл пакета; BOM (Windows-редакторы) снимаем — сайт делает так же. */
const readJson = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))

export const MAX_PACKAGE_BYTES = 20 * 1024 * 1024
const ALLOWED_EXT = /\.(mjs|js|css|json|png|jpe?g|webp|avif|gif|svg|woff2?)$/i

/** validateManifest из исходников SDK (TS) — транспилируем esbuild'ом на лету. */
async function loadManifestValidator(deps) {
  const esbuild = deps.require('esbuild')
  const out = await esbuild.build({
    entryPoints: [join(SDK_SRC, 'contract/manifest.ts')],
    bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent',
  })
  const code = out.outputFiles[0].text
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
}

export function listFiles(dir) {
  const out = []
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else out.push(relative(dir, full).split(sep).join('/'))
    }
  }
  walk(dir)
  return out.sort()
}

/**
 * @returns {Promise<{ errors: string[], warnings: string[], manifest: any }>}
 */
export async function checkPackage(distDir, deps, { render = true } = {}) {
  const errors = []
  const warnings = []

  const manifestPath = join(distDir, 'manifest.json')
  if (!existsSync(manifestPath)) return { errors: ['нет manifest.json'], warnings, manifest: null }
  let manifest
  try {
    manifest = readJson(manifestPath)
  } catch (e) {
    return { errors: ['manifest.json — не JSON: ' + e.message], warnings, manifest: null }
  }

  const { validateManifest } = await loadManifestValidator(deps)
  for (const issue of validateManifest(manifest)) errors.push(`manifest.${issue.field}: ${issue.message}`)

  // Файлы пакета
  const files = listFiles(distDir)
  let total = 0
  for (const f of files) {
    total += statSync(join(distDir, f)).size
    if (!ALLOWED_EXT.test(f)) errors.push(`файл ${f}: такой тип сайт не отдаёт (разрешены js/mjs/css/json, картинки, шрифты)`)
  }
  if (total > MAX_PACKAGE_BYTES) errors.push(`пакет ${Math.round(total / 1024 / 1024)} МБ, максимум ${MAX_PACKAGE_BYTES / 1024 / 1024} МБ`)
  if (!files.includes('client.mjs')) errors.push('нет client.mjs')
  for (const f of [...(manifest.styles ?? []), manifest.preview, manifest.server].filter(Boolean)) {
    if (!files.includes(f)) errors.push(`в манифесте указан ${f}, а в пакете его нет`)
  }
  for (const code of manifest.locales ?? []) {
    const f = `locales/${code}.json`
    if (!files.includes(f)) { warnings.push(`нет ${f}: тексты темы на этом языке покажутся ключами`); continue }
    try { readJson(join(distDir, f)) } catch (e) { errors.push(`${f} — не JSON: ${e.message}`) }
  }
  if (errors.length) return { errors, warnings, manifest }

  // Модуль: грузим так же, как сервер сайта (require ESM, Vue — из глобала).
  const vue = deps.require('vue')
  globalThis.__SB_HOST__ = { vue }
  let theme
  try {
    const req = createRequire(pathToFileURL(join(distDir, 'package.json')))
    theme = req(join(distDir, manifest.server ?? 'client.mjs')).default
  } catch (e) {
    if (e.code === 'ERR_REQUIRE_ASYNC_MODULE') errors.push('в бандле есть top-level await — сайт не сможет загрузить тему на сервере; уберите await с верхнего уровня модулей')
    else errors.push('модуль не загрузился: ' + e.message)
    return { errors, warnings, manifest }
  }
  if (!theme || theme.__sitebillTheme !== 1) {
    errors.push('client.mjs не экспортирует по умолчанию результат defineTheme(...)')
    return { errors, warnings, manifest }
  }
  if (String(theme.apiVersion).split('.')[0] !== manifest.sdk) {
    errors.push(`тема собрана под контракт ${theme.apiVersion}, а в манифесте sdk=${manifest.sdk}`)
  }
  const exported = Object.keys(theme.components ?? {}).filter(k => theme.components[k])
  for (const slot of manifest.slots) {
    if (!exported.includes(slot)) errors.push(`слот ${slot} есть в манифесте, но defineTheme его не отдаёт`)
  }
  for (const slot of exported) {
    if (!manifest.slots.includes(slot)) warnings.push(`слот ${slot} есть в коде, но не в manifest.slots — сайт его не покажет`)
  }
  if (errors.length || !render) return { errors, warnings, manifest }

  // Пробный SSR-рендер каждого слота на тестовых данных.
  const { renderToString } = deps.require('vue/server-renderer')
  const messages = {}
  for (const code of manifest.locales ?? []) {
    const f = join(distDir, 'locales', `${code}.json`)
    if (existsSync(f)) messages[code] = readJson(f)
  }
  for (const locale of (manifest.locales?.length ? manifest.locales : ['ru'])) {
    const missing = new Set()
    for (const slot of manifest.slots) {
      const vueWarnings = []
      const app = vue.createSSRApp({ render: () => vue.h(theme.components[slot], fixtureProps(slot)) })
      app.provide(HOST_KEY, createMockHost(vue, { locale, messages, onMissingKey: k => missing.add(k) }))
      app.config.warnHandler = msg => vueWarnings.push(msg)
      let renderError = null
      app.config.errorHandler = (err) => { renderError = err }
      try {
        const html = await renderToString(app)
        if (renderError) throw renderError
        if (!html.trim() || html === '<!---->') warnings.push(`[${locale}] слот ${slot} ничего не нарисовал на тестовых данных`)
      } catch (e) {
        errors.push(`[${locale}] слот ${slot} падает при рендере: ${e?.message ?? e}`)
      }
      for (const w of vueWarnings) warnings.push(`[${locale}] ${slot}: Vue: ${w}`)
    }
    for (const k of missing) warnings.push(`[${locale}] нет перевода ключа «${k}»`)
  }

  return { errors, warnings, manifest }
}
