# AGENTS.md — @sitebill/theme-sdk

SDK for custom Sitebill website themes (Vue 3 + Tailwind). Product sites:
https://sitebillcms.com/ (international), https://www.sitebill.ru/ (Russia/CIS).

- Layout: `src/contract/*` (contract v1: DTO, slots, host, manifest), `src/{runtime,define,components}.ts`,
  `src/styles/*`, `bin/sitebill-theme.mjs` (CLI), `build/*` (Vite preset, check, zip, dev sandbox, publish), `sandbox/`.
- Contract rule: DTO and `Sb*` props only gain fields within a major version; any removal/rename = new major
  (`THEME_API_MAJOR` here and `SUPPORTED_SDK` in the platform API).
- Theme bundles are ESM without top-level await; `vue` is external (taken from `globalThis.__SB_HOST__.vue`).
- Typecheck: `npm run typecheck`. Publish: `node build/publish.mjs && npm publish ./npm --access public`.
- Comments and docs: Russian is fine, public-facing text (README, package metadata) is bilingual EN/RU.
- Dev docs: https://github.com/rumantic/etownpro-developers-docs
