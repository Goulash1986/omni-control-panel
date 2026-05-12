# OMNI-CONTROL · Пошаговый запуск

Бесплатно, всё внутри Google + Telegram + OpenAI. Без VPS.

## 0. Что у тебя должно быть

- Google-аккаунт (обычный gmail подойдёт)
- Telegram-аккаунт
- OpenAI API-ключ (опционально — без него работают все CRUD-функции, но не голос/AI-парсинг)

## 1. Создаём Telegram-бота

1. Открой в Telegram `@BotFather` → `/newbot`
2. Имя: например `Omni Control 2026`
3. Username: должен заканчиваться на `bot` (например `omni_control_bot`)
4. BotFather пришлёт **HTTP API token** — сохрани, понадобится в шаге 4

В том же чате с BotFather:
- `/setprivacy` → выбери бота → **Disable** (чтобы бот видел все твои сообщения, не только команды)
- `/setjoingroups` → **Disable** (бот только для личного чата)
- `/setdescription` → опиши, как угодно
- `/setcommands` → команды (бот сам их установит при первом запуске, можно пропустить)

## 2. Создаём Google Sheets и Apps Script

1. Создай новый Google Sheet: https://sheets.new
   - Назови как угодно, например `OMNI Control DB`
   - Закладку оставь, скрипт сам пересоздаст листы
2. В этом Sheets → меню **Extensions → Apps Script**
3. Откроется редактор Apps Script. Назови проект `OMNI Control Backend`.

## 3. Заливаем код

### Вариант А — через clasp (рекомендуется, удобнее править)

```bash
npm i -g @google/clasp
clasp login

cd apps_script
cp .clasp.json.example .clasp.json
# Открой .clasp.json и вставь scriptId из URL Apps Script
# URL вида https://script.google.com/.../projects/<SCRIPT_ID>/edit
clasp push
```

После `clasp push` все файлы (`Code.js`, `Bot.js`, `Sheets.js`, ..., `index.html`, `appsscript.json`)
окажутся в твоём Apps Script проекте.

### Вариант Б — копи-паст (если clasp лень ставить)

В Apps Script-редакторе для каждого файла из `apps_script/*.js`:
1. ➕ → Script → имя файла без `.js` (например `Code`)
2. Скопируй содержимое и вставь, сохрани (Ctrl+S)

Для `index.html`:
1. ➕ → HTML → имя `index`
2. Скопируй содержимое `apps_script/index.html`

Для `appsscript.json`:
1. ⚙ Project Settings → включи галочку **Show "appsscript.json" manifest file in editor**
2. Открой `appsscript.json` в редакторе и замени содержимым из `apps_script/appsscript.json`

## 4. Прописываем секреты в Script Properties

В Apps Script-редакторе:
1. ⚙ Project Settings → **Script Properties** → **Edit script properties**
2. Добавь по одному:

| Ключ | Значение | Обязательно? |
|---|---|---|
| `BOT_TOKEN` | токен от BotFather (`1234:ABC...`) | да |
| `BOT_USERNAME` | username бота без @ (`omni_control_bot`) | да |
| `OPENAI_KEY` | ключ OpenAI (`sk-...`) | нет, но без него нет голоса/AI |
| `TIMEZONE` | например `Europe/Kyiv` | нет, по умолчанию Europe/Kyiv |
| `CHANNEL_ID` | ID Telegram-канала, куда публиковать (`-100...`) | нет |

3. Save

## 5. Первая инициализация листов

В редакторе Apps Script:
1. Сверху выбери функцию **`setup`** в выпадающем списке
2. ▶ Run
3. Первый запуск попросит подтвердить доступ к Sheets, Drive, внешним сервисам — **Allow**
4. В логах (Просмотр → Logs) увидишь:
   ```
   ✅ Sheets initialized. Webhook secret: ABCDEFGH1234
   Bot token set: true
   ...
   ```

