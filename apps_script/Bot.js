/**
 * Bot.js — обработка апдейтов Telegram-бота, вызывается из doPost при правильном ?tg=<secret>.
 *
 * Поддерживает:
 *  - команды: /start, /panel, /help, /today, /week, /month, /add, /inbox, /done, /id
 *  - свободный текст → nlpParse_() → действие в Sheets
 *  - голосовые → Whisper → как свободный текст
 *  - фото → если есть conv-state с ожиданием постера, сохраняем в Drive и привязываем к сущности
 *  - inline-кнопки callback_query → выполнение действий из меню
 *
 * Первый пользователь, который /start, и у которого ещё не задан PROP.OWNER_TG_ID,
 * становится владельцем (одноразовый bootstrap).
 */

function handleTelegramUpdate_(e) {
  const update = parseBody_(e);
  if (!update || (!update.message && !update.callback_query && !update.edited_message)) {
    return;
  }
  try {
    if (update.callback_query) return handleCallback_(update.callback_query);
    const msg = update.message || update.edited_message;
    if (!msg) return;
    return handleMessage_(msg);
  } catch (ex) {
    logErr_('handleTelegramUpdate', ex);
    try {
      const chatId = (update.message && update.message.chat && update.message.chat.id) ||
                     (update.callback_query && update.callback_query.from && update.callback_query.from.id);
      if (chatId) tgSend_(chatId, '⚠️ Ошибка: ' + String(ex && ex.message || ex));
    } catch (_) {}
  }
}

// ─────────────── message ───────────────

function handleMessage_(msg) {
  const from = msg.from || {};
  const tgId = from.id;
  if (!tgId) return;

  bootstrapOwnerIfNeeded_(from);

  const isAllowed = isAllowedUser_(tgId);
  if (!isAllowed) {
    tgSend_(tgId, '⛔ Доступ запрещён. Свяжись с владельцем панели.');
    return;
  }

  upsertTeam_(from);

  // 1) команды и /start с payload
  if (msg.text && msg.text.startsWith('/')) {
    return runCommand_(msg);
  }

  // 2) голосовое — расшифровываем и роутим как текст
  if (msg.voice || msg.audio) {
    return handleVoice_(msg);
  }

  // 3) фото — может быть постер для текущего conv-state
  if (msg.photo && msg.photo.length) {
    return handlePhoto_(msg);
  }

  // 4) свободный текст
  if (msg.text) {
    return handleFreeText_(msg, msg.text);
  }
}

function runCommand_(msg) {
  const text = String(msg.text || '');
  const parts = text.split(/\s+/);
  const cmd = parts[0].replace(/@.+$/, '').toLowerCase(); // /start@bot → /start
  const rest = text.replace(/^\S+\s*/, '');

  switch (cmd) {
    case '/start':    return cmdStart_(msg, parts[1] || '');
    case '/panel':    return cmdPanel_(msg);
    case '/help':     return cmdHelp_(msg);
    case '/id':       return cmdId_(msg);
    case '/today':    return cmdSummary_(msg, 'day');
    case '/week':     return cmdSummary_(msg, 'week');
    case '/month':    return cmdSummary_(msg, 'month');
    case '/inbox':    return cmdInbox_(msg);
    case '/add':      return cmdAdd_(msg, rest);
    case '/done':     return cmdHabitDone_(msg, rest);
    case '/ask':      return cmdAsk_(msg, rest);
    case '/cancel':   return cmdCancel_(msg);
    default:          return tgSend_(msg.chat.id, 'Неизвестная команда. /help — список');
  }
}

function bootstrapOwnerIfNeeded_(from) {
  const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
  if (owner) return false;
  // первый юзер = владелец
  setProp_(PROP.OWNER_TG_ID, String(from.id));
  appendOne_(SHEET.TEAM, {
    tg_user_id: Number(from.id),
    name: from.first_name || from.username || ('id ' + from.id),
    username: from.username || '',
    role: 'owner',
    status: 'active',
    added_at: nowIso_(),
  });
  tgSend_(from.id, '👑 Ты установлен как владелец панели. OWNER_TG_ID = <code>' + from.id + '</code>');
  return true;
}

// ─────────────── commands ───────────────

