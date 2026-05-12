/**
 * Sheets.js — слой работы с Google Sheets как с БД.
 * Авто-создаёт листы по SCHEMA, конвертирует строки ↔ объекты, поддерживает CRUD.
 *
 * Спецификация:
 *  - первая строка каждого листа = заголовки колонок (имена из SCHEMA[].key).
 *  - первая колонка во всех листах кроме SETTINGS/CONV_STATE — `id` (уникальный, генерится через uid_()).
 *  - типы конвертируются по SCHEMA[].type на чтении/записи.
 */

function ss_() {
  return SpreadsheetApp.getActive();
}

function sheet_(name) {
  const s = ss_().getSheetByName(name);
  if (!s) throw new Error('Sheet not found: ' + name);
  return s;
}

function ensureSheets_() {
  return withLock_(() => {
    const book = ss_();
    Object.keys(SCHEMA).forEach((name) => {
      let sh = book.getSheetByName(name);
      const cols = SCHEMA[name];
      const headers = cols.map(c => c.key);
      if (!sh) {
        sh = book.insertSheet(name);
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.setFrozenRows(1);
        formatHeader_(sh, headers.length);
      } else {
        const cur = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1))
                     .getValues()[0].map(String);
        const same = cur.length >= headers.length &&
          headers.every((h, i) => cur[i] === h);
        if (!same) {
          sh.getRange(1, 1, 1, headers.length).setValues([headers]);
          sh.setFrozenRows(1);
          formatHeader_(sh, headers.length);
        }
      }
    });

    seedDefaults_();
    return true;
  });
}

function formatHeader_(sh, cols) {
  const range = sh.getRange(1, 1, 1, cols);
  range
    .setBackground('#1f1147')
    .setFontColor('#e8e8ff')
    .setFontWeight('bold')
    .setFontFamily('Space Mono');
  sh.setColumnWidths(1, cols, 160);
}

function seedDefaults_() {
  const catsSh = ss_().getSheetByName(SHEET.CATEGORIES);
  if (catsSh && catsSh.getLastRow() < 2) {
    const rows = DEFAULT_CATEGORIES.map(c => ({
      ...c, created_at: nowIso_(),
    }));
    appendRows_(SHEET.CATEGORIES, rows, { idGiven: true });
  }

  const teamSh = ss_().getSheetByName(SHEET.TEAM);
  if (teamSh && teamSh.getLastRow() < 2) {
    const owner = Number(getProp_(PROP.OWNER_TG_ID) || 0);
    if (owner > 0) {
      appendRows_(SHEET.TEAM, [{
        tg_user_id: owner, name: 'Owner', username: '', role: 'owner',
        status: 'active', added_at: nowIso_(),
      }]);
    }
  }
}

function cellToValue_(v, type) {
  if (v === '' || v === null || v === undefined) {
    switch (type) {
      case 'number': return null;
      case 'bool':   return false;
      case 'json':   return null;
      default:       return '';
    }
  }
  switch (type) {
    case 'number': return Number(v);
    case 'bool':   return v === true || v === 'TRUE' || v === 'true' || v === 1;
    case 'json':   return (typeof v === 'string') ? safeJsonParse_(v, null) : v;
    case 'date':
    case 'datetime':
      if (v instanceof Date) return v.toISOString();
      return String(v);
    default:       return String(v);
  }
}

function valueToCell_(v, type) {
  if (v === null || v === undefined) return '';
  switch (type) {
    case 'number': return (v === '' || isNaN(Number(v))) ? '' : Number(v);
    case 'bool':   return v ? true : false;
    case 'json':   return (typeof v === 'string') ? v : JSON.stringify(v);
    case 'date':
    case 'datetime':
      if (v instanceof Date) return v.toISOString();
      return String(v);
    default:       return String(v);
  }
}

function rowToObject_(name, row) {
  const cols = SCHEMA[name];
  const obj = {};
  for (let i = 0; i < cols.length; i++) {
    obj[cols[i].key] = cellToValue_(row[i], cols[i].type);
  }
  return obj;
}

function objectToRow_(name, obj) {
  const cols = SCHEMA[name];
  const out = [];
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    let v = (obj && col.key in obj) ? obj[col.key] : undefined;
    if (v === undefined && 'default' in col) v = col.default;
    out.push(valueToCell_(v, col.type));
  }
  return out;
}

