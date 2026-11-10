// Подготовка пакета к публикации в npm: `node build/publish.mjs` → каталог npm/ (публиковать
// оттуда: `npm publish ./npm`). Исходники в монорепо остаются как есть (TS, exports на src).
//
// Что внутри npm/:
// - dist/*.js — точки входа, собранные в ESM без внешних зависимостей, кроме vue;
// - dist/types/**/*.d.ts — типы (tsc --emitDeclarationOnly);
// - src/ — исходники: CLI собирает тему из них (алиас @sitebill/theme-sdk → src), чтобы
//   контракт в теме всегда совпадал с версией SDK, которым собирали;
// - build/, bin/, sandbox/ — CLI, пресет сборки и песочница.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDepsResolver } from './deps.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'npm')
const deps = createDepsResolver(ROOT)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

for (const dir of ['src', 'build', 'bin', 'sandbox']) cpSync(join(ROOT, dir), join(OUT, dir), { recursive: true })
cpSync(join(ROOT, 'README.md'), join(OUT, 'README.md'))
cpSync(join(ROOT, 'LICENSE'), join(OUT, 'LICENSE'))
rmSync(join(OUT, 'build/publish.mjs'))

// JS-точки входа
const esbuild = deps.require('esbuild')
const entries = { index: 'src/index.ts', components: 'src/components.ts', manifest: 'src/contract/manifest.ts' }
for (const [name, file] of Object.entries(entries)) {
  await esbuild.build({
    entryPoints: [join(ROOT, file)],
    outfile: join(OUT, 'dist', `${name}.js`),
    bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
    external: ['vue'], logLevel: 'warning',
  })
}

// Типы
const tsc = deps.resolveModule('typescript/bin/tsc')
const vueDir = deps.packageDir('vue')
const tsconfig = join(OUT, 'tsconfig.types.json')
writeFileSync(tsconfig, JSON.stringify({
  compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, skipLibCheck: true,
    declaration: true, emitDeclarationOnly: true, outDir: 'dist/types', rootDir: 'src', lib: ['ES2022', 'DOM'],
    paths: { vue: [vueDir.replace(/\\/g, '/')] },
  },
  include: ['src/**/*.ts'],
}, null, 2))
const { execFileSync } = await import('node:child_process')
execFileSync(process.execPath, [tsc, '-p', tsconfig], { stdio: 'inherit', cwd: OUT })
rmSync(tsconfig)

// package.json для npm: exports на собранные файлы, CLI и стили — как в монорепо.
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const types = f => `./dist/types/${f}.d.ts`
const published = {
  ...pkg,
  main: './dist/index.js',
  types: types('index'),
  exports: {
    '.': { types: types('index'), import: './dist/index.js' },
    './components': { types: types('components'), import: './dist/components.js' },
    './manifest': { types: types('contract/manifest'), import: './dist/manifest.js' },
    './tailwind.css': './src/styles/tailwind.css',
    './build/mock-host': { types: './build/mock-host.d.mts', import: './build/mock-host.mjs' },
    './package.json': './package.json',
  },
  files: ["dist", "src", "build", "bin", "sandbox", "README.md", "LICENSE"],
  scripts: undefined,
}
writeFileSync(join(OUT, 'package.json'), JSON.stringify(published, null, 2) + '\n')

for (const f of ['dist/index.js', 'dist/components.js', 'dist/manifest.js', types('index').slice(2), types('components').slice(2)]) {
  if (!existsSync(join(OUT, f))) throw new Error(`не собран ${f}`)
}
console.log(`Готово: ${OUT}. Публикация: npm publish ./npm --access public`)
