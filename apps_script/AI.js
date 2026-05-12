/**
 * AI.js — OpenAI: Whisper (голос→текст), GPT (NLP + аналитика).
 * Ключ хранится в Script Properties (OPENAI_KEY). Если ключа нет — AI-фичи graceful-fallback'ятся.
 */

const OPENAI_BASE = 'https://api.openai.com/v1';
const WHISPER_MODEL = 'whisper-1';
const GPT_MODEL_FAST = 'gpt-4o-mini';
const GPT_MODEL_SMART = 'gpt-4o';

function aiAvailable_() {
  return !!getProp_(PROP.OPENAI_KEY);
}

function whisperTranscribe_(blob, hintLang) {
  const key = getProp_(PROP.OPENAI_KEY);
  if (!key) return { ok: false, error: 'no_openai_key' };

  const boundary = '----OmniBoundary' + Utilities.getUuid().replace(/-/g, '');
  const parts = [];

  function part(name, value) {
    parts.push(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="' + name + '"\r\n\r\n' +
      value + '\r\n'
    );
  }
  part('model', WHISPER_MODEL);
  if (hintLang) part('language', hintLang);
  part('response_format', 'json');

  // file part
  const fileHeader =
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="' + (blob.getName() || 'voice.ogg') + '"\r\n' +
    'Content-Type: ' + (blob.getContentType() || 'audio/ogg') + '\r\n\r\n';

  const headerBytes = Utilities.newBlob(parts.join('') + fileHeader).getBytes();
  const fileBytes = blob.getBytes();
  const tail = Utilities.newBlob('\r\n--' + boundary + '--\r\n').getBytes();
  const payload = headerBytes.concat(fileBytes).concat(tail);

  const res = UrlFetchApp.fetch(OPENAI_BASE + '/audio/transcriptions', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + key },
    contentType: 'multipart/form-data; boundary=' + boundary,
    payload: payload,
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code < 200 || code >= 300) {
    logErr_('whisper', code + ' ' + body);
    return { ok: false, error: 'whisper_failed', detail: body };
  }
  const parsed = safeJsonParse_(body, {});
  return { ok: true, text: String(parsed.text || '').trim() };
}

function gptChat_(messages, opts) {
  const key = getProp_(PROP.OPENAI_KEY);
  if (!key) return { ok: false, error: 'no_openai_key' };
  const payload = {
    model: (opts && opts.model) || GPT_MODEL_FAST,
    messages: messages,
    temperature: (opts && opts.temperature != null) ? opts.temperature : 0.2,
  };
  if (opts && opts.response_format) payload.response_format = opts.response_format;
  if (opts && opts.max_tokens)      payload.max_tokens = opts.max_tokens;

  const res = UrlFetchApp.fetch(OPENAI_BASE + '/chat/completions', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + key },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code < 200 || code >= 300) {
    logErr_('gpt', code + ' ' + body);
    return { ok: false, error: 'gpt_failed', detail: body };
  }
  const parsed = safeJsonParse_(body, {});
  const text = parsed && parsed.choices && parsed.choices[0] &&
               parsed.choices[0].message && parsed.choices[0].message.content;
  return { ok: true, text: String(text || '').trim(), raw: parsed };
}

/**
 * Парсит свободный текст пользователя в структурированное действие.
 * Возвращает JSON вида:
 *   { intent: 'finance_expense'|'finance_income'|'habit_done'|'idea'|'task'|'inbox_post'|'unknown',
 *     ...поля интента }
 *
 * Если OpenAI ключа нет — работает на регулярках для базовых случаев (+500 кофе и т.п.).
 */
