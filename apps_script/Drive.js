/**
 * Drive.js — хранение постеров (и других файлов) в Google Drive.
 * Файлы кладутся в специальную папку (ID в Script Properties POSTER_FOLDER_ID),
 * получают публичный read-only ACL, в Sheets DriveFiles сохраняется ссылка вида uc?id=…
 *
 * Зачем uc-ссылка: img src= с такой ссылкой работает напрямую в HTML без OAuth.
 */

function ensurePosterFolder_() {
  let id = getProp_(PROP.POSTER_FOLDER_ID);
  if (id) {
    try { DriveApp.getFolderById(id); return id; }
    catch (_) { /* пересоздадим */ }
  }
  const folder = DriveApp.createFolder('OMNI-CONTROL Posters');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  setProp_(PROP.POSTER_FOLDER_ID, folder.getId());
  return folder.getId();
}

function publicViewUrl_(fileId) {
  // Прямая отрисовка картинки: lh3.googleusercontent.com или drive.google.com/uc
  // uc-вариант стабильно работает как <img src>
  return 'https://drive.google.com/uc?id=' + fileId + '&export=view';
}

function savePosterFromBlob_(blob, opts) {
  const folderId = ensurePosterFolder_();
  const folder = DriveApp.getFolderById(folderId);
  const name = (opts && opts.name) || ('poster_' + Date.now());
  const file = folder.createFile(blob.setName(name));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { logErr_('drive_acl', e); }
  const url = publicViewUrl_(file.getId());
  appendOne_(SHEET.DRIVE_FILES, {
    file_id: file.getId(),
    mime: blob.getContentType(),
    kind: (opts && opts.kind) || 'misc',
    ref_id: (opts && opts.ref_id) || 0,
    url: url,
    owner_tg: (opts && opts.owner_tg) || 0,
    created_at: nowIso_(),
  });
  return { id: file.getId(), url: url, name: file.getName() };
}

function savePosterFromBase64_(base64, mime, opts) {
  if (!base64) throw new Error('no_base64');
  // dataURL-префикс срезаем
  const m = String(base64).match(/^data:([^;]+);base64,(.*)$/);
  let data = base64, m1 = mime;
  if (m) { m1 = m[1]; data = m[2]; }
  const bytes = Utilities.base64Decode(data);
  const blob = Utilities.newBlob(bytes, m1 || 'image/png', (opts && opts.name) || 'poster.png');
  return savePosterFromBlob_(blob, opts);
}

function savePosterFromTelegram_(fileId, opts) {
  const dl = tgDownloadFile_(fileId);
  return savePosterFromBlob_(dl.blob, opts);
}

function apiUploadPoster_(body, sess) {
  // body: { data: 'data:image/png;base64,...', name?, kind?, ref_id? }
  if (!body || !body.data) return err_('no_data');
  try {
    const saved = savePosterFromBase64_(body.data, body.mime || 'image/png', {
      name:   body.name || ('poster_' + Date.now() + '.png'),
      kind:   body.kind || 'misc',
      ref_id: Number(body.ref_id || 0),
      owner_tg: sess.session.tg_user_id,
    });
    return ok_({ url: saved.url, file_id: saved.id, name: saved.name });
  } catch (e) {
    logErr_('upload_poster', e);
    return err_(String(e && e.message || e));
  }
}
