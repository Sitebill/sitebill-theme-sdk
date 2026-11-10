// Пресет сборки темы: Vue SFC + Tailwind → один ESM-файл client.mjs и style.css.
//
// Главное правило: в бандле нет своего Vue. Импорт `vue` заменяется модулем,
// который берёт экспорты из globalThis.__SB_HOST__.vue — экземпляра Vue сайта
// (apps/web/app/themes/host/customTheme.ts кладёт его туда перед загрузкой темы).
// Два Vue на странице сломали бы реактивность и provide/inject.
//
// SDK (@sitebill/theme-sdk) в бандл вшивается — всегда та копия, что лежит
// рядом с этим файлом: версия контракта в теме = версия SDK, которым собирали.
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SDK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SDK_SRC = join(SDK_ROOT, 'src')

const VUE_SHIM_ID = '\0sitebill-host-vue'

/** Плагин: `import … from 'vue'` → экспорты Vue сайта из глобала. */
function hostVuePlugin(vueExportNames) {
  const code = 'const V = globalThis.__SB_HOST__ && globalThis.__SB_HOST__.vue;\n'
    + 'if (!V) throw new Error("[sitebill-theme] Vue сайта не найден (globalThis.__SB_HOST__.vue): тема запущена не на сайте Sitebill");\n'
    + vueExportNames.map(k => `export const ${k} = V.${k};`).join('\n')
    + '\nexport default V;\n'
  return {
    name: 'sitebill:host-vue',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'vue') return VUE_SHIM_ID
    },
    load(id) {
      if (id === VUE_SHIM_ID) return code
    },
  }
}

/**
 * Конфиг Vite для сборки темы.
 * @param {{ root: string, outDir: string, deps: ReturnType<import('./deps.mjs').createDepsResolver>, viteVersion: string }} opts
 */
export async function createThemeViteConfig({ root, outDir, deps, viteVersion }) {
  const vue = deps.require('vue')
  const vueExportNames = Object.keys(vue).filter(k => /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'default')

  const { default: vuePlugin } = await deps.import('@vitejs/plugin-vue')
  const compiler = deps.require('vue/compiler-sfc')

  const entry = ['src/index.ts', 'src/index.js'].map(f => join(root, f)).find(f => existsSync(f))
  if (!entry) throw new Error('Не найдена точка входа темы: src/index.ts')

  const plugins = [hostVuePlugin(vueExportNames), vuePlugin({ compiler })]

  // Tailwind — только если тема его использует (есть src/style.css).
  const hasStyle = existsSync(join(root, 'src/style.css'))
  if (hasStyle) {
    const { default: tailwind } = await deps.import('@tailwindcss/vite')
    plugins.push(tailwind())
  }

  return {
    root,
    configFile: false,
    envFile: false,
    logLevel: 'warn',
    plugins,
    resolve: {
      alias: [
        { find: /^@sitebill\/theme-sdk\/tailwind\.css$/, replacement: join(SDK_SRC, 'styles/tailwind.css') },
        { find: /^@sitebill\/theme-sdk\/components$/, replacement: join(SDK_SRC, 'components.ts') },
        { find: /^@sitebill\/theme-sdk\/manifest$/, replacement: join(SDK_SRC, 'contract/manifest.ts') },
        { find: /^@sitebill\/theme-sdk$/, replacement: join(SDK_SRC, 'index.ts') },
        // CSS-импорты tailwindcss/* из файлов SDK: у SDK может не быть своих node_modules.
        ...(hasStyle ? [{ find: /^tailwindcss$/, replacement: join(deps.packageDir('tailwindcss'), 'index.css') },
          { find: /^tailwindcss\/(.*)$/, replacement: deps.packageDir('tailwindcss') + '/$1.css' }] : []),
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: 'es2022',
      minify: true,
      sourcemap: false,
      copyPublicDir: false,
      cssCodeSplit: false,
      assetsInlineLimit: 8192,
      lib: {
        // CSS попадает в style.css, если src/index.ts импортирует './style.css'.
        entry,
        formats: ['es'],
        fileName: () => 'client.mjs',
        cssFileName: 'style',
      },
      rollupOptions: {
        output: {
          // Один файл: сайт грузит client.mjs одним import()/require, без чанков.
          // Vite 8 (rolldown) называет это codeSplitting: false, Vite 7 — inlineDynamicImports.
          ...(Number(String(viteVersion).split('.')[0]) >= 8 ? { codeSplitting: false } : { inlineDynamicImports: true }),
          // CSS — style.css в корне пакета (manifest.styles), остальное — в assets/.
          assetFileNames: info => ((info.names?.[0] ?? info.name ?? '').endsWith('.css') ? 'style.css' : 'assets/[name]-[hash][extname]'),
        },
      },
    },
  }
}