function cmdStart_(msg, payload) {
  const tgId = msg.from.id;
  if (payload && /^auth_/.test(payload)) {
    const token = payload.replace(/^auth_/, '');
    const r = consumeAuthToken_(token, tgId, 'web-pin');
    if (!r.ok) {
      return tgSend_(tgId, '⚠️ Не удалось войти: <code>' + escHtml_(r.error) + '</code>');
    }
    tgSend_(tgId, '🔓 Вход в браузере подтверждён.\n\nКлюч сессии:\n<code>' + escHtml_(r.api_key) + '</code>\n\nВведи его в окне настройки на сайте — или просто открой панель внутри Telegram кнопкой ниже.', {
      reply_markup: miniAppKeyboard_(r.api_key),
    });
    return;
  }
  const name = msg.from.first_name || msg.from.username || 'друг';
  const txt =
    '👋 Привет, ' + escHtml_(name) + '!\n\n' +
    '<b>OMNI-CONTROL 2026</b> — твой личный ассистент.\n\n' +
    '📨 Кидай мне расходы (<code>+500 кофе</code>), идеи, голосовые — я сложу в Google Sheets.\n' +
    '🎛 Полный пульт открывается кнопкой ниже (Mini App).\n\n' +
    '<b>Команды:</b>\n' +
    '/today /week /month — сводка\n' +
    '/inbox — новые сообщения\n' +
    '/add — быстрое меню добавления\n' +
    '/help — подробнее';
  return tgSend_(tgId, txt, { reply_markup: miniAppKeyboard_() });
}

function cmdPanel_(msg) {
  return tgSend_(msg.from.id, '🎛 Открыть панель:', { reply_markup: miniAppKeyboard_() });
}

function cmdHelp_(msg) {
  const txt =
    '<b>Свободный ввод:</b>\n' +
    '• <code>+500 кофе</code> — расход\n' +
    '• <code>-500 кофе</code> или просто <code>500 кофе</code> — расход\n' +
    '• <code>+5000 зарплата</code> с плюсом — доход\n' +
    '• <code>/done спорт</code> — отметка привычки\n' +
    '• голосовое сообщение — расшифрую и распарсю\n\n' +
    '<b>Команды:</b>\n' +
    '/today /week /month — сводки\n' +
    '/inbox — новые сообщения\n' +
    '/add — меню добавления\n' +
    '/ask &lt;вопрос&gt; — спросить ассистента по твоим данным\n' +
    '/cancel — отменить текущий шаг\n' +
    '/id — твой Telegram ID';
  return tgSend_(msg.from.id, txt);
}

function cmdId_(msg) {
  return tgSend_(msg.from.id, '🆔 Твой Telegram ID: <code>' + msg.from.id + '</code>');
}

function cmdSummary_(msg, period) {
  const s = financeSummary_(period);
  const habits = habitsSummary_(period);
  const text =
    summaryTitle_(period) + '\n\n' +
    '💰 <b>Финансы</b>\n' +
    '  Доход:   ' + s.income.toLocaleString('ru') + ' ' + s.currency + '\n' +
    '  Расход:  ' + s.expense.toLocaleString('ru') + ' ' + s.currency + '\n' +
    '  Баланс:  ' + (s.income - s.expense).toLocaleString('ru') + ' ' + s.currency + '\n' +
    (s.topCategories.length ? '  ТОП: ' + s.topCategories.slice(0, 3).map(c => c.category + ' ' + c.amount).join(', ') + '\n' : '') +
    '\n✅ <b>Привычки</b>\n' +
    (habits.length ? habits.map(h => '  ' + (h.icon || '·') + ' ' + h.name + ': ' + h.done + '/' + h.target).join('\n') : '  нет');
  return tgSend_(msg.from.id, text);
}

function summaryTitle_(period) {
  switch (period) {
    case 'day':   return '📊 Сегодня';
    case 'week':  return '📊 За неделю';
    case 'month': return '📊 За месяц';
    default:      return '📊 Сводка';
  }
}

function cmdInbox_(msg) {
  const unread = listAll_(SHEET.INBOX).filter(m => m.type === 'unread');
  if (!unread.length) return tgSend_(msg.from.id, '📭 Нет новых сообщений');
  const top = unread.slice(0, 8).map(m =>
    '• <b>' + escHtml_(m.from_name || '—') + '</b> [' + escHtml_(m.source || '—') + ']\n  ' + escHtml_((m.message || '').slice(0, 120))
  ).join('\n\n');
  return tgSend_(msg.from.id, '📨 <b>Новые сообщения (' + unread.length + ')</b>\n\n' + top);
}

function cmdAdd_(msg, rest) {
  if (rest && rest.trim()) {
    return handleFreeText_(msg, rest.trim());
  }
  const kb = {
    inline_keyboard: [
      [{ text: '💸 Расход',  callback_data: 'add:expense' },
       { text: '💰 Доход',   callback_data: 'add:income' }],
      [{ text: '✅ Привычка',callback_data: 'add:habit' },
       { text: '💡 Идея',    callback_data: 'add:idea'  }],
      [{ text: '📝 Задача',  callback_data: 'add:task' },
       { text: '📦 Пост',    callback_data: 'add:post'  }],
    ],
  };
  return tgSend_(msg.from.id, 'Что добавляем?', { reply_markup: kb });
}

