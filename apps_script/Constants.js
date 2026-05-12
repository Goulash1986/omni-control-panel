/**
 * Constants.js — единый источник правды: ключи Properties, имена листов, схемы колонок.
 * Schema определена один раз — Sheets.js на её основе авто-инициализирует листы и читает строки в объекты.
 */

const PROP = {
  BOT_TOKEN:        'BOT_TOKEN',         // токен Telegram-бота (1234:ABC...)
  BOT_USERNAME:     'BOT_USERNAME',      // username без @ (omni_control_bot)
  OWNER_TG_ID:      'OWNER_TG_ID',       // твой числовой Telegram ID
  OPENAI_KEY:       'OPENAI_KEY',        // sk-... ключ OpenAI
  WEBAPP_URL:       'WEBAPP_URL',        // публичный URL Apps Script /exec (для Mini App и кнопок)
  POSTER_FOLDER_ID: 'POSTER_FOLDER_ID',  // ID папки Google Drive для постеров
  CHANNEL_ID:       'CHANNEL_ID',        // ID Telegram-канала для публикаций (опционально)
  TIMEZONE:         'TIMEZONE',          // например Europe/Kyiv
};

const TZ_DEFAULT = 'Europe/Kyiv';

const SHEET = {
  CATEGORIES:    'Categories',
  POSTS:         'Posts',
  ADS:           'Ads',
  HERO:          'Hero',
  TEAM:          'Team',
  INBOX:         'Inbox',
  FINANCE:       'Finance',
  HABITS:        'Habits',
  HABITS_LOG:    'HabitsLog',
  NOTIFICATIONS: 'Notifications',
  SETTINGS:      'Settings',
  AUTH:          'Auth',
  SESSIONS:      'Sessions',
  DRIVE_FILES:   'DriveFiles',
  CONV_STATE:    'ConvState',
};

/**
 * Схемы листов. Первая колонка всегда `id` (для всех кроме SETTINGS).
 * type: 'string'|'number'|'bool'|'date'|'datetime'|'json'
 * default: дефолтное значение при создании строки
 */
