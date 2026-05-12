# OMNI-CONTROL 2026

Личный ассистент: премиальная веб-панель + Telegram-бот + Google Sheets как БД.
Всё бесплатно, без VPS — Google Apps Script хостит API, фронт и webhook бота в одном проекте.

## Что внутри

- **Telegram-бот** (`@omni_control_bot` или любой свой) — кидаешь расходы, привычки, идеи,
  голосовые; получаешь утренние/вечерние сводки и AI-аналитику
- **Mini App / веб-панель** — премиум-UI 2026, 8 модулей: Дашборд, Контент, Канбан, Реклама,
  Персонаж, Команда, Инбокс, Финансы, Привычки. 8 тем оформления
- **Google Sheets** — реальная база данных, всегда можно открыть и поправить руками
- **OpenAI** (Whisper + GPT) — голосовой ввод и свободные вопросы по своим данным

Подробнее — `docs/SETUP.md` (пошаговый деплой), `docs/BOT_COMMANDS.md`, `docs/SHEETS_SCHEMA.md`.

## Стек

- Backend: Google Apps Script (V8) + SpreadsheetApp + DriveApp + UrlFetchApp
- Frontend: чистый HTML + CSS + ES2020, Chart.js, Telegram WebApp SDK
- AI: OpenAI Whisper (голос) + GPT (intent-парсинг и аналитика)
- Деплой: `clasp` или копи-паст в Apps Script-редактор
