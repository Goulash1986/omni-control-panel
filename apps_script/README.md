# apps_script/

Папка, которую `clasp` (Google's Apps Script CLI) пушит в твой Apps Script-проект.

## Структура

| Файл | Что внутри |
|---|---|
| `appsscript.json` | Манифест: рантайм V8, OAuth scopes (Sheets, Drive, UrlFetch), таймзона |
| `.clasp.json.example` | Шаблон конфига clasp; скопируй в `.clasp.json` и вставь `scriptId` |
| `Constants.js` | Имена ключей Properties, имена листов, **схема каждого листа** |
| `Util.js` | uid, токены, HMAC, JSON-ответы, реентрантный lock |
| `Sheets.js` | Слой над SpreadsheetApp: авто-создание листов, generic CRUD |
| `Auth.js` | QR-deeplink + Mini App initData HMAC, сессии и проверка X-Api-Key |
| `TG.js` | Обёртки над Telegram Bot API (sendMessage / sendPhoto / setWebhook…) |
| `AI.js` | OpenAI Whisper + GPT, regex fast-path для `+500 кофе` |
| `Drive.js` | Папка для постеров, base64-загрузка, скачивание из Telegram |
| `Bot.js` | Telegram webhook: команды, текст→intent, голос, фото, callback-кнопки |
| `Hooks.js` | Сайд-эффекты на CRUD: уведомления, автосвязка реклама→финансы |
| `Triggers.js` | Расписания: утро/вечер/неделя/час |
| `Module_*.js` | Доменная логика конкретных модулей (Finance, Habits, Notifications) |
| `Code.js` | `doGet`/`doPost` — точка входа Apps Script Web App |
| `index.html` | Премиальный фронт OMNI-CONTROL — отдаётся через HtmlService |

## Деплой одной строкой (после clasp setup)

```bash
clasp push
```

Дальше — Apps Script-редактор → Deploy → Manage deployments → New version.

См. `docs/SETUP.md` для полной инструкции с нуля.