function nlpParse_(text, context) {
  if (!text) return { intent: 'unknown' };

  // Сначала быстрые regex для очевидных паттернов — экономим токены OpenAI.
  const re = regexParse_(text);
  if (re) return re;

  if (!aiAvailable_()) return { intent: 'unknown', text: text };

  const sys =
    'Ты — парсер сообщений личного ассистента. На входе короткое сообщение по-русски/украински/английски. ' +
    'Определи intent и извлеки поля. Верни СТРОГО JSON без объяснений.\n\n' +
    'Возможные intent:\n' +
    '- finance_expense: { amount:number, currency?:"UAH"|"USD"|"EUR"|"RUB", category?:string, note?:string }\n' +
    '- finance_income: { amount:number, currency?:string, category?:string, note?:string }\n' +
    '- habit_done: { name:string } — отметка привычки\n' +
    '- task_add: { title:string, due_date?:"YYYY-MM-DD" } — задача в планер\n' +
    '- idea: { text:string, tags?:string[] }\n' +
    '- inbox_post: { title:string, text:string, category?:string }\n' +
    '- summary_request: { period:"day"|"week"|"month" }\n' +
    '- unknown: {}';

  const ctx = context ? '\nКонтекст пользователя: ' + JSON.stringify(context) : '';
  const r = gptChat_([
    { role: 'system', content: sys + ctx },
    { role: 'user',   content: text },
  ], { model: GPT_MODEL_FAST, response_format: { type: 'json_object' }, temperature: 0 });

  if (!r.ok) return { intent: 'unknown', text: text };
  const parsed = safeJsonParse_(r.text, null);
  if (!parsed || !parsed.intent) return { intent: 'unknown', text: text };
  return parsed;
}

function regexParse_(text) {
  const t = String(text || '').trim();

  // "+500 кофе", "-500 кофе", "500 кофе"
  const m = t.match(/^([+\-]?)\s*(\d+(?:[.,]\d+)?)\s*([₴$€₽]|UAH|USD|EUR|RUB|грн|грн\.|uah|usd|eur)?\s*(.*)$/i);
  if (m) {
    const sign = m[1];
    const amount = parseFloat(m[2].replace(',', '.'));
    const cur = normalizeCurrency_(m[3]);
    const note = (m[4] || '').trim();
    if (sign === '+') return { intent: 'finance_income', amount, currency: cur, note, category: note };
    return { intent: 'finance_expense', amount, currency: cur, note, category: note };
  }

  const todayMatch = t.match(/^\/?(today|сегодня|день)$/i);
  if (todayMatch) return { intent: 'summary_request', period: 'day' };

  const weekMatch = t.match(/^\/?(week|неделя)$/i);
  if (weekMatch) return { intent: 'summary_request', period: 'week' };

  const monthMatch = t.match(/^\/?(month|месяц)$/i);
  if (monthMatch) return { intent: 'summary_request', period: 'month' };

  return null;
}

function normalizeCurrency_(s) {
  if (!s) return 'UAH';
  const x = String(s).toLowerCase().trim();
  if (x === '₴' || x === 'uah' || x === 'грн' || x === 'грн.') return 'UAH';
  if (x === '$' || x === 'usd') return 'USD';
  if (x === '€' || x === 'eur') return 'EUR';
  if (x === '₽' || x === 'rub') return 'RUB';
  return 'UAH';
}

/**
 * Аналитика «свободным языком» — для команды /ask бота или кнопки в панели.
 * data — собранные сводки (счёт по категориям и т.п.). model — GPT_MODEL_SMART для глубокого анализа.
 */
function aiAnalyze_(question, data) {
  if (!aiAvailable_()) return { ok: false, error: 'no_openai_key' };
  const sys =
    'Ты — личный аналитик данных пользователя. Отвечай по-русски, кратко (3-6 предложений), ' +
    'обращай внимание на тренды и аномалии. Если данных мало — честно скажи.';
  return gptChat_([
    { role: 'system', content: sys },
    { role: 'user', content: 'Данные:\n' + JSON.stringify(data) + '\n\nВопрос: ' + question },
  ], { model: GPT_MODEL_FAST, temperature: 0.4 });
}