function listAll_(name, opts) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const cols = SCHEMA[name].length;
  const values = sh.getRange(2, 1, last - 1, cols).getValues();
  const rows = values.map(r => rowToObject_(name, r));
  if (opts && opts.where) {
    return rows.filter(r => {
      for (const k of Object.keys(opts.where)) if (r[k] !== opts.where[k]) return false;
      return true;
    });
  }
  return rows;
}

function findById_(name, id) {
  if (id === null || id === undefined) return null;
  const target = Number(id);
  const rows = listAll_(name);
  return rows.find(r => Number(r.id) === target) || null;
}

function findRowIndex_(name, id) {
  // Возвращает 1-based row number в листе, или -1.
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === Number(id)) return i + 2;
  }
  return -1;
}

function appendRows_(name, objs, opts) {
  if (!Array.isArray(objs) || objs.length === 0) return [];
  return withLock_(() => {
    const sh = sheet_(name);
    const cols = SCHEMA[name];
    const idCol = cols[0].key === 'id';
    const out = [];
    const rows = objs.map(obj => {
      const o = { ...obj };
      if (idCol) {
        if (!o.id) o.id = (opts && opts.idGiven && obj.id) ? obj.id : uid_();
      }
      if (!o.created_at && cols.find(c => c.key === 'created_at')) {
        o.created_at = nowIso_();
      }
      out.push(o);
      return objectToRow_(name, o);
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, cols.length).setValues(rows);
    return out;
  });
}

function appendOne_(name, obj) {
  const r = appendRows_(name, [obj]);
  return r[0];
}

function updateById_(name, id, patch) {
  return withLock_(() => {
    const sh = sheet_(name);
    const rowIdx = findRowIndex_(name, id);
    if (rowIdx < 0) return null;
    const cols = SCHEMA[name];
    const cur = sh.getRange(rowIdx, 1, 1, cols.length).getValues()[0];
    const obj = rowToObject_(name, cur);
    const next = { ...obj, ...patch, id: obj.id };
    const row = objectToRow_(name, next);
    sh.getRange(rowIdx, 1, 1, cols.length).setValues([row]);
    return next;
  });
}

function deleteById_(name, id) {
  return withLock_(() => {
    const sh = sheet_(name);
    const rowIdx = findRowIndex_(name, id);
    if (rowIdx < 0) return false;
    sh.deleteRow(rowIdx);
    return true;
  });
}

function findRowBy_(name, predicate) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return { row: -1, obj: null };
  const cols = SCHEMA[name].length;
  const values = sh.getRange(2, 1, last - 1, cols).getValues();
  for (let i = 0; i < values.length; i++) {
    const obj = rowToObject_(name, values[i]);
    if (predicate(obj)) return { row: i + 2, obj: obj };
  }
  return { row: -1, obj: null };
}

function updateBy_(name, predicate, patch) {
  return withLock_(() => {
    const { row, obj } = findRowBy_(name, predicate);
    if (row < 0) return null;
    const cols = SCHEMA[name];
    const next = { ...obj, ...patch };
    sheet_(name).getRange(row, 1, 1, cols.length).setValues([objectToRow_(name, next)]);
    return next;
  });
}

function deleteBy_(name, predicate) {
  return withLock_(() => {
    const { row } = findRowBy_(name, predicate);
    if (row < 0) return false;
    sheet_(name).deleteRow(row);
    return true;
  });
}

function deleteWhere_(name, predicate) {
  return withLock_(() => {
    const sh = sheet_(name);
    const last = sh.getLastRow();
    if (last < 2) return 0;
    const cols = SCHEMA[name].length;
    const values = sh.getRange(2, 1, last - 1, cols).getValues();
    let removed = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      const obj = rowToObject_(name, values[i]);
      if (predicate(obj)) {
        sh.deleteRow(i + 2);
        removed++;
      }
    }
    return removed;
  });
}

function getSetting_(key, fallback) {
  const rows = listAll_(SHEET.SETTINGS);
  const found = rows.find(r => r.key === key);
  return found ? found.value : (fallback === undefined ? '' : fallback);
}

function setSetting_(key, value) {
  return withLock_(() => {
    const sh = sheet_(SHEET.SETTINGS);
    const last = sh.getLastRow();
    if (last >= 2) {
      const data = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]) === String(key)) {
          sh.getRange(i + 2, 1, 1, 3)
            .setValues([[key, String(value == null ? '' : value), nowIso_()]]);
          return value;
        }
      }
    }
    sh.appendRow([key, String(value == null ? '' : value), nowIso_()]);
    return value;
  });
}