function cmdHabitDone_(msg, rest) {
  const name = (rest || '').trim();
  if (!name) return tgSend_(msg.from.id, 'Использование: <code>/done спорт</code>');
  const habit = findOrCreateHabit_(name);
  habitMarkDone_(habit);
  return tgSend_(msg.from.id, '✅ Отмечено: <b>' + escHtml_(habit.name) + '</b> · streak ' + habit.streak);
}

function cmdAsk_(msg, question) {
  if (!question || !question.trim()) return tgSend_(msg.from.id, 'Использование: <code>/ask Куда уходят деньги в этом месяце?</code>');
  if (!aiAvailable_()) return tgSend_(msg.from.id, '🔒 Нужен ключ OpenAI в Script Properties.');

  const data = {
    finance_month: financeSummary_('month'),
    habits_week: habitsSummary_('week'),
    posts_count: listAll_(SHEET.POSTS).length,
    ads_active: listAll_(SHEET.ADS).filter(a => a.status === 'active').length,
  };
  const r = aiAnalyze_(question, data);
  if (!r.ok) return tgSend_(msg.from.id, '⚠️ ' + r.error);
  return tgSend_(msg.from.id, '🤖 ' + escHtml_(r.text));
}

function cmdCancel_(msg) {
  setConvState_(msg.from.id, '', {});
  return tgSend_(msg.from.id, '❎ Отменено');
}

// ─────────────── voice / photo ───────────────

function handleVoice_(msg) {
  const voice = msg.voice || msg.audio;
  if (!voice) return;
  tgSend_(msg.chat.id, '🎙 Расшифровываю...');
  let dl;
  try { dl = tgDownloadFile_(voice.file_id); }
  catch (e) { return tgSend_(msg.chat.id, '⚠️ Не удалось скачать аудио: ' + e.message); }

  if (!aiAvailable_()) {
    return tgSend_(msg.chat.id, '🔒 Распознавание голоса требует ключ OpenAI в Script Properties.');
  }
  const r = whisperTranscribe_(dl.blob, 'ru');
  if (!r.ok) return tgSend_(msg.chat.id, '⚠️ Whisper: ' + r.error);
  if (!r.text) return tgSend_(msg.chat.id, '🤷 Ничего не разобрал');

  tgSend_(msg.chat.id, '📝 <i>' + escHtml_(r.text) + '</i>');
  return handleFreeText_(msg, r.text);
}

function handlePhoto_(msg) {
  // самое большое изображение из массива photo
  const photo = msg.photo[msg.photo.length - 1];
  const state = getConvState_(msg.from.id);

  let saved;
  try {
    saved = savePosterFromTelegram_(photo.file_id, {
      name: 'tg_' + msg.from.id + '_' + Date.now() + '.jpg',
      kind: (state && state.expecting_poster_kind) || 'misc',
      ref_id: (state && state.expecting_poster_ref) || 0,
      owner_tg: msg.from.id,
    });
  } catch (e) {
    return tgSend_(msg.chat.id, '⚠️ Не удалось сохранить картинку: ' + e.message);
  }

  // если конв-стейт ждал постер — привяжем
  if (state && state.expecting_poster_kind && state.expecting_poster_ref) {
    const sheetName =
      state.expecting_poster_kind === 'post' ? SHEET.POSTS :
      state.expecting_poster_kind === 'ad'   ? SHEET.ADS   :
      state.expecting_poster_kind === 'hero' ? SHEET.HERO  : null;
    if (sheetName) updateById_(sheetName, state.expecting_poster_ref, { poster_url: saved.url });
    setConvState_(msg.from.id, '', {});
    return tgSend_(msg.chat.id, '🖼 Постер сохранён и привязан.');
  }

  return tgSend_(msg.chat.id, '🖼 Сохранено: ' + saved.url);
}

// ─────────────── free-text → action ───────────────

