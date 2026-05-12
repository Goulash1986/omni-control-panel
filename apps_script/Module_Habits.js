/**
 * Module_Habits.js — привычки + streak + лог отметок.
 */

function findOrCreateHabit_(name) {
  const n = String(name || '').trim();
  if (!n) throw new Error('empty_habit_name');
  const all = listAll_(SHEET.HABITS).filter(h => !h.archived);
  const exact = all.find(h => h.name.toLowerCase() === n.toLowerCase());
  if (exact) return exact;
  const fuzzy = all.find(h => n.toLowerCase().indexOf(h.name.toLowerCase()) >= 0 ||
                              h.name.toLowerCase().indexOf(n.toLowerCase()) >= 0);
  if (fuzzy) return fuzzy;
  return appendOne_(SHEET.HABITS, {
    name: n, icon: '✅', frequency: 'daily', target_per_week: 7,
    streak: 0, archived: false, sort_order: (all.length + 1),
  });
}

function habitMarkDone_(habit) {
  appendOne_(SHEET.HABITS_LOG, {
    habit_id: habit.id,
    done_at: nowIso_(),
    note: '',
  });
  const newStreak = computeHabitStreak_(habit.id);
  return updateById_(SHEET.HABITS, habit.id, {
    last_done_at: nowIso_(),
    streak: newStreak,
  });
}

function computeHabitStreak_(habitId) {
  const log = listAll_(SHEET.HABITS_LOG, { where: { habit_id: Number(habitId) } });
  if (!log.length) return 0;
  const byDate = {};
  log.forEach(l => {
    const d = Utilities.formatDate(new Date(l.done_at), tz_(), 'yyyy-MM-dd');
    byDate[d] = true;
  });
  let streak = 0;
  let cursor = new Date();
  for (;;) {
    const key = Utilities.formatDate(cursor, tz_(), 'yyyy-MM-dd');
    if (byDate[key]) { streak++; cursor.setDate(cursor.getDate() - 1); continue; }
    if (streak === 0 && key === todayKey_()) {
      // допускаем, что сегодняшний день ещё не отмечен — стрик идёт со вчера
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

function habitsSummary_(period) {
  const range = periodRange_(period || 'week');
  const habits = listAll_(SHEET.HABITS).filter(h => !h.archived);
  const log = listAll_(SHEET.HABITS_LOG);
  return habits.map(h => {
    const target = period === 'day' ? 1 : (period === 'month' ? 30 : Number(h.target_per_week || 7));
    const done = log.filter(l => {
      if (Number(l.habit_id) !== Number(h.id)) return false;
      const t = new Date(l.done_at).getTime();
      return t >= range.from && t < range.to;
    }).length;
    return { id: h.id, name: h.name, icon: h.icon, target, done, streak: h.streak };
  });
}

function apiHabitToggle_(body, sess) {
  if (!body || !body.id) return err_('no_id');
  const habit = findById_(SHEET.HABITS, body.id);
  if (!habit) return err_('not_found', 'not_found');
  const dateKey = body.date || todayKey_();
  // если уже есть отметка за этот день — снимаем (последнюю), иначе ставим
  const all = listAll_(SHEET.HABITS_LOG).filter(l => Number(l.habit_id) === Number(habit.id));
  const same = all.find(l => Utilities.formatDate(new Date(l.done_at), tz_(), 'yyyy-MM-dd') === dateKey);
  if (same) {
    deleteById_(SHEET.HABITS_LOG, same.id);
  } else {
    appendOne_(SHEET.HABITS_LOG, {
      habit_id: habit.id,
      done_at: new Date(dateKey + 'T12:00:00').toISOString(),
      note: '',
    });
  }
  const newStreak = computeHabitStreak_(habit.id);
  const updated = updateById_(SHEET.HABITS, habit.id, {
    last_done_at: same ? habit.last_done_at : nowIso_(),
    streak: newStreak,
  });
  const logs = listAll_(SHEET.HABITS_LOG)
    .filter(l => Number(l.habit_id) === Number(habit.id))
    .map(l => l.done_at);
  updated._log = logs;
  return ok_({ habit: updated, toggled: same ? 'off' : 'on' });
}