Открой свой Google Sheet — увидишь 15 листов: `Posts`, `Ads`, `Hero`, `Team`, `Inbox`,
`Finance`, `Habits`, `HabitsLog`, `Categories`, `Notifications`, `Settings`, `Auth`,
`Sessions`, `DriveFiles`, `ConvState`. В `Categories` уже добавлены 6 стартовых категорий.

## 6. Деплой Web App

1. В редакторе Apps Script: справа сверху **Deploy** → **New deployment**
2. ⚙ → **Web app**
3. Description: `OMNI Control v1`
4. **Execute as:** Me (твой аккаунт)
5. **Who has access:** **Anyone** (это нужно для webhook'а Telegram и для Mini App)
6. **Deploy**
7. Подтверди доступ ещё раз
8. Скопируй полученный **Web app URL** — выглядит как `https://script.google.com/macros/s/AKfycb.../exec`

Вернись в Script Properties и добавь:

| Ключ | Значение |
|---|---|
| `WEBAPP_URL` | вставь скопированный `/exec` URL |

## 7. Привязываем webhook бота

В редакторе Apps Script:
1. Выбери функцию **`setupWebhook`** в выпадающем списке
2. ▶ Run
3. В логах должен появиться `setWebhook: {"description":"Webhook was set"}`

Теперь бот шлёт все сообщения на твой Apps Script.

Затем — **`setupCommands`** (чтобы в Telegram при наборе `/` появились подсказки).

## 8. Триггеры (расписания)

Выбери и запусти функцию **`installTriggers`**.

Получишь:
- 9:00 — утренний пинг со списком привычек
- 21:00 — итог дня (доход/расход/привычки)
- Понедельник 10:00 — итог недели
- Каждый час — чистка устаревших auth-токенов и проверка `del_after` у рекламы

Можно поправить расписания в `Triggers.js` под себя.

## 9. Первый вход

1. В Telegram открой своего бота, нажми **/start**
2. Ты первый — бот сделает тебя **owner**. В чате появится сообщение
   `👑 Ты установлен как владелец панели. OWNER_TG_ID = <твой_id>`
3. Бот пришлёт кнопку **🎛 Открыть панель** → тапни — откроется Mini App с твоим премиум-UI
4. Также можно открыть из браузера: твой `WEBAPP_URL` → увидишь lock-screen с QR-кодом →
   отсканируй → попадёшь в бота → жми `/start` → бот пришлёт ключ → панель в браузере откроется

## 10. Настройка Mini App (опционально, для красоты)

В Telegram у `@BotFather`:
- `/newapp` → выбери своего бота → создай Web App
- URL Web App: вставь свой `WEBAPP_URL`
- Загрузи иконку 640×360 (можно скриншот панели)
- Готово — теперь в чате с ботом будет постоянная кнопка-меню

## 11. Что дальше

- **Кидай боту**: `+500 кофе` (расход), `+5000 зарплата` (доход), `/done спорт`, голосовые
- **Команды**: `/today`, `/week`, `/month`, `/inbox`, `/add`, `/ask Куда уходят деньги?`
- **Панель**: открывай Mini App кнопкой в боте или прямой ссылкой в браузере
- **Sheets**: можешь в любой момент открыть Google Sheets и подправить данные руками — бот и панель тут же увидят изменения

## Если что-то не работает

| Проблема | Что проверить |
|---|---|
| Бот молчит | Запустил ли `setupWebhook` после деплоя? URL в Script Properties WEBAPP_URL правильный? |
| Бот «Доступ запрещён» | Это не твой Telegram ID. Удали PROP `OWNER_TG_ID` и /start ещё раз |
| Mini App пустая | Frontend не получил ключ. Проверь логи Apps Script (View → Executions) |
| Голос не работает | Не задан `OPENAI_KEY` в Script Properties |
| Картинка постера 404 | Проверь, что папка Drive имеет ANYONE_WITH_LINK — Apps Script ставит её, но иногда Google ругается. Открой `POSTER_FOLDER_ID` → Share → Anyone with link → Viewer |

## Перевыкладка после правок

После любых изменений в коде:

```bash
clasp push    # обновляет код в Apps Script
```

И в редакторе Apps Script: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
URL остаётся прежним.