const SCHEMA = {
  [SHEET.CATEGORIES]: [
    { key: 'id',         type: 'number' },
    { key: 'name',       type: 'string' },
    { key: 'icon',       type: 'string' },
    { key: 'sort_order', type: 'number',   default: 0 },
    { key: 'created_at', type: 'datetime' },
  ],
  [SHEET.POSTS]: [
    { key: 'id',             type: 'number' },
    { key: 'cat_id',         type: 'number' },
    { key: 'title',          type: 'string' },
    { key: 'text',           type: 'string' },
    { key: 'poster_url',     type: 'string' },
    { key: 'buttons',        type: 'json',     default: [] },
    { key: 'scheduled_date', type: 'string' },
    { key: 'scheduled_time', type: 'string' },
    { key: 'status',         type: 'string',   default: 'draft' }, // draft|scheduled|sent
    { key: 'sent_at',        type: 'datetime' },
    { key: 'created_at',     type: 'datetime' },
  ],
  [SHEET.ADS]: [
    { key: 'id',         type: 'number' },
    { key: 'client',     type: 'string' },
    { key: 'contact',    type: 'string' },
    { key: 'text',       type: 'string' },
    { key: 'poster_url', type: 'string' },
    { key: 'price',      type: 'number',   default: 0 },
    { key: 'currency',   type: 'string',   default: 'UAH' },
    { key: 'pub_at',     type: 'datetime' },
    { key: 'del_after',  type: 'number',   default: 0 }, // часов до удаления
    { key: 'status',     type: 'string',   default: 'pending' }, // pending|active|done
    { key: 'created_at', type: 'datetime' },
  ],
  [SHEET.HERO]: [
    { key: 'id',         type: 'number' },
    { key: 'title',      type: 'string' },
    { key: 'text',       type: 'string' },
    { key: 'emoji',      type: 'string',  default: '🌟' },
    { key: 'poster_url', type: 'string' },
    { key: 'active',     type: 'bool',    default: true },
    { key: 'sort_order', type: 'number',  default: 0 },
    { key: 'created_at', type: 'datetime' },
  ],
  [SHEET.TEAM]: [
    { key: 'id',         type: 'number' },
    { key: 'tg_user_id', type: 'number' },
    { key: 'name',       type: 'string' },
    { key: 'username',   type: 'string' },
    { key: 'role',       type: 'string',  default: 'member' }, // owner|admin|member|pending
    { key: 'status',     type: 'string',  default: 'active' }, // active|pending|banned
    { key: 'added_at',   type: 'datetime' },
  ],
  [SHEET.INBOX]: [
    { key: 'id',           type: 'number' },
    { key: 'source',       type: 'string' },  // telegram|instagram|tiktok|threads
    { key: 'from_id',      type: 'string' },
    { key: 'from_name',    type: 'string' },
    { key: 'message',      type: 'string' },
    { key: 'type',         type: 'string',   default: 'unread' }, // unread|warn|starred|archived
    { key: 'received_at',  type: 'datetime' },
  ],
  [SHEET.FINANCE]: [
    { key: 'id',          type: 'number' },
    { key: 'kind',        type: 'string' },   // income|expense
    { key: 'category',    type: 'string' },
    { key: 'amount',      type: 'number',  default: 0 },
    { key: 'currency',    type: 'string',  default: 'UAH' },
    { key: 'note',        type: 'string' },
    { key: 'ref_kind',    type: 'string' },   // ad|post|manual
    { key: 'ref_id',      type: 'number' },
    { key: 'occurred_at', type: 'datetime' },
    { key: 'created_at',  type: 'datetime' },
  ],
  [SHEET.HABITS]: [
    { key: 'id',              type: 'number' },
    { key: 'name',            type: 'string' },
    { key: 'icon',            type: 'string',  default: '✅' },
    { key: 'frequency',       type: 'string',  default: 'daily' }, // daily|weekly
    { key: 'target_per_week', type: 'number',  default: 7 },
    { key: 'streak',          type: 'number',  default: 0 },
    { key: 'last_done_at',    type: 'datetime' },
    { key: 'archived',        type: 'bool',    default: false },
    { key: 'sort_order',      type: 'number',  default: 0 },
    { key: 'created_at',      type: 'datetime' },
  ],
  [SHEET.HABITS_LOG]: [
    { key: 'id',       type: 'number' },
    { key: 'habit_id', type: 'number' },
    { key: 'done_at',  type: 'datetime' },
    { key: 'note',     type: 'string' },
  ],
  [SHEET.NOTIFICATIONS]: [
    { key: 'id',         type: 'number' },
    { key: 'icon',       type: 'string' },
    { key: 'text',       type: 'string' },
    { key: 'detail',     type: 'string' },
    { key: 'channel',    type: 'string',  default: 'panel' }, // panel|bot|both
    { key: 'read',       type: 'bool',    default: false },
    { key: 'created_at', type: 'datetime' },
  ],
  [SHEET.SETTINGS]: [
    { key: 'key',        type: 'string' },
    { key: 'value',      type: 'string' },
    { key: 'updated_at', type: 'datetime' },
  ],
  [SHEET.AUTH]: [
    { key: 'token',      type: 'string' },   // короткий одноразовый код для QR /start
    { key: 'kind',       type: 'string',  default: 'qr' }, // qr|initData
    { key: 'tg_user_id', type: 'number' },
    { key: 'api_key',    type: 'string' },   // выданный X-Api-Key
    { key: 'created_at', type: 'datetime' },
    { key: 'used_at',    type: 'datetime' },
    { key: 'expires_at', type: 'datetime' },
  ],
  [SHEET.SESSIONS]: [
    { key: 'api_key',    type: 'string' },
    { key: 'tg_user_id', type: 'number' },
    { key: 'label',      type: 'string' },   // браузер/устройство
    { key: 'created_at', type: 'datetime' },
    { key: 'last_seen',  type: 'datetime' },
    { key: 'revoked',    type: 'bool',     default: false },
  ],
  [SHEET.DRIVE_FILES]: [
    { key: 'id',         type: 'number' },
    { key: 'file_id',    type: 'string' },
    { key: 'mime',       type: 'string' },
    { key: 'kind',       type: 'string' },   // post|ad|hero|misc
    { key: 'ref_id',     type: 'number' },
    { key: 'url',        type: 'string' },
    { key: 'owner_tg',   type: 'number' },
    { key: 'created_at', type: 'datetime' },
  ],
  [SHEET.CONV_STATE]: [
    { key: 'tg_user_id', type: 'number' },   // ключ — состояние диалога с ботом
    { key: 'state',      type: 'string' },
    { key: 'data',       type: 'json',     default: {} },
    { key: 'updated_at', type: 'datetime' },
  ],
};

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'TikTok',        icon: '🎵', sort_order: 1 },
  { id: 2, name: 'Instagram',     icon: '📸', sort_order: 2 },
  { id: 3, name: 'Тирс',          icon: '🎯', sort_order: 3 },
  { id: 4, name: 'Личная жизнь',  icon: '💫', sort_order: 4 },
  { id: 5, name: 'Бизнес',        icon: '💼', sort_order: 5 },
  { id: 6, name: 'Мотивация',     icon: '🔥', sort_order: 6 },
];

const SESSION_TTL_DAYS    = 60;
const QR_TOKEN_TTL_MIN    = 10;
const INIT_DATA_TTL_HOURS = 24;
