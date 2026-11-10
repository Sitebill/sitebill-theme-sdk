// Зависимости сборки темы (vite, плагин Vue, Tailwind, Vue) берутся из проекта
// темы: разработчик ставит их сам (package.json стартового шаблона). Для
// разработки в монорепо, где у проекта темы нет node_modules, можно указать
// каталог с ними: SITEBILL_THEME_DEPS=apps/web (там всё это уже стоит).
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function createDepsResolver(projectRoot) {
  const bases = [projectRoot]
  if (process.env.SITEBILL_THEME_DEPS) bases.push(resolve(process.env.SITEBILL_THEME_DEPS))

  const requires = bases
    .filter(b => existsSync(b))
    .map(b => createRequire(join(b, 'package.json')))

  /** Путь к модулю: первый найденный по списку каталогов. */
  function resolveModule(id) {
    for (const req of requires) {
      try { return req.resolve(id) } catch { /* следующий каталог */ }
    }
    throw new Error(
      `Не найден модуль «${id}». Установите зависимости темы (npm install) `
      + 'или укажите каталог с ними в SITEBILL_THEME_DEPS.',
    )
  }

  /** Каталог пакета (для алиасов CSS-импортов вроде tailwindcss/theme). */
  function packageDir(name) {
    let dir = dirname(resolveModule(name))
    while (!existsSync(join(dir, 'package.json')) || !dir.replace(/\\/g, '/').endsWith('/' + name)) {
      const parent = dirname(dir)
      if (parent === dir) throw new Error(`Не найден каталог пакета ${name}`)
      dir = parent
    }
    return dir
  }

  return {
    resolveModule,
    packageDir,
    require: id => {
      for (const req of requires) {
        try { return req(id) } catch (e) { if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw e }
      }
      return createRequire(join(projectRoot, 'package.json'))(resolveModule(id))
    },
    import: id => import(pathToFileURL(resolveModule(id)).href),
  }
}
