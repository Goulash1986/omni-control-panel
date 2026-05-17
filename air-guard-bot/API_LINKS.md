# Air Guard Bot — Всі API та сервіси (verified May 2026)

Повний список ресурсів які потрібно зареєструвати/відвідати. Стовпчик "Стан" заповниш сам.

---

## 🟢 Обов'язкові — без них бот не запуститься

| Сервіс | Призначення | Лінк | Вартість | Стан |
|---|---|---|---|---|
| **Telegram BotFather** | Створення бота, токен | https://t.me/BotFather | Безкоштовно | ☐ |
| **Telegram API (Telethon)** | API_ID + API_HASH для читання каналів | https://my.telegram.org | Безкоштовно | ☐ |
| **alerts.in.ua API** | Офіційні тривоги Tier-0 (тільки REST polling, без WebSocket у 2026) | https://alerts.in.ua/api-request | Безкоштовно (некомерц.) | ☐ |
| **Anthropic Console** | Claude Haiku 4.5 (`claude-haiku-4-5`) для vision | https://console.anthropic.com | Платно (~$5/міс з prompt caching) | ☐ |
| **Google AI Studio** | Gemini 2.5 Flash-Lite (`gemini-2.5-flash-lite`) | https://aistudio.google.com/apikey | Free tier (нам вистачить) | ☐ |
| **OpenAI Platform** | `gpt-4o-mini-tts` (заміна tts-1-hd) | https://platform.openai.com | ~$1/міс | ☐ |

---

## 🟡 Сильно рекомендовані — без них якісно гірше

| Сервіс | Призначення | Лінк | Вартість | Стан |
|---|---|---|---|---|
| **Telegram @BotFather (другий бот)** | `EMERGENCY_BOT_TOKEN` — окремий бот для критичних alerts з гучнішим звуком | https://t.me/BotFather | Безкоштовно | ☐ |
| **Stadia Maps** | Tiles для динамічних карт (рекомендовано) | https://stadiamaps.com | Free dev plan (без картки) | ☐ |
| **Backblaze B2** | Encrypted backup SQLite | https://www.backblaze.com/b2 | ~$0.50/міс | ☐ |
| **Hetzner Cloud** | Основний VPS — CAX21 у Falkenstein | https://www.hetzner.com/cloud | €7/міс | ☐ |
| **Contabo** або **Vultr** | Watchdog VPS (інший провайдер!) | https://contabo.com / https://vultr.com | ~$4/міс | ☐ |
| **UptimeRobot** | Альтернатива watchdog (простіше) | https://uptimerobot.com | Free 50 моніторів | ☐ |
| **ElevenLabs** | Якісний український голос для персони "Мишка" у Telegram voice .ogg | https://elevenlabs.io | $5/міс Starter | ☐ |
| **DTEK Dnem shutdowns** | Дізнатись чергу для Савкіна 6 (one-time) | https://www.dtek-dnem.com.ua/ua/shutdowns | Безкоштовно | ☐ |

---

## 🟠 Опціональні / можна без них

| Сервіс | Призначення | Лінк | Вартість | Стан |
|---|---|---|---|---|
| **NEPTUN** | Не має public API у 2026 — моніторимо їх Telegram-канал як OSINT | https://neptun.in.ua | — | n/a |
| **MapTiler** | Backup map tiles (якщо Stadia не зайде) | https://www.maptiler.com | Free 100K loads/міс | ☐ |
| **Mapbox** | Інший backup tiles | https://www.mapbox.com | Free 50K | ☐ |
| **Apple Developer** (якщо PWA mic detection) | Свій PWA для шумоаналізу | https://developer.apple.com | $99/рік | ☐ |
| **LottieFiles** | Безкоштовні Lottie анімації для стікерів | https://lottiefiles.com | Free tier | ☐ |
| **Midjourney** | Генерація логотипу і ілюстрацій | https://www.midjourney.com | $10/міс | ☐ |
| **DALL-E 3 / ChatGPT Plus** | Альтернатива Midjourney | https://chatgpt.com | $20/міс | ☐ |
| **Sora / Runway / Pika** | Генерація анімованих стікерів | https://runwayml.com / https://pika.art | $15-30/міс | ☐ |
| **Cloudflare R2** | Альтернатива B2 для backup (no egress fee) | https://www.cloudflare.com/products/r2/ | $0.015/GB | ☐ |

---

## 🚫 НЕ ВИКОРИСТОВУЄМО у v1 (зафіксовано рішенням)

| Сервіс | Чому |
|---|---|
| ~~Plivo / Sinch / Twilio / Vonage / Infobip~~ | **Зовнішні дзвінки вимкнено у v1**. Telegram-only ескалація (primary bot + emergency bot + voice .ogg + backup-користувач) |
| ~~TurboSMS / SMS Fly~~ | SMS вимкнено у v1 |

