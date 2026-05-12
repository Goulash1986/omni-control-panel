/**
 * Auth.js — два способа входа:
 *   1) QR / deep-link: бот получает /start auth_<token>, помечает токен в Auth, выдаёт пользователю
 *      Mini App-ссылку вида <WEBAPP_URL>?key=<api_key>. Этот api_key сохраняется в Sessions.
 *   2) Mini App initData: фронт берёт `window.Telegram.WebApp.initData` (подписанная Telegram строка),
 *      бэк валидирует HMAC по BOT_TOKEN, проверяет, что пользователь есть в Team, выдаёт api_key.
 *
 * Любой API-запрос требует заголовок (или поле) X-Api-Key. ownerOnly() запросы — только для owner.
 */

function createAuthToken_(payload) {
  const token = shortToken_(12);
  const expires = new Date(Date.now() + QR_TOKEN_TTL_MIN * 60 * 1000).toISOString();
  appendOne_(SHEET.AUTH, {
    token: token,
    kind: (payload && payload.kind) || 'qr',
    tg_user_id: (payload && payload.tg_user_id) || 0,
    api_key: '',
    expires_at: expires,
  });
  return token;
}

function consumeAuthToken_(token, tgUserId, label) {
  return withLock_(() => {
    const { row, obj } = findRowBy_(SHEET.AUTH, r => String(r.token) === String(token));
    if (row < 0) return { ok: false, error: 'token_not_found' };
    if (obj.used_at) return { ok: false, error: 'token_used' };
    if (obj.expires_at && new Date(obj.expires_at) < new Date()) {
      return { ok: false, error: 'token_expired' };
    }

    const apiKey = apiKey_();
    sheet_(SHEET.AUTH).getRange(row, 1, 1, SCHEMA[SHEET.AUTH].length).setValues([
      objectToRow_(SHEET.AUTH, { ...obj, tg_user_id: tgUserId, api_key: apiKey, used_at: nowIso_() })
    ]);

    appendOne_(SHEET.SESSIONS, {
      api_key: apiKey, tg_user_id: tgUserId, label: label || 'web',
      last_seen: nowIso_(), revoked: false,
    });

    return { ok: true, api_key: apiKey, tg_user_id: tgUserId };
  });
}

function authByInitData_(initData, label) {
  // initData = строка query из Telegram WebApp.initData
  const parsed = parseInitData_(initData);
  if (!parsed.ok) return parsed;

  const tgUser = parsed.user;
  if (!tgUser || !tgUser.id) return { ok: false, error: 'no_user' };

  if (!isAllowedUser_(tgUser.id)) return { ok: false, error: 'forbidden' };

  const apiKey = apiKey_();
  appendOne_(SHEET.SESSIONS, {
    api_key: apiKey,
    tg_user_id: tgUser.id,
    label: label || ('tg:' + (tgUser.username || tgUser.id)),
    last_seen: nowIso_(),
    revoked: false,
  });
  upsertTeam_(tgUser);
  return { ok: true, api_key: apiKey, tg_user_id: tgUser.id };
}

function parseInitData_(initData) {
  if (!initData) return { ok: false, error: 'no_init_data' };
  const params = {};
  String(initData).split('&').forEach(kv => {
    const eq = kv.indexOf('=');
    if (eq < 0) return;
    const k = decodeURIComponent(kv.substring(0, eq));
    const v = decodeURIComponent(kv.substring(eq + 1));
    params[k] = v;
  });

  const hash = params.hash;
  if (!hash) return { ok: false, error: 'no_hash' };
  delete params.hash;

  const dataCheck = Object.keys(params)
    .sort()
    .map(k => k + '=' + params[k])
    .join('\n');

  const botToken = getProp_(PROP.BOT_TOKEN);
  if (!botToken) return { ok: false, error: 'no_bot_token' };

  // secret_key = HMAC_SHA256(bot_token, "WebAppData")
  const secret = Utilities.computeHmacSha256Signature(botToken, 'WebAppData');
  const sig = hmacSha256Bytes_(secret, dataCheck);
  const sigHex = sig.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');

  if (sigHex !== hash) return { ok: false, error: 'bad_signature' };

  const authDate = Number(params.auth_date || 0);
  if (!authDate) return { ok: false, error: 'no_auth_date' };
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > INIT_DATA_TTL_HOURS * 3600) return { ok: false, error: 'expired' };

  const user = safeJsonParse_(params.user, null);
  return { ok: true, user: user, params: params };
}

function isAllowedUser_(tgUserId) {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (owner && Number(tgUserId) === owner) return true;
  const team = listAll_(SHEET.TEAM, { where: { tg_user_id: Number(tgUserId) } });
  return team.some(t => t.status === 'active');
}

function isOwner_(tgUserId) {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  return owner && Number(tgUserId) === owner;
}

function upsertTeam_(tgUser) {
  const existing = listAll_(SHEET.TEAM, { where: { tg_user_id: Number(tgUser.id) } })[0];
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (existing) {
    updateById_(SHEET.TEAM, existing.id, {
      name: tgUser.first_name || existing.name,
      username: tgUser.username || existing.username,
    });
    return existing;
  }
  return appendOne_(SHEET.TEAM, {
    tg_user_id: Number(tgUser.id),
    name: tgUser.first_name || tgUser.username || ('id ' + tgUser.id),
    username: tgUser.username || '',
    role: (owner && Number(tgUser.id) === owner) ? 'owner' : 'member',
    status: 'active',
    added_at: nowIso_(),
  });
}

function sessionByKey_(apiKey) {
  if (!apiKey) return null;
  const sessions = listAll_(SHEET.SESSIONS, { where: { api_key: String(apiKey) } });
  const s = sessions[0];
  if (!s) return null;
  if (s.revoked) return null;
  const ttlMs = SESSION_TTL_DAYS * 24 * 3600 * 1000;
  if (s.last_seen && (Date.now() - new Date(s.last_seen).getTime()) > ttlMs) return null;
  return s;
}

function requireSession_(e) {
  const apiKey = extractApiKey_(e);
  const s = sessionByKey_(apiKey);
  if (!s) return { ok: false, error: 'unauthorized' };
  touchSession_(apiKey);
  return { ok: true, session: s };
}

function requireOwner_(e) {
  const r = requireSession_(e);
  if (!r.ok) return r;
  if (!isOwner_(r.session.tg_user_id)) return { ok: false, error: 'forbidden' };
  return r;
}

function extractApiKey_(e) {
  if (!e) return '';
  // 1) Заголовок X-Api-Key (Apps Script позволяет читать только тело — но Telegram кладёт ключ в query)
  // 2) ?key=...
  // 3) тело JSON { api_key: ... }
  const params = (e.parameter || {});
  if (params.key) return String(params.key);
  if (params.api_key) return String(params.api_key);
  try {
    const body = (e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : null;
    if (body && (body.api_key || body.key)) return String(body.api_key || body.key);
  } catch (_) {}
  return '';
}

function touchSession_(apiKey) {
  updateBy_(SHEET.SESSIONS, r => String(r.api_key) === String(apiKey),
            { last_seen: nowIso_() });
}

function revokeSession_(apiKey) {
  return updateBy_(SHEET.SESSIONS, r => String(r.api_key) === String(apiKey),
                   { revoked: true }) !== null;
}
