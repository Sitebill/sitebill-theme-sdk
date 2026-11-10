// Песочница темы: `sitebill-theme dev` — Vite dev-сервер с HMR, который рисует слоты
// темы на тестовых данных или на выгрузке с настоящего сайта (--data файл.json).
//
// Отличие от сборки: Vue здесь настоящий (из зависимостей проекта), без глобала —
// песочница сама и есть «сайт». SDK и Tailwind подключаются так же, как в build.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SDK_SRC } from './vite.mjs'

const SDK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SANDBOX_DIR = join(SDK_ROOT, 'sandbox')

const V = {
  entry: 'virtual:sitebill-theme-entry',
  manifest: 'virtual:sitebill-theme-manifest',
  messages: 'virtual:sitebill-theme-messages',
  data: 'virtual:sitebill-sandbox-data',
}

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) } catch { return fallback }
}

/** Виртуальные модули песочницы: тема проекта, её манифест и переводы, данные. */
function sandboxPlugin({ root, dataFile }) {
  const entry = ['src/index.ts', 'src/index.js'].map(f => join(root, f)).find(f => existsSync(f))
  const localesDir = join(root, 'locales')
  const resolved = id => '\0' + id

  return {
    name: 'sitebill:sandbox',
    resolveId(id) {
      if (Object.values(V).includes(id)) return resolved(id)
    },
    load(id) {
      if (id === resolved(V.entry)) {
        if (!entry) throw new Error('Не найдена точка входа темы: src/index.ts')
        return `export { default } from ${JSON.stringify(entry.replace(/\\/g, '/'))}`
      }
      if (id === resolved(V.manifest)) {
        this.addWatchFile(join(root, 'manifest.json'))
        return `export default ${JSON.stringify(readJson(join(root, 'manifest.json'), {}))}`
      }
      if (id === resolved(V.messages)) {
        const messages = {}
        if (existsSync(localesDir)) {
          for (const f of readdirSync(localesDir).filter(n => n.endsWith('.json'))) {
            this.addWatchFile(join(localesDir, f))
            messages[f.replace(/\.json$/, '')] = readJson(join(localesDir, f), {})
          }
        }
        return `export default ${JSON.stringify(messages)}`
      }
      if (id === resolved(V.data)) {
        if (dataFile) this.addWatchFile(dataFile)
        return `export default ${JSON.stringify(dataFile ? readJson(dataFile, null) : null)}`
      }
    },
    // Правка manifest.json / locales/*.json / файла данных — перезагрузить страницу (компоненты обновляет HMR).
    handleHotUpdate({ file, server }) {
      const f = file.replace(/\\/g, '/')
      if (f.endsWith('/manifest.json') || f.includes('/locales/') || (dataFile && resolve(file) === resolve(dataFile))) {
        for (const id of Object.values(V)) {
          const mod = server.moduleGraph.getModuleById(resolved(id))
          if (mod) server.moduleGraph.invalidateModule(mod)
        }
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
    configureServer(server) {
      // Страница песочницы на «/» — свой index.html из SDK.
      return () => server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' || !(req.url === '/' || req.url?.startsWith('/?'))) return next()
        const html = readFileSync(join(SANDBOX_DIR, 'index.html'), 'utf8')
          .replace('%MAIN%', '/@fs/' + join(SANDBOX_DIR, 'main.ts').replace(/\\/g, '/').replace(/^\//, ''))
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(await server.transformIndexHtml(req.url, html))
      })
    },
  }
}

/**
 * @param {{ root: string, deps: ReturnType<import('./deps.mjs').createDepsResolver>, dataFile?: string | null, port?: number }} opts
 */
export async function createSandboxViteConfig({ root, deps, dataFile = null, port = 5180 }) {
  const { default: vuePlugin } = await deps.import('@vitejs/plugin-vue')
  const compiler = deps.require('vue/compiler-sfc')
  const { default: tailwind } = await deps.import('@tailwindcss/vite')
  const vueDir = deps.packageDir('vue')
  const tailwindDir = deps.packageDir('tailwindcss')

  return {
    root,
    configFile: false,
    envFile: false,
    appType: 'custom',
    plugins: [sandboxPlugin({ root, dataFile }), vuePlugin({ compiler }), tailwind()],
    resolve: {
      alias: [
        { find: /^@sitebill\/theme-sdk\/tailwind\.css$/, replacement: join(SDK_SRC, 'styles/tailwind.css') },
        { find: /^@sitebill\/theme-sdk\/components$/, replacement: join(SDK_SRC, 'components.ts') },
        { find: /^@sitebill\/theme-sdk\/build\/mock-host$/, replacement: join(SDK_ROOT, 'build/mock-host.mjs') },
        { find: /^@sitebill\/theme-sdk$/, replacement: join(SDK_SRC, 'index.ts') },
        // Один Vue на всё (тема, SDK, песочница) — из зависимостей проекта темы.
        { find: /^vue$/, replacement: join(vueDir, 'dist/vue.runtime.esm-bundler.js') },
        { find: /^tailwindcss$/, replacement: join(tailwindDir, 'index.css') },
        { find: /^tailwindcss\/(.*)$/, replacement: tailwindDir + '/$1.css' },
      ],
    },
    define: {
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    server: {
      port,
      strictPort: false,
      // Файлы SDK и песочницы лежат вне проекта темы.
      fs: { allow: [root, SDK_ROOT, vueDir, tailwindDir] },
    },
    optimizeDeps: { noDiscovery: true, include: [] },
  }
}
