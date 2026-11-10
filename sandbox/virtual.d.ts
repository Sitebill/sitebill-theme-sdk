// Виртуальные модули песочницы (build/dev.mjs → sandboxPlugin).
declare module 'virtual:sitebill-theme-entry' {
  import type { ThemeModule } from '../src'
  const theme: ThemeModule
  export default theme
}
declare module 'virtual:sitebill-theme-manifest' {
  import type { ThemeManifest } from '../src'
  const manifest: Partial<ThemeManifest> & { slots: string[], locales: string[] }
  export default manifest
}
declare module 'virtual:sitebill-theme-messages' {
  const messages: Record<string, Record<string, unknown>>
  export default messages
}
declare module 'virtual:sitebill-sandbox-data' {
  const data: any
  export default data
}
declare module '*.css'
