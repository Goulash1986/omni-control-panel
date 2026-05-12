/**
 * Hooks.js — хуки до/после операций CRUD (вызываются из generic dispatcher в Code.js).
 *
 * Они опциональны: dispatcher проверяет `typeof === 'function'`. Здесь мы наклеиваем нужные
 * побочные эффекты: уведомления, авто-привязки, проверки прав.
 */

function beforeCreate_(sheetName, data, sess) {
  // нормализуем числовые поля
  return data;
}

function afterCreate_(sheetName, row, sess) {
  switch (sheetName) {
    case SHEET.POSTS:
      pushNotification_({
        icon: '📦', text: 'Карточка создана',
        detail: row.title || row.text || '—', channel: 'panel',
      });
      maybeNotifyOwner_('📦 Создана новая карточка контента: ' + (row.title || '—'));
      break;
    case SHEET.ADS:
      pushNotification_({
        icon: '💼', text: 'Реклама «' + (row.client || '—') + '»',
        detail: 'Бюджет: ' + (row.price || 0) + ' ' + (row.currency || 'UAH'),
        channel: 'panel',
      });
      break;
    case SHEET.HERO:
      pushNotification_({ icon: '🌟', text: 'Персонаж добавлен', detail: row.title || '', channel: 'panel' });
      break;
    case SHEET.INBOX:
      // только если пришло через панель (не через бот — там уведомление в чат и так)
      pushNotification_({
        icon: '📨', text: 'Новое сообщение в инбоксе',
        detail: ((row.from_name || '—') + ': ' + (row.message || '').slice(0, 60)),
        channel: 'panel',
      });
      break;
    case SHEET.FINANCE:
      // не спамим — пользователь сам это создаёт
      break;
  }
}

function beforeUpdate_(sheetName, id, patch, sess) {
  return patch;
}

function afterUpdate_(sheetName, row, sess) {
  switch (sheetName) {
    case SHEET.ADS:
      // когда статус становится active — фиксируем доход в Finance, если ещё нет
      if (row.status === 'active') {
        const existing = listAll_(SHEET.FINANCE, { where: { ref_kind: 'ad', ref_id: Number(row.id) } });
        if (!existing.length) {
          appendOne_(SHEET.FINANCE, {
            kind: 'income',
            category: 'Реклама',
            amount: Number(row.price || 0),
            currency: row.currency || 'UAH',
            note: row.client || '',
            ref_kind: 'ad',
            ref_id: Number(row.id),
            occurred_at: row.pub_at || nowIso_(),
          });
          pushNotification_({
            icon: '📢', text: 'Реклама активирована',
            detail: row.client + ' · +' + (row.price || 0) + ' ' + (row.currency || 'UAH'),
            channel: 'both',
          });
          maybeNotifyOwner_('📢 Реклама активирована: <b>' + escHtml_(row.client) + '</b> +' + row.price + ' ' + row.currency);
        }
      }
      break;
  }
}

function beforeDelete_(sheetName, id, sess) {
  // здесь можно проверять права (owner-only для team, например)
}

function afterDelete_(sheetName, id, sess) {
  if (sheetName === SHEET.ADS) {
    // удалим связанную запись в Finance (если была)
    deleteWhere_(SHEET.FINANCE, r => r.ref_kind === 'ad' && Number(r.ref_id) === Number(id));
  }
}

function maybeNotifyOwner_(htmlText) {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (!owner) return;
  try { tgSend_(owner, htmlText); } catch (e) { logErr_('notify_owner', e); }
}
