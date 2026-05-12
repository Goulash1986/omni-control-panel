/**
 * Triggers.js — расписания (Apps Script time-driven triggers).
 * Запускаются вручную через installTriggers() из редактора.
 */

function installTriggers() {
  uninstallTriggers();
  ScriptApp.newTrigger('triggerMorning_').timeBased().atHour(9).everyDays(1).create();
  ScriptApp.newTrigger('triggerEvening_').timeBased().atHour(21).everyDays(1).create();
  ScriptApp.newTrigger('triggerWeekly_').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(10).create();
  ScriptApp.newTrigger('triggerHourly_').timeBased().everyHours(1).create();
  console.log('Triggers installed.');
}

function uninstallTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}

function triggerMorning_() {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (!owner) return;
  const habits = listAll_(SHEET.HABITS).filter(h => !h.archived);
  const habitLine = habits.length
    ? habits.map(h => '  ' + (h.icon || '·') + ' ' + h.name).join('\n')
    : '  (нет привычек)';
  const text =
    '☀️ <b>Доброе утро!</b>\n\n' +
    '📅 ' + Utilities.formatDate(new Date(), tz_(), 'EEEE, d MMMM') + '\n\n' +
    '✅ <b>Привычки сегодня:</b>\n' + habitLine + '\n\n' +
    '<i>Отметка: пиши «/done название».</i>';
  try { tgSend_(owner, text); } catch (e) { logErr_('morning', e); }
}

function triggerEvening_() {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (!owner) return;
  const s = financeSummary_('day');
  const habits = habitsSummary_('day');
  const text =
    '🌙 <b>Итог дня</b>\n\n' +
    '💰 Доход: ' + s.income.toLocaleString('ru') + ' ' + s.currency + '\n' +
    '💸 Расход: ' + s.expense.toLocaleString('ru') + ' ' + s.currency + '\n' +
    (s.topCategories.length ? '📌 ' + s.topCategories.slice(0, 3).map(c => c.category + ' ' + c.amount).join(' · ') + '\n' : '') +
    '\n✅ Привычки: ' + habits.filter(h => h.done > 0).length + '/' + habits.length;
  try { tgSend_(owner, text); } catch (e) { logErr_('evening', e); }
}

function triggerWeekly_() {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (!owner) return;
  const fin = financeSummary_('week');
  const habits = habitsSummary_('week');
  const text =
    '📊 <b>Итог недели</b>\n\n' +
    '💰 Доход: ' + fin.income.toLocaleString('ru') + ' ' + fin.currency + '\n' +
    '💸 Расход: ' + fin.expense.toLocaleString('ru') + ' ' + fin.currency + '\n' +
    '📈 Реклама принесла: ' + fin.ads_income.toLocaleString('ru') + ' ' + fin.currency + '\n\n' +
    '✅ <b>Привычки:</b>\n' +
    (habits.length
      ? habits.map(h => '  ' + (h.icon || '·') + ' ' + h.name + ': ' + h.done + '/' + h.target).join('\n')
      : '  (нет привычек)');
  try { tgSend_(owner, text); } catch (e) { logErr_('weekly', e); }
}

function triggerHourly_() {
  // Здесь можно собирать всё, что нуждается в проверке раз в час:
  //  - реклама с del_after — пора удалять?
  //  - запланированные посты на ближайший слот?
  //  - истёкшие auth-токены — почистить?
  cleanupExpiredAuth_();
  checkAdDeletions_();
}

function cleanupExpiredAuth_() {
  const now = Date.now();
  deleteWhere_(SHEET.AUTH, r => {
    if (r.used_at) return false;
    if (!r.expires_at) return false;
    return new Date(r.expires_at).getTime() < now;
  });
}

function checkAdDeletions_() {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (!owner) return;
  const ads = listAll_(SHEET.ADS).filter(a => a.status === 'active' && Number(a.del_after || 0) > 0);
  const now = Date.now();
  ads.forEach(a => {
    const pubAt = new Date(a.pub_at || a.created_at).getTime();
    const deleteAt = pubAt + Number(a.del_after) * 3600 * 1000;
    if (deleteAt < now) {
      updateById_(SHEET.ADS, a.id, { status: 'done' });
      try { tgSend_(owner, '🗑 Реклама <b>' + escHtml_(a.client) + '</b> отработала свой срок (del_after).'); } catch (_) {}
    } else if (deleteAt - now < 3600 * 1000) {
      // меньше часа до удаления
      try { tgSend_(owner, '⏰ Скоро снимаем рекламу: <b>' + escHtml_(a.client) + '</b>'); } catch (_) {}
    }
  });
}