function handleFreeText_(msg, text) {
  const parsed = nlpParse_(text);
  const tgId = msg.from.id;

  switch (parsed.intent) {
    case 'finance_expense': {
      const row = appendOne_(SHEET.FINANCE, {
        kind: 'expense',
        category: parsed.category || parsed.note || '',
        amount: Number(parsed.amount || 0),
        currency: parsed.currency || 'UAH',
        note: parsed.note || '',
        ref_kind: 'manual',
        occurred_at: nowIso_(),
      });
      return tgSend_(tgId, '💸 Расход <b>' + row.amount + ' ' + row.currency + '</b> · ' + escHtml_(row.category || '—'));
    }
    case 'finance_income': {
      const row = appendOne_(SHEET.FINANCE, {
        kind: 'income',
        category: parsed.category || parsed.note || '',
        amount: Number(parsed.amount || 0),
        currency: parsed.currency || 'UAH',
        note: parsed.note || '',
        ref_kind: 'manual',
        occurred_at: nowIso_(),
      });
      return tgSend_(tgId, '💰 Доход <b>' + row.amount + ' ' + row.currency + '</b> · ' + escHtml_(row.category || '—'));
    }
    case 'habit_done': {
      const habit = findOrCreateHabit_(parsed.name || text);
      habitMarkDone_(habit);
      return tgSend_(tgId, '✅ <b>' + escHtml_(habit.name) + '</b> · streak ' + habit.streak);
    }
    case 'task_add': {
      const row = appendOne_(SHEET.POSTS, {
        cat_id: 0,
        title: (parsed.title || text).slice(0, 60),
        text: parsed.title || text,
        scheduled_date: parsed.due_date || '',
        status: 'draft',
      });
      return tgSend_(tgId, '📝 Задача добавлена: ' + escHtml_(row.title));
    }
    case 'idea':
    case 'inbox_post': {
      const row = appendOne_(SHEET.INBOX, {
        source: 'telegram',
        from_id: String(msg.from.id),
        from_name: msg.from.first_name || msg.from.username || ('id ' + msg.from.id),
        message: parsed.text || parsed.title || text,
        type: 'unread',
        received_at: nowIso_(),
      });
      return tgSend_(tgId, '💡 Добавил в инбокс');
    }
    case 'summary_request':
      return cmdSummary_(msg, parsed.period || 'day');
    default:
      // не поняли — кидаем в инбокс как идею
      appendOne_(SHEET.INBOX, {
        source: 'telegram',
        from_id: String(msg.from.id),
        from_name: msg.from.first_name || msg.from.username || ('id ' + msg.from.id),
        message: text,
        type: 'unread',
        received_at: nowIso_(),
      });
      return tgSend_(tgId, '📨 Сохранил в инбокс — потом разберёшь в панели.');
  }
}

// ─────────────── callback queries ───────────────

function handleCallback_(cb) {
  const tgId = cb.from && cb.from.id;
  if (!tgId || !isAllowedUser_(tgId)) {
    tgAnswer_(cb.id, '⛔ Доступ запрещён');
    return;
  }
  const data = String(cb.data || '');

  if (data.startsWith('add:')) {
    const kind = data.substring(4);
    setConvState_(tgId, 'await_' + kind, {});
    const prompts = {
      expense:  '💸 Введи сумму и описание: <code>500 кофе</code>',
      income:   '💰 Введи сумму и описание дохода: <code>+5000 зарплата</code>',
      habit:    '✅ Введи название привычки или <code>/done спорт</code>',
      idea:     '💡 Пиши идею текстом или голосовым',
      task:     '📝 Введи название задачи',
      post:     '📦 Опиши новый пост — текст, потом пришли фото если хочешь',
    };
    tgEdit_(cb.message.chat.id, cb.message.message_id, prompts[kind] || 'OK');
    tgAnswer_(cb.id);
    return;
  }

  if (data.startsWith('habit_done:')) {
    const id = Number(data.split(':')[1]);
    const habit = findById_(SHEET.HABITS, id);
    if (habit) {
      habitMarkDone_(habit);
      tgAnswer_(cb.id, '✅ ' + habit.name);
    } else tgAnswer_(cb.id, 'не найдено');
    return;
  }

  tgAnswer_(cb.id);
}

// ─────────────── conv state ───────────────

function getConvState_(tgId) {
  const { obj } = findRowBy_(SHEET.CONV_STATE, r => Number(r.tg_user_id) === Number(tgId));
  return obj || null;
}

function setConvState_(tgId, state, data) {
  const existing = findRowBy_(SHEET.CONV_STATE, r => Number(r.tg_user_id) === Number(tgId));
  if (existing.row > 0) {
    updateBy_(SHEET.CONV_STATE, r => Number(r.tg_user_id) === Number(tgId), {
      state: state || '',
      data: data || {},
      updated_at: nowIso_(),
    });
  } else {
    appendOne_(SHEET.CONV_STATE, {
      tg_user_id: Number(tgId),
      state: state || '',
      data: data || {},
      updated_at: nowIso_(),
    });
  }
}
