/**
 * Module_Notifications.js — нотификации (для значка-колокольчика в панели и сообщений в бот).
 */

function pushNotification_(notif) {
  return appendOne_(SHEET.NOTIFICATIONS, {
    icon: notif.icon || '🔔',
    text: notif.text || '',
    detail: notif.detail || '',
    channel: notif.channel || 'panel',
    read: false,
  });
}

function apiNotificationsRead_(body, sess) {
  if (body && body.id) {
    const updated = updateById_(SHEET.NOTIFICATIONS, body.id, { read: true });
    return ok_({ item: updated });
  }
  // mark all read
  const all = listAll_(SHEET.NOTIFICATIONS).filter(n => !n.read);
  all.forEach(n => updateById_(SHEET.NOTIFICATIONS, n.id, { read: true }));
  return ok_({ marked: all.length });
}
