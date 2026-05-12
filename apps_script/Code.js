/**
 * Code.js — точка входа Apps Script Web App.
 *
 * doGet:
 *   - без параметров → отдаёт HTML панели (Mini App или обычный браузер)
 *   - ?action=ping        → проверка живости
 *   - ?action=auth_qr     → создать QR-токен для входа из браузера (нужен PIN/секрет?)
 *
 * doPost:
 *   - ?tg=<WEBHOOK_SECRET> → Telegram webhook от бота
 *   - в остальных случаях → REST API панели (action в body)
 */

const WEBHOOK_SECRET_PROP = 'WEBHOOK_SECRET';

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || '';
    if (!action) return serveHtml_(params);

    switch (action) {
      case 'ping':
        return ok_({ pong: true, time: nowIso_() });
      case 'auth_qr_create':
        return apiAuthQrCreate_(e);
      case 'auth_qr_check':
        return apiAuthQrCheck_(e);
      case 'whoami':
        return apiWhoAmI_(e);
      default:
        return err_('unknown_action');
    }
  } catch (ex) {
    logErr_('doGet', ex);
    return err_(String(ex && ex.message || ex));
  }
}

function doPost(e) {
  try {
    const params = (e && e.parameter) || {};
    const secret = getProp_(WEBHOOK_SECRET_PROP);
    if (secret && params.tg === secret) {
      handleTelegramUpdate_(e);
      return ContentService.createTextOutput('ok');
    }
    return apiDispatch_(e);
  } catch (ex) {
    logErr_('doPost', ex);
    return err_(String(ex && ex.message || ex));
  }
}

