/**
 * TG.js — обёртки над Telegram Bot API через UrlFetchApp.
 */

function tgUrl_(method) {
  const token = getProp_(PROP.BOT_TOKEN);
  if (!token) throw new Error('BOT_TOKEN not set in Script Properties');
  return 'https://api.telegram.org/bot' + token + '/' + method;
}

function tgFileUrl_(filePath) {
  const token = getProp_(PROP.BOT_TOKEN);
  return 'https://api.telegram.org/file/bot' + token + '/' + filePath;
}

function tgCall_(method, payload, opts) {
  const url = tgUrl_(method);
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true,
    followRedirects: true,
  });
  const code = res.getResponseCode();
  const body = res.getContentText();
  let parsed = null;
  try { parsed = JSON.parse(body); } catch (_) {}
  if (code >= 200 && code < 300 && parsed && parsed.ok) return parsed.result;
  if (opts && opts.softFail) return { _err: parsed || body, _code: code };
  throw new Error('TG ' + method + ' ' + code + ': ' + body);
}

function tgSend_(chatId, text, extra) {
  return tgCall_('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: (extra && extra.parse_mode) || 'HTML',
    disable_web_page_preview: true,
    reply_markup: extra && extra.reply_markup,
  }, { softFail: true });
}

function tgAnswer_(callbackId, text) {
  return tgCall_('answerCallbackQuery', {
    callback_query_id: callbackId,
    text: text || '',
    show_alert: false,
  }, { softFail: true });
}

function tgEdit_(chatId, messageId, text, extra) {
  return tgCall_('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: (extra && extra.parse_mode) || 'HTML',
    reply_markup: extra && extra.reply_markup,
    disable_web_page_preview: true,
  }, { softFail: true });
}

function tgSendPhoto_(chatId, photoUrl, caption, extra) {
  return tgCall_('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption || '',
    parse_mode: (extra && extra.parse_mode) || 'HTML',
    reply_markup: extra && extra.reply_markup,
  }, { softFail: true });
}

function tgGetFile_(fileId) {
  return tgCall_('getFile', { file_id: fileId });
}

function tgDownloadFile_(fileId) {
  const info = tgGetFile_(fileId);
  if (!info || !info.file_path) throw new Error('getFile failed');
  const res = UrlFetchApp.fetch(tgFileUrl_(info.file_path), {
    muteHttpExceptions: true,
  });
  return { blob: res.getBlob(), info: info };
}

function tgSetCommands_(commands) {
  return tgCall_('setMyCommands', { commands: commands }, { softFail: true });
}

function tgSetWebhook_(url) {
  return tgCall_('setWebhook', {
    url: url,
    allowed_updates: ['message', 'callback_query', 'edited_message'],
    drop_pending_updates: true,
  });
}

function miniAppKeyboard_(key) {
  const webappUrl = getProp_(PROP.WEBAPP_URL);
  if (!webappUrl) return null;
  const url = key ? (webappUrl + (webappUrl.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(key))
                  : webappUrl;
  return {
    inline_keyboard: [[{ text: '🎛 Открыть панель', web_app: { url: url } }]],
  };
}
