/**
 * Данные, которые тема получает от сайта.
 *
 * Это НЕ типы GraphQL-схемы платформы: схема меняется вместе с продуктом, а
 * тема клиента должна переживать обновления. Хост сам переводит свои данные в
 * эти DTO. Поэтому тут же лежат готовые подписи (`dealTypeLabel`, `areaLabel`…):
 * тема не зависит от наших ключей перевода и списков значений (в том числе
 * тенантских вариантов из «Списков значений» кастомных полей).
 *
 * Правило эволюции: поля только добавляются (новые — необязательные). Удалить или
 * переименовать поле можно только в новой мажорной версии контракта.
 */

/** Ссылка на элемент справочника (город, район, улица). */
export interface RefItem {
  id: string
  name: string
}

export interface MediaImage {
  id: string
  url: string
  /** Уменьшенная копия, если есть; иначе совпадает с url. */
  thumbUrl: string
  /** WebP-копия, если сайт её сделал. */
  webpUrl: string | null
  alt: string
  width?: number | null
  height?: number | null
}

export interface PropertyDocument {
  url: string
  name: string
  mimeType: string
  /** Размер в байтах. */
  size: number | null
}

/**
 * Характеристика объекта, уже переведённая и отформатированная.
 * В версии 1.0 — базовые поля (комнаты, площадь, этаж, тип дома); кастомные поля
 * тенанта добавятся в этот же список (добавление — не ломающее изменение). Полный
 * блок со всеми полями и группами уже сейчас рисует SbCharacteristics.
 */
export interface PropertyCharacteristic {
  /** Стабильный ключ поля (`rooms`, `area_total`, `cf_balcony`…), можно использовать для иконок. */
  key: string
  label: string
  value: string
  /** Группа, в которой поле показано в стандартной теме («Основное», «Дом»…). */
  group?: string | null
}

/**
 * Объект в списке: карточка в выдаче, подборки, «похожие».
 */
export interface PropertySummary {
  id: string
  /** Готовая ссылка на страницу объекта (уже с префиксом языка). */
  href: string
  title: string

  /** Тип сделки: `sale`, `rent_long`, `rent_daily` или тенантское значение. */
  dealType: string
  dealTypeLabel: string
  /** Тип объекта: `apartment`, `house`, `commercial`… или тенантское значение. */
  type: string
  typeLabel: string

  price: number | null
  /** Код валюты (`RUB`, `USD`, `EUR`…). */
  currency: string
  /** Цена с валютой, отформатированная под язык сайта; пустая строка, если цены нет. */
  priceFormatted: string

  /** Общая площадь в м². */
  areaTotal: number | null
  /** «2 комн., 54 м²» / «Студия, 25 м²» на языке сайта. */
  areaLabel: string
  /** null — не указано, 0 — студия. */
  rooms: number | null
  floor: number | null
  floorsTotal: number | null
  /** Тип дома на языке сайта, пустая строка, если не указан. */
  buildingTypeLabel: string

  /** Адрес одной строкой: город, район, улица, дом. */
  address: string
  city: RefItem | null
  district: RefItem | null

  coverUrl: string | null
  imagesCount: number

  isNewBuilding: boolean
  isFavorited: boolean
  /** false — объект скрыт; такие видит только владелец/админ, тема может их приглушить. */
  isPublished: boolean

  /** ISO-дата публикации. */
  publishedAt: string | null
  /** «Опубликовано 3 ноября 2026» на языке сайта. */
  publishedLabel: string | null

  /** Короткие признаки для бейджей («Лифт», «Парковка»), уже переведённые. */
  badges: string[]
}

export interface PropertyAgent {
  name: string
  organization: string | null
  avatarUrl: string | null
  /** Ссылка на источник объявления (для объектов из фидов), если тенант её показывает. */
  sourceUrl: string | null
}

/**
 * Кому звонить/писать по объекту. Хост уже выбрал источник: агент из фида,
 * автор объявления или его агентство, а без них — сам сайт (название и телефон
 * из настроек). Готовый блок с кнопкой заявки — SbContactBlock.
 */
export interface PropertyContact {
  name: string
  /** «Агент», «Агентство», «Контакт»… */
  roleLabel: string
  phone: string | null
  avatarUrl: string | null
  /** Подпись кнопки заявки: «Написать агенту» или «Оставить заявку». */
  ctaLabel: string
  /** true — персональный контакт (агент, автор), false — контакт сайта. */
  isPersonal: boolean
}

/**
 * Объект на своей странице.
 */
export interface PropertyDetailData extends PropertySummary {
  /** Заголовок страницы (h1): из SEO-шаблонов тенанта, если заданы, иначе title. */
  heading: string
  /** Описание; HTML уже очищен на стороне сайта. */
  descriptionHtml: string
  images: MediaImage[]
  floorPlans: MediaImage[]
  documents: PropertyDocument[]
  characteristics: PropertyCharacteristic[]

  /** «125 000 ₽/м²», пустая строка, если не посчитать. */
  pricePerAreaFormatted: string

  /** Адрес для встраиваемого плеера (YouTube/RuTube/VK уже приведены к embed). */
  videoEmbedUrl: string | null
  /** Ссылка на 3D-тур. */
  tourUrl: string | null

  /** Координаты; null, если не заданы или тенант выключил карту. */
  location: { lat: number, lng: number } | null

  agent: PropertyAgent | null
  contact: PropertyContact

  /** Посуточная аренда с онлайн-бронированием (виджет — SbBookingWidget). */
  booking: { enabled: boolean } | null

  viewsCount: number | null
  updatedAt: string | null
  /** Текущий пользователь может редактировать объект (показать кнопку «Редактировать»). */
  viewerCanManage: boolean
  /** Ссылка на редактирование, если viewerCanManage. */
  editHref: string | null
}

/** Город со счётчиком объявлений (для блоков «Города» на главной). */
export interface CityWithCount extends RefItem {
  count: number
  href: string
}

export interface SiteStats {
  listings: number
  cities: number
}