function serveHtml_(params) {
  const t = HtmlService.createTemplateFromFile('index');
  t.WEBAPP_URL    = getProp_(PROP.WEBAPP_URL) || '';
  t.BOT_USERNAME  = getProp_(PROP.BOT_USERNAME) || '';
  t.INITIAL_KEY   = (params && params.key)   || '';
  t.INITIAL_TOKEN = (params && params.token) || '';
  const out = t.evaluate()
    .setTitle('OMNI-CONTROL 2026')
    .addMetaTag('viewport', 'width=device-width,initial-scale=1.0,maximum-scale=1.0,viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return out;
}

function apiDispatch_(e) {
  const body = parseBody_(e);
  const action = body.action || (e && e.parameter && e.parameter.action) || '';

  // Public actions
  if (action === 'auth_init_data')     return apiAuthInitData_(e, body);
  if (action === 'auth_consume')       return apiAuthConsume_(e, body);
  if (action === 'ping')               return ok_({ pong: true });

  // Authenticated actions — require session
  const sess = requireSession_(e);
  if (!sess.ok) return err_(sess.error, 'auth');

  switch (action) {
    case 'whoami':              return ok_({ session: sess.session });

    case 'list':                return apiList_(body);
    case 'get':                 return apiGet_(body);
    case 'create':              return apiCreate_(body, sess);
    case 'update':              return apiUpdate_(body, sess);
    case 'delete':              return apiDelete_(body, sess);

    case 'upload_poster':       return apiUploadPoster_(body, sess);

    case 'bootstrap':           return apiBootstrap_(sess);
    case 'dashboard':           return apiDashboard_(sess);

    case 'habit_toggle':        return apiHabitToggle_(body, sess);
    case 'finance_summary':     return apiFinanceSummary_(body, sess);
    case 'notifications_read':  return apiNotificationsRead_(body, sess);

    case 'logout':              return apiLogout_(sess);

    default:                    return err_('unknown_action: ' + action);
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(e.postData.contents) || {}; }
  catch (_) { return {}; }
}

function apiAuthInitData_(e, body) {
  const initData = (body && body.init_data) || '';
  const r = authByInitData_(initData, (body && body.label) || 'tg-miniapp');
  if (!r.ok) return err_(r.error, 'auth');
  return ok_({ api_key: r.api_key, tg_user_id: r.tg_user_id });
}

function apiAuthConsume_(e, body) {
  const token = (body && body.token) || '';
  if (!token) return err_('no_token', 'auth');
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  const r = consumeAuthToken_(token, owner, (body && body.label) || 'web');
  if (!r.ok) return err_(r.error, 'auth');
  return ok_({ api_key: r.api_key });
}

function apiAuthQrCreate_(e) {
  // вызывается из браузера при показе lock screen — создаёт токен и возвращает deeplink
  const token = createAuthToken_({ kind: 'qr' });
  const username = getProp_(PROP.BOT_USERNAME);
  const link = username ? ('https://t.me/' + username + '?start=auth_' + token) : '';
  return ok_({ token: token, deeplink: link, expires_in_min: QR_TOKEN_TTL_MIN });
}

function apiAuthQrCheck_(e) {
  // публичный poll-эндпоинт: вернёт api_key если токен уже потреблён ботом
  const token = (e && e.parameter && e.parameter.token) || '';
  if (!token) return err_('no_token', 'auth');
  const { obj } = findRowBy_(SHEET.AUTH, r => String(r.token) === String(token));
  if (!obj) return err_('not_found', 'auth');
  if (obj.expires_at && new Date(obj.expires_at) < new Date() && !obj.used_at) {
    return err_('expired', 'auth');
  }
  if (obj.used_at && obj.api_key) {
    return ok_({ ready: true, api_key: obj.api_key, tg_user_id: obj.tg_user_id });
  }
  return ok_({ ready: false });
}

function apiWhoAmI_(e) {
  const sess = requireSession_(e);
  if (!sess.ok) return err_(sess.error, 'auth');
  return ok_({ session: sess.session });
}

function apiLogout_(sess) {
  revokeSession_(sess.session.api_key);
  return ok_({ logged_out: true });
}

// ────────── generic CRUD ──────────

const MODULE_SHEETS = {
  categories:    SHEET.CATEGORIES,
  posts:         SHEET.POSTS,
  ads:           SHEET.ADS,
  hero:          SHEET.HERO,
  team:          SHEET.TEAM,
  inbox:         SHEET.INBOX,
  finance:       SHEET.FINANCE,
  habits:        SHEET.HABITS,
  habits_log:    SHEET.HABITS_LOG,
  notifications: SHEET.NOTIFICATIONS,
  settings_kv:   SHEET.SETTINGS,
};

function resolveSheet_(module) {
  return MODULE_SHEETS[String(module || '').toLowerCase()] || null;
}

function apiList_(body) {
  const sheetName = resolveSheet_(body && body.module);
  if (!sheetName) return err_('bad_module');
  const rows = listAll_(sheetName, (body && body.where) ? { where: body.where } : null);
  return ok_({ items: rows });
}

function apiGet_(body) {
  const sheetName = resolveSheet_(body && body.module);
  if (!sheetName) return err_('bad_module');
  const item = findById_(sheetName, body && body.id);
  if (!item) return err_('not_found', 'not_found');
  return ok_({ item: item });
}

function apiCreate_(body, sess) {
  const sheetName = resolveSheet_(body && body.module);
  if (!sheetName) return err_('bad_module');
  const hook = (typeof beforeCreate_ === 'function') ? beforeCreate_(sheetName, body.data, sess) : body.data;
  const created = appendOne_(sheetName, hook || body.data || {});
  if (typeof afterCreate_ === 'function') afterCreate_(sheetName, created, sess);
  return ok_({ item: created });
}

function apiUpdate_(body, sess) {
  const sheetName = resolveSheet_(body && body.module);
  if (!sheetName) return err_('bad_module');
  const hook = (typeof beforeUpdate_ === 'function') ? beforeUpdate_(sheetName, body.id, body.patch, sess) : body.patch;
  const updated = updateById_(sheetName, body.id, hook || body.patch || {});
  if (!updated) return err_('not_found', 'not_found');
  if (typeof afterUpdate_ === 'function') afterUpdate_(sheetName, updated, sess);
  return ok_({ item: updated });
}

function apiDelete_(body, sess) {
  const sheetName = resolveSheet_(body && body.module);
  if (!sheetName) return err_('bad_module');
  if (typeof beforeDelete_ === 'function') beforeDelete_(sheetName, body.id, sess);
  const removed = deleteById_(sheetName, body.id);
  if (typeof afterDelete_ === 'function') afterDelete_(sheetName, body.id, sess);
  return ok_({ removed: !!removed });
}

function apiBootstrap_(sess) {
  return ok_({
    categories:    listAll_(SHEET.CATEGORIES),
    posts:         listAll_(SHEET.POSTS),
    ads:           listAll_(SHEET.ADS),
    hero:          listAll_(SHEET.HERO),
    team:          listAll_(SHEET.TEAM),
    inbox:         listAll_(SHEET.INBOX),
    finance:       listAll_(SHEET.FINANCE),
    habits:        listAll_(SHEET.HABITS),
    notifications: listAll_(SHEET.NOTIFICATIONS),
    settings: {
      bot_username: getProp_(PROP.BOT_USERNAME),
      timezone: tz_(),
      channel_id: getProp_(PROP.CHANNEL_ID),
    },
    me: sess.session,
  });
}

function apiDashboard_(sess) {
  const posts = listAll_(SHEET.POSTS);
  const ads = listAll_(SHEET.ADS);
  const inbox = listAll_(SHEET.INBOX);
  return ok_({
    posts: posts.length,
    ads_active: ads.filter(a => a.status === 'active').length,
    income: ads.filter(a => a.status !== 'pending').reduce((s, a) => s + Number(a.price || 0), 0),
    inbox_unread: inbox.filter(m => m.type === 'unread').length,
  });
}

// ────────── setup endpoints (вызываются вручную из редактора Apps Script) ──────────

function setup() {
  ensureSheets_();
  if (!getProp_(WEBHOOK_SECRET_PROP)) setProp_(WEBHOOK_SECRET_PROP, shortToken_(20));
  if (!getProp_(PROP.TIMEZONE))       setProp_(PROP.TIMEZONE, TZ_DEFAULT);
  console.log('✅ Sheets initialized. Webhook secret:', getProp_(WEBHOOK_SECRET_PROP));
  console.log('Bot token set:', !!getProp_(PROP.BOT_TOKEN));
  console.log('OpenAI key set:', !!getProp_(PROP.OPENAI_KEY));
  console.log('Owner TG ID:', getProp_(PROP.OWNER_TG_ID));
  return 'OK';
}

function setupWebhook() {
  const url = getProp_(PROP.WEBAPP_URL);
  if (!url) throw new Error('Set WEBAPP_URL in Script Properties first (the /exec URL after deploy)');
  const secret = getProp_(WEBHOOK_SECRET_PROP);
  if (!secret) {
    setProp_(WEBHOOK_SECRET_PROP, shortToken_(20));
  }
  const fullUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'tg=' + getProp_(WEBHOOK_SECRET_PROP);
  const r = tgSetWebhook_(fullUrl);
  console.log('setWebhook:', JSON.stringify(r));
  return r;
}

function setupCommands() {
  return tgSetCommands_([
    { command: 'start',  description: 'Запуск / вход в панель' },
    { command: 'panel',  description: 'Открыть панель' },
    { command: 'add',    description: 'Добавить расход/привычку/задачу' },
    { command: 'today',  description: 'Сводка за день' },
    { command: 'week',   description: 'Сводка за неделю' },
    { command: 'month',  description: 'Сводка за месяц' },
    { command: 'inbox',  description: 'Новые сообщения' },
    { command: 'help',   description: 'Помощь' },
  ]);
}
