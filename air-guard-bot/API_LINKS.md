# Air Guard Bot — Всі API та сервіси

Повний список ресурсів які потрібно зареєструвати/відвідати. Стовпчик "Стан" заповниш сам, коли отримаєш ключ.

---

## 🟢 Обов'язкові — без них бот не запуститься

| Сервіс | Призначення | Лінк | Безкоштовно? | Стан |
|---|---|---|---|---|
| **Telegram BotFather** | Створення бота, токен | https://t.me/BotFather | ✓ | ☐ |
| **Telegram API (Telethon)** | API_ID та API_HASH для читання каналів | https://my.telegram.org | ✓ | ☐ |
| **alerts.in.ua API** | Офіційні тривоги Tier-0 | https://devs.alerts.in.ua | ✓ (некомерц.) | ☐ |
| **Anthropic Console** | Claude Haiku 4.5 для vision | https://console.anthropic.com | Платно (~$8/міс) | ☐ |
| **Google AI Studio** | Gemini 2.5 Flash-Lite | https://aistudio.google.com/apikey | ✓ (з лімітами) | ☐ |
| **OpenAI Platform** | TTS для voice call | https://platform.openai.com | Платно (~$1/міс) | ☐ |

---

## 🟡 Сильно рекомендовані — без них якісно гірше

| Сервіс | Призначення | Лінк | Вартість | Стан |
|---|---|---|---|---|
| **Plivo** | Voice call для +380 (Twilio в UA не працює) | https://www.plivo.com | ~$5/міс | ☐ |
| **TurboSMS** | SMS-fallback для UA номерів | https://turbosms.ua | ~$5/міс | ☐ |
| **MapTiler** | Tiles для динамічних карт | https://www.maptiler.com | $0 (free tier 100K/міс) | ☐ |
| **Backblaze B2** | Encrypted backup SQLite | https://www.backblaze.com/b2 | ~$0.50/міс | ☐ |
| **Hetzner Cloud** | Основний VPS (Helsinki) | https://www.hetzner.com/cloud | ~$10/міс | ☐ |
| **Contabo** або **OVH** | Watchdog VPS (інший провайдер) | https://contabo.com | ~$4/міс | ☐ |
| **UptimeRobot** | Альтернатива watchdog (простіше) | https://uptimerobot.com | ✓ (free 50 мониторів) | ☐ |

---

## 🟠 Опціональні / можна без них

| Сервіс | Призначення | Лінк | Вартість | Стан |
|---|---|---|---|---|
| **NEPTUN** | Real-time позиції загроз (партнерський API) | https://neptun.in.ua | TBD (надішли лист) | ☐ |
| **Dron Alerts** | SSE стрім позицій дронів | TBD (research) | TBD | ☐ |
| **e-Tryvoga** | Crowdsourced reports | https://etryvoga.com | ✓ | ☐ |
| **Twilio** | SMS на не-UA номери (для тебе) | https://www.twilio.com | ~$1-5/міс | ☐ |
| **Sinch** | Альтернатива Plivo для voice | https://www.sinch.com | По тарифу | ☐ |
| **Vonage / Nexmo** | Ще одна альтернатива voice | https://www.vonage.com | По тарифу | ☐ |
| **Apple Developer** (якщо PWA mic detection) | Свій PWA для шумоаналізу | https://developer.apple.com | $99/рік | ☐ |
| **LottieFiles** | Безкоштовні Lottie анімації для стікерів | https://lottiefiles.com | ✓ | ☐ |
| **Midjourney** | Генерація логотипу і ілюстрацій | https://www.midjourney.com | $10/міс | ☐ |
| **DALL-E 3 / ChatGPT Plus** | Альтернатива Midjourney | https://chat.openai.com | $20/міс | ☐ |
| **Sora / Runway / Pika** | Генерація анімованих стікерів | https://runwayml.com / https://pika.art | $15-30/міс | ☐ |

---

## 📡 Публічні API без реєстрації

Використовуй прямо, без ключів:

| Сервіс | Призначення | Лінк |
|---|---|---|
| **Open-Meteo** | Прогноз вітру для trajectory | https://api.open-meteo.com/v1/forecast |
| **Nominatim** | Геокодинг адрес (OpenStreetMap) | https://nominatim.openstreetmap.org |
| **OSRM** | Pedestrian routing до укриттів | https://router.project-osrm.org |
| **Overpass API** | Дамп OSM полігонів та укриттів | https://overpass-api.de/api/interpreter |
| **YASNO blackout API** | Графіки відключень Дніпропетровщини | https://app.yasno.ua/api/blackout-service/public/ |
| **Diia shelters** | Реєстр укриттів (можливий публічний доступ) | https://shelters.diia.gov.ua |

⚠️ **Правила etiquette:**
- Nominatim: max 1 req/sec, обов'язково задати свій `User-Agent`
- Overpass API: для дампів використовувати раз на місяць, не для real-time
- OSRM publicroad: не для production, для production хости свій instance
- OSM tiles на tile.openstreetmap.org **не використовуй** — рейт-лімітнуть. Бери MapTiler.

---

## 🛒 Telegram-боти-помічники

Доступні з самого Telegram:

| Бот | Призначення |
|---|---|
| `@BotFather` | Створення/налаштування свого бота |
| `@stickers` | Створення sticker pack і emoji pack |
| `@PremiumBot` | Опціонально Telegram Premium для custom emoji |
| `@username_to_id_bot` | Отримати user_id з username |
| `@RawDataBot` | Подивитись raw об'єкти повідомлень Telegram |
| `@usinfobot` | Інформація про user_id, дата реєстрації, etc. |
| `@stickerinfobot` | Отримати file_id стікера для коду |

