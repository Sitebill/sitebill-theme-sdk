#!/usr/bin/env node
// CLI SDK тем Sitebill.
//
//   sitebill-theme build   — собрать dist/, проверить, упаковать <id>-<версия>.zip
//   sitebill-theme check   — проверить уже собранный dist/
//   sitebill-theme pack    — упаковать dist/ без пересборки
//   sitebill-theme dev [--data файл.json] [--port 5180]
//                          — песочница с HMR: слоты темы на тестовых данных или на
//                            выгрузке с сайта (админка → «Свои шаблоны» → «Данные для песочницы»)
//
// Запускать из корня проекта темы (там manifest.json и src/index.ts).
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createDepsResolver } from '../build/deps.mjs'
import { createThemeViteConfig } from '../build/vite.mjs'
import { checkPackage, listFiles } from '../build/check.mjs'
import { createZip } from '../build/zip.mjs'
import { createSandboxViteConfig } from '../build/dev.mjs'

const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`Нужен Node 22.12 или новее (сейчас ${process.versions.node}): сайт грузит темы через require(esm), проверка делает так же.`)
  process.exit(1)
}

const command = process.argv[2] ?? 'build'
const root = resolve(process.cwd())
const distDir = join(root, 'dist')
const deps = createDepsResolver(root)

function readManifest() {
  const file = join(root, 'manifest.json')
  if (!existsSync(file)) throw new Error('В корне проекта нет manifest.json')
  // BOM в начале — частый подарок Windows-редакторов; JSON.parse его не прощает.
  return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
}

async function build() {
  const manifest = readManifest()
  const vite = await deps.import('vite')
  console.log(`Сборка темы ${manifest.id}@${manifest.version} (Vite ${vite.version})…`)
  await vite.build(await createThemeViteConfig({ root, outDir: distDir, deps, viteVersion: vite.version }))

  // style.css попадает в пакет, только если тема импортирует стили.
  const styles = existsSync(join(distDir, 'style.css')) ? ['style.css'] : []
  const out = { ...manifest, styles: manifest.styles ?? (styles.length ? styles : undefined) }
  for (const dir of ['locales']) {
    if (existsSync(join(root, dir))) cpSync(join(root, dir), join(distDir, dir), { recursive: true })
  }
  if (manifest.preview && existsSync(join(root, manifest.preview))) cpSync(join(root, manifest.preview), join(distDir, manifest.preview))
  writeFileSync(join(distDir, 'manifest.json'), JSON.stringify(out, null, 2) + '\n')
}

async function check() {
  const { errors, warnings, manifest } = await checkPackage(distDir, deps)
  for (const w of warnings) console.warn('  предупреждение: ' + w)
  for (const e of errors) console.error('  ошибка: ' + e)
  if (errors.length) {
    console.error(`Проверка не пройдена: ${errors.length} ошибок.`)
    process.exit(1)
  }
  console.log(`Проверка пройдена${warnings.length ? ` (предупреждений: ${warnings.length})` : ''}: ${manifest.id}@${manifest.version}, слоты ${manifest.slots.join(', ')}.`)
  return manifest
}

function pack(manifest) {
  const files = listFiles(distDir).map(name => ({ name, data: readFileSync(join(distDir, name)) }))
  const zip = createZip(files)
  const file = join(root, `${manifest.id}-${manifest.version}.zip`)
  writeFileSync(file, zip)
  console.log(`Пакет: ${file} (${Math.round(zip.length / 1024)} КБ, файлов: ${files.length})`)
}

function argValue(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

async function dev() {
  const manifest = readManifest()
  const dataArg = argValue('--data')
  const dataFile = dataArg ? resolve(root, dataArg) : null
  if (dataFile && !existsSync(dataFile)) throw new Error(`Нет файла данных ${dataFile}`)
  const vite = await deps.import('vite')
  const server = await vite.createServer(await createSandboxViteConfig({ root, deps, dataFile, port: Number(argValue('--port') ?? 5180) }))
  await server.listen()
  console.log(`Песочница темы ${manifest.id}@${manifest.version}${dataFile ? ' (данные сайта)' : ' (тестовые данные)'}:`)
  server.printUrls()
}

try {
  if (command === 'dev') {
    await dev()
  } else if (command === 'build') {
    await build()
    pack(await check())
  } else if (command === 'check') {
    await check()
  } else if (command === 'pack') {
    pack(await check())
  } else {
    console.error(`Неизвестная команда «${command}». Доступны: build, check, pack, dev.`)
    process.exit(1)
  }
} catch (e) {
  console.error(e?.message ?? e)
  process.exit(1)
}