Якщо v2 знадобиться зовнішня телефонія — інструкція збережена у `MASTER_PROMPT.md` секція "ІДЕЇ ДЛЯ v2".

## 🚫 ЗАСТАРІЛІ / НЕ використовувати для нашого випадку

| Сервіс | Чому |
|---|---|
| ~~Yasno Київ-only sub-domain~~ | API api.yasno.com.ua покриває і Дніпро через `components.dnipro` |
| ~~old `google-generativeai`~~ | Застарілий, використовуй новий `google-genai` |
| ~~старий `staticmap` пакет~~ | Low maintenance, бери `py-staticmaps` (flopp) |
| ~~Hetzner CPX21~~ | Deprecated з 2025, замінено на CAX21/CX23 |
| ~~Hetzner Helsinki для нашого випадку~~ | Falkenstein ближче до Telegram DC |
| ~~tile.openstreetmap.org прямо~~ | Rate-limit, не можна для production |

---

## 📡 Публічні API без реєстрації

| Сервіс | Призначення | Лінк |
|---|---|---|
| **YASNO API** (DTEK) | Графік відключень для Дніпра (undocumented but stable) | https://api.yasno.com.ua/api/v1/pages/home/schedule-turn-off-electricity |
| **Open-Meteo** | Прогноз вітру для trajectory | https://api.open-meteo.com/v1/forecast |
| **Nominatim** | Геокодинг адрес | https://nominatim.openstreetmap.org |
| **OSRM** | Pedestrian routing до укриттів | https://router.project-osrm.org |
| **Overpass API** | Дамп OSM полігонів та укриттів | https://overpass-api.de/api/interpreter |
| **ubilling aerial alerts** | Cross-check для alerts.in.ua | https://wiki.ubilling.net.ua/doku.php?id=aerialalertsapi |
| **Diia shelters** | Реєстр укриттів | https://shelters.diia.gov.ua |

⚠️ **Правила etiquette:**
- Nominatim: max 1 req/sec, обов'язково задати свій `User-Agent`
- Overpass API: для дампів використовувати раз на місяць, не для real-time
- OSRM public: не для production, для production хости свій instance
- YASNO API undocumented — додай schema-change alerts, парсь defensive (`.get()` замість прямого доступу)
- alerts.in.ua: max 8–10 req/min/IP soft, 12 hard; для history endpoint — 2 req/min; cache TTL ~30s

---

## 🛒 Telegram-боти-помічники

| Бот | Призначення |
|---|---|
| `@BotFather` | Створення/налаштування свого бота |
| `@stickers` | Створення sticker pack і emoji pack |
| `@PremiumBot` | Telegram Premium (потрібен власнику бота для custom emoji в outgoing messages) |
| `@username_to_id_bot` | Отримати user_id з username |
| `@RawDataBot` | Подивитись raw об'єкти повідомлень Telegram |
| `@usinfobot` | Інформація про user_id |
| `@stickerinfobot` | Отримати file_id стікера для коду |
| `@DTEKDniprovskiElektromerezhiBot` | Дізнатись чергу графіка по адресі (треба особовий рахунок) |

---

## 📦 Композиція `.env` (підсумкова, verified May 2026)

```bash
# === Telegram ===
BOT_TOKEN=8...:AAH...
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abc123...
TELEGRAM_SESSION_NAME=air_guard_user

# === LLM ===
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=                    # опц., для голосу персони
ELEVENLABS_VOICE_ID=                   # ID склонованого голосу Мишки

# === Alerts ===
ALERTS_IN_UA_TOKEN=...
# NEPTUN_API_KEY=                      # NEPTUN не має public API у 2026

# === Emergency bot (другий бот для критичних alerts) ===
EMERGENCY_BOT_TOKEN=8...:AAH...

# === Voice — ВНУТРІШНІ Telegram .ogg, без зовнішніх дзвінків у v1 ===
# OpenAI gpt-4o-mini-tts через OPENAI_API_KEY вище
# ElevenLabs через ELEVENLABS_API_KEY вище

# === Зовнішні дзвінки DISABLED у v1 ===
# PLIVO_AUTH_ID=
# PLIVO_AUTH_TOKEN=
# PLIVO_FROM_NUMBER=
# SINCH_SERVICE_PLAN_ID=
# SINCH_API_TOKEN=
# SINCH_FROM_NUMBER=
# TTS_CDN_BASE_URL=

# === Карти ===
STADIAMAPS_API_KEY=...

# === DTEK / YASNO ===
DTEK_YASNO_QUEUE=3.2                   # отримай з dtek-dnem.com.ua/ua/shutdowns

# === Backup ===
B2_KEY_ID=...
B2_APP_KEY=...
B2_BUCKET=airguard-backups
AGE_PUBLIC_KEY=age1...                 # публічний ключ, приватний у твоєму 1Password

# === Phones ===
PRIMARY_USER_PHONE=+380...
BACKUP_USER_PHONE=+380...

# === Ролі bootstrap (одноразово) ===
PRIMARY_USER_ID=
BACKUP_USER_ID=
ROLE_CODE_YOZHYK=ежик-савкина-травень-26
ROLE_CODE_MISHKA=мишка-помічник-26

# === Watchdog ===
WATCHDOG_BOT_TOKEN=8...                # ОКРЕМИЙ токен від іншого бота
HEALTHCHECK_URL=https://airguard.example.com/healthz

# === SMS — DISABLED IN v1 ===
# TURBOSMS_TOKEN=

# === Logs ===
LOG_LEVEL=INFO
```