---

## 📞 Українські SMS-провайдери (альтернативи)

Якщо TurboSMS не підійде:

| Сервіс | Лінк | Особливості |
|---|---|---|
| TurboSMS | https://turbosms.ua | Найпопулярніший, треба перевірити чи можна без ФОП |
| SMS Fly | https://sms-fly.ua | Старий, працює без ФОП у деяких випадках |
| Intellect Money / Intertelecom | https://intertelecom.ua | Сильні в UA, OnNet |
| Kievstar SMS API | https://www.kyivstar.ua/business | Тільки для бізнес-клієнтів, але якщо є ФОП — стабільно |

---

## 🗂 Швидкий чек-лист реєстрацій

Скопіюй у Apple Notes / 1Password і поетапно проходь:

```
☐ @BotFather — створити Air Guard Bot, забрати BOT_TOKEN
☐ my.telegram.org — забрати API_ID + API_HASH
☐ devs.alerts.in.ua — заповнити форму, чекати token (1-2 дні)
☐ console.anthropic.com — поповнити $10, забрати API key
☐ aistudio.google.com — створити Gemini key (free)
☐ platform.openai.com — поповнити $5, забрати API key
☐ plivo.com — реєстрація, верифікація, купити UA-friendly номер
☐ turbosms.ua — реєстрація, поповнити $5, забрати token
☐ maptiler.com — реєстрація, забрати key (free tier)
☐ backblaze.com → B2 — створити bucket "airguard-backups", забрати keys
☐ hetzner.com → Cloud → create CPX21 in Helsinki
☐ contabo.com → найдешевший VPS для watchdog
☐ uptimerobot.com — додати healthcheck URL основного бота
☐ neptun.in.ua → support@neptun.in.ua — відправити лист (з папки NEPTUN_API_REQUEST.md)
☐ midjourney.com — підписка для генерації лого + стікерів
☐ lottiefiles.com — реєстрація, скачати готові анімації
```

---

## 📦 Композиція `.env` (підсумкова)

Після всіх реєстрацій твій `.env` має виглядати так:

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

# === Alerts ===
ALERTS_IN_UA_TOKEN=...
NEPTUN_API_KEY=                  # коли отримаєш

# === Voice (Plivo, не Twilio для UA) ===
PLIVO_AUTH_ID=...
PLIVO_AUTH_TOKEN=...
PLIVO_FROM_NUMBER=+...

# === SMS ===
TURBOSMS_TOKEN=...

# === Maps ===
MAPTILER_API_KEY=...

# === Backup ===
B2_KEY_ID=...
B2_APP_KEY=...
B2_BUCKET=airguard-backups
AGE_PUBLIC_KEY=age1...

# === Phones ===
PRIMARY_USER_PHONE=+380...
BACKUP_USER_PHONE=+380...

# === Roles bootstrap (одноразово) ===
PRIMARY_USER_ID=
BACKUP_USER_ID=
ROLE_CODE_YOZHYK=ежик-савкина-травень-26
ROLE_CODE_MISHKA=мишка-помічник-26

# === Watchdog ===
WATCHDOG_BOT_TOKEN=8...           # ОКРЕМИЙ токен від іншого бота
HEALTHCHECK_URL=https://airguard.example.com/healthz

# === TTS hosting ===
TTS_CDN_BASE_URL=https://cdn.airguard.example.com

# === Logs ===
LOG_LEVEL=INFO
```

---

## 🆘 Якщо щось зламається

| Сервіс лежить | План Б |
|---|---|
| alerts.in.ua | Дублюємо з @kpszsu Telegram |
| Anthropic | Vision-race fallback на Gemini |
| Gemini | Vision на Claude only |
| Plivo voice | Telegram voice message + SMS escalation |
| TurboSMS | Plivo SMS (платно але працює) |
| MapTiler | Self-hosted TileServer-GL |
| Hetzner | Migrate to Contabo (інакше IP, але працює) |
| Telegram API (full block) | SMS-only режим до відновлення |
| Backblaze | Local backup на той же VPS (тимчасово) |

---

## 📚 Корисні документації для розробки

| Технологія | Документація |
|---|---|
| aiogram 3 | https://docs.aiogram.dev/en/latest/ |
| Telethon | https://docs.telethon.dev/en/stable/ |
| Anthropic Python SDK | https://docs.anthropic.com/en/api/client-sdks |
| Google Gen AI SDK | https://ai.google.dev/gemini-api/docs |
| OpenAI Python SDK | https://platform.openai.com/docs/libraries |
| Plivo Python SDK | https://www.plivo.com/docs/voice/sdk/python/ |
| Pillow (карти) | https://pillow.readthedocs.io |
| staticmap | https://github.com/komoot/staticmap |
| age encryption | https://age-encryption.org |
| Backblaze B2 SDK | https://b2-sdk-python.readthedocs.io |
| structlog | https://www.structlog.org |
| pytest-asyncio | https://pytest-asyncio.readthedocs.io |
| MapTiler tiles | https://docs.maptiler.com/cloud/api/ |
| Lottie spec | https://lottiefiles.com/what-is-lottie |
| Telegram sticker formats | https://core.telegram.org/stickers#animated-sticker-requirements |