---

## 🆘 Якщо щось зламається — оновлений план Б

| Сервіс лежить | План Б |
|---|---|
| alerts.in.ua | OSINT Telegram-канали (@kpszsu, @dnipropetrovsk_ova) + cross-check через ubilling.net.ua |
| Anthropic | Vision-race fallback на Gemini only |
| Gemini | Vision на Claude only |
| Primary bot заблокований / FloodWait | Emergency bot (другий токен) працює паралельно |
| Обидва Telegram-боти лагають | Voice message (.ogg) на iOS показує duration push, + escalation до backup-користувача |
| Її телефон у silent mode і не реагує | Backup-користувач (Мишка) отримує "ежик не відповідає" → дзвонить фізично |
| YASNO API (undocumented endpoint змінився) | Text-scrape DTEK Dnem як fallback + email alert тобі |
| Stadia Maps | MapTiler як backup tile-провайдер |
| Hetzner CAX21 (ARM issue) | Migrate to CX23 (Intel) на тій же платформі |
| Hetzner Falkenstein region down | Створити снапшот заздалегідь → restore у Helsinki |
| Telegram API (full block) | Email-fallback через Resend/SendGrid + Apple Watch fallback |
| Backblaze B2 | Local backup на той же VPS (тимчасово) до відновлення |

---

## 📚 Корисні документації для розробки (verified 2026)

| Технологія | Документація |
|---|---|
| aiogram 3.28+ | https://docs.aiogram.dev/en/latest/ |
| Telethon 1.43 (archived Feb 2026, працює) | https://docs.telethon.dev/en/stable/ |
| Pyrogram (план міграції з Telethon) | https://docs.pyrogram.org/ |
| alerts-in-ua SDK | https://pypi.org/project/alerts-in-ua/ |
| Anthropic Python SDK 0.102+ | https://docs.anthropic.com/en/api/client-sdks |
| Claude Haiku 4.5 модель | https://www.anthropic.com/news/claude-haiku-4-5 |
| Google Gen AI SDK (`google-genai` 2.3+) | https://googleapis.github.io/python-genai/ |
| Gemini 2.5 Flash-Lite модель | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite |
| OpenAI Python SDK 2.37+ | https://platform.openai.com/docs/libraries |
| `gpt-4o-mini-tts` | https://developers.openai.com/api/docs/models/gpt-4o-mini-tts |
| ElevenLabs українська | https://elevenlabs.io/text-to-speech/ukrainian |
| Telegram Live Location | https://core.telegram.org/bots/api#location |
| Telegram Web Apps (для /set_zone) | https://core.telegram.org/bots/webapps |
| ~~Plivo Python SDK~~ (v1 не використовуємо) | https://www.plivo.com/docs/voice/sdk/python/ |
| ~~Sinch Voice API~~ (v1 не використовуємо) | https://developers.sinch.com/docs/voice/ |
| Pillow 12.x | https://pillow.readthedocs.io |
| py-staticmaps (flopp/py-staticmaps) | https://github.com/flopp/py-staticmaps |
| age encryption | https://age-encryption.org |
| Backblaze B2 SDK | https://b2-sdk-python.readthedocs.io |
| structlog 25+ | https://www.structlog.org |
| pytest-asyncio | https://pytest-asyncio.readthedocs.io |
| Stadia Maps API | https://docs.stadiamaps.com |
| MapTiler Cloud API | https://docs.maptiler.com/cloud/api/ |
| Lottie spec | https://lottiefiles.com/what-is-lottie |
| Telegram sticker formats | https://core.telegram.org/stickers#animated-sticker-requirements |
| ha-yasno-outages (референс інтеграції) | https://github.com/denysdovhan/ha-yasno-outages |
| svitlo_live (інший приклад) | https://github.com/chaichuk/svitlo_live |
| Telegram Bot API changelog | https://core.telegram.org/bots/api-changelog |
| uv (швидкий pip-replacement) | https://docs.astral.sh/uv/ |
