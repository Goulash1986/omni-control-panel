# Air Guard Bot — Setup Checklist (verified May 2026)

Чек-лист дій до старту розробки. Виконай кроки 1–4 руками (це ~1–2 години активної роботи + 1–2 дні очікування дзвінкового провайдера), потім переходь до Step 5 (нова сесія Claude Code на новому репо).

---

## Step 1: Створити приватний репозиторій GitHub

- [ ] Перейти на https://github.com/new
- [ ] Назва: `air-guard-bot` (або як хочеш)
- [ ] **Visibility: Private** (важливо — там будуть токени і її координати)
- [ ] Initialize: README.md, .gitignore (Python), license (опціонально)
- [ ] Створити

---

## Step 2: Отримати всі API-ключі

### 2.1 Telegram (обов'язково)

- [ ] **Bot token** (5 хв)
  1. У Telegram → `@BotFather` → `/newbot`
  2. Назва: `Air Guard` (або як вирішив за `NAMING_AND_LOGO.md`)
  3. Username: має закінчуватись на `bot` (наприклад `air_guard_personal_bot`)
  4. Зберегти токен → `BOT_TOKEN`

- [ ] **API ID + API Hash** для Telethon (10 хв)
  1. https://my.telegram.org → увійти через свій номер
  2. "API development tools" → створити додаток (App title: `Air Guard`, Short name: `airguard`, Platform: Desktop)
  3. Зберегти `TELEGRAM_API_ID` (число) + `TELEGRAM_API_HASH` (рядок)

### 2.2 LLM провайдери (обов'язково)

- [ ] **Anthropic API key** (5 хв)
  1. https://console.anthropic.com → Settings → API Keys → Create Key
  2. Поповнити баланс на $10 (хватить надовго з prompt caching)
  3. Зберегти → `ANTHROPIC_API_KEY`
  4. _Модель буде `claude-haiku-4-5` (verified May 2026)_

- [ ] **Gemini API key** (3 хв)
  1. https://aistudio.google.com/apikey
  2. Create API Key — безкоштовно з лімітами, нам вистачить
  3. Зберегти → `GEMINI_API_KEY`
  4. _Модель буде `gemini-2.5-flash-lite`, через **новий пакет `google-genai`** (не старий `google-generativeai`)_

- [ ] **OpenAI API key** для TTS (5 хв)
  1. https://platform.openai.com → API Keys → Create
  2. Поповнити баланс на $5
  3. Зберегти → `OPENAI_API_KEY`
  4. _Модель буде `gpt-4o-mini-tts` (заміна tts-1-hd, актуально 2026)_

- [ ] **ElevenLabs API key** (опц., для якісного українського голосу персони "Мишка")
  1. https://elevenlabs.io → Sign Up
  2. Starter plan ~$5/міс — дозволяє Instant Voice Clone
  3. Sign up → API Key
  4. Створити клон голосу (можна свій або найняти voice actor):
     - VoiceLab → Add Voice → Instant Voice Clone
     - Завантажити 1+ хв чистого аудіо
     - Записати `ELEVENLABS_VOICE_ID`
  5. Зберегти `ELEVENLABS_API_KEY`

### 2.3 Тривога API (обов'язково)

- [ ] **alerts.in.ua API token** (1 день очікування)
  1. Заповнити форму: https://alerts.in.ua/api-request
  2. Manual review, видають за 1–2 дні (для некомерційного — безкоштовно)
  3. Зберегти → `ALERTS_IN_UA_TOKEN`
  4. ⚠️ **Важливо:** у 2026 alerts.in.ua **тільки REST polling**, WebSocket НЕМАЄ. Granularity подій — лише 5 типів (`air_raid`, `artillery_shelling`, `urban_fights`, `chemical`, `nuclear`). Балістику/UAV/КАБ детектимо з OSINT-каналів.
  5. Офіційний SDK: `pip install alerts-in-ua` (AsyncClient)

### 2.4 Voice провайдери (рекомендовано — active-active для life-safety)

- [ ] **Plivo** (1–2 дні верифікації)
  1. https://www.plivo.com → Sign Up
  2. Верифікація — вимагає валідного email + телефон + (іноді) бізнес-документи
  3. **Critical:** Console → Voice → Geo Permissions → перевірити що `Ukraine` **enabled**. У нових акаунтів може бути disabled by default для high-fraud destinations.
  4. Купити PSTN-номер (US номер OK — для outbound на +380 from-number не критичний)
  5. Зберегти `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_FROM_NUMBER`
  6. Поповнити $10 (~$0.39/хв до UA mobile = ~25 хв розмов)
  7. **Тест:** зробити 5 пробних дзвінків на свій номер +380, виміряти audio quality

- [ ] **Sinch** (1–2 дні)
  1. https://sinch.com → Sign Up
  2. Verify, create Voice service plan
  3. Зберегти `SINCH_SERVICE_PLAN_ID`, `SINCH_API_TOKEN`, `SINCH_FROM_NUMBER`
  4. **Тест:** так само 5 пробних дзвінків

- [ ] (Опційно) **Twilio** — empirical test
  - Раніше (2023) Twilio мав проблеми з UA mobile, але у поточному UA Voice Guidelines значиться "Outbound: Yes"
  - Якщо є час — зареєструйся, купи номер $1, зроби 5 тестових дзвінків
  - Якщо працює і ASR ≥ 95% — додай як третій failover-канал

### 2.5 SMS — DISABLED у v1

~~TurboSMS~~ — пропускаємо у v1 (вирішили не використовувати SMS, Telegram + voice call достатньо).

### 2.6 NEPTUN — НЕ має public API у 2026 (verified)

- [ ] Можеш все ж відправити лист `NEPTUN_API_REQUEST.md` через їх Telegram-канал (контактного email на сайті немає, тільки tg)
- Архітектурно: моніторимо їх Telegram-канал як OSINT-джерело Tier-2
- Не блокуй розробку очікуванням NEPTUN

### 2.7 Карти

- [ ] **Stadia Maps** (5 хв)
  1. https://stadiamaps.com → Sign Up (без картки)
  2. Create Property → отримати API key
  3. Зберегти → `STADIAMAPS_API_KEY`
  4. _Рекомендований стиль: `alidade_smooth_dark` (темна тема узгоджується з alert-маркерами)_

### 2.8 Backup

- [ ] **Backblaze B2** (10 хв)
  1. https://www.backblaze.com → Cloud Storage → Sign Up
  2. Create Bucket: `airguard-backups`, private, encrypted at rest
  3. App Keys → Create New Master Application Key (або scoped до цього bucket)
  4. Зберегти `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`

- [ ] **age encryption key**
  1. На своєму Mac: `brew install age && age-keygen -o ~/.config/age/airguard.key`
  2. Скопіювати публічний ключ (рядок який починається з `age1...`) → `AGE_PUBLIC_KEY`
  3. **Приватний ключ зберегти у 1Password / iCloud Keychain** — без нього backup'и не розшифрувати

---

## Step 3: Налаштувати VPS (verified May 2026 — CPX21 deprecated!)

### Основний сервер

- [ ] **Hetzner Cloud** (https://www.hetzner.com/cloud)
  - Project: `air-guard`
  - Server type: **CAX21** (4 ARM vCPU / 8 GB RAM / 80 GB SSD) — €7/міс
  - Альтернатива якщо є проблеми з ARM-сумісністю якоїсь Python-залежності: **CX23** (Intel, 2 vCPU/4 GB) — €3.49–3.79/міс
  - Image: Ubuntu 24.04 LTS (ARM) або 24.04 LTS (x86) залежно від типу
  - Location: **Falkenstein (FSN1)** — ближче до Telegram DC (Amsterdam) ~15–25мс vs Helsinki ~25–40мс
  - SSH key: додати свій
  - Server name: `airguard-main`
  - Записати IPv4 у нотатки

### Watchdog (на іншому провайдері!)

- [ ] **Contabo** або **Vultr** або **OVH** — найдешевший VPS ($3–5/міс)
- **Або:** **UptimeRobot** (https://uptimerobot.com) — безкоштовно для базових HTTP-перевірок
- Записати ендпоінт моніторингу

---

## Step 4: DTEK / YASNO — дізнатись чергу для Савкіна 6

**Робиться один раз, ~5 хвилин:**

- [ ] Перейти на https://www.dtek-dnem.com.ua/ua/shutdowns
- [ ] Форма пошуку:
  - Місто: `Дніпро`
  - Район: `Новокодацький`
  - Вулиця: `Савкіна`
  - Будинок: `6`
- [ ] Сторінка покаже **чергу** (наприклад `3.2`)
- [ ] Записати → `DTEK_YASNO_QUEUE` у `.env`

Якщо UI не дає чергу — альтернатива через Telegram-бот `@DTEKDniprovskiElektromerezhiBot` (треба буде ввести особовий рахунок ежика).

---

## Step 5: Підготувати ролі та секретні коди

- [ ] **Сполучитись з ежиком**, разом придумати **два секретних кода**:
  - `ROLE_CODE_YOZHYK` = наприклад `ежик-савкина-травень-26`
  - `ROLE_CODE_MISHKA` = наприклад `мишка-помічник-26`
  - Записати ОБИДВА у Apple Notes / 1Password
  - **Не передавати в чатах** де не довіряєш (Telegram до бота — ОК, бо одноразово)

- [ ] **Записати номери телефонів обох:**
  - `PRIMARY_USER_PHONE` (її): `+380...`
  - `BACKUP_USER_PHONE` (твій): `+380...`

- [ ] **Уточнити в ежика і записати у `config/home_layout.yaml`:**
  - ~~Адреса:~~ вже знаємо — Савкіна 6, під'їзд 2, поверх 6, кв. 59
  - Код домофону на під'їзд (запитати)
  - Що видно з вікна (для emergency dispatch — диспетчер запитає "що бачите")
  - Колір/особливості будинку
  - Кращі стіни для укриття у квартирі (за планом — найкраща несуча стіна, найбезпечніший куток)
  - Куди йти у разі евакуації з квартири (підвал у дворі / найближче укриття вул. Білостоцького 17 — перевірити що ще працює)

- [ ] **Перевірити її iPhone налаштування** (зробите при першому використанні бота):
  - Settings → Focus → Sleep / Do Not Disturb → People & Apps → дозволити Air Guard Bot чат
  - Settings → Focus → Driving → так само
  - У Telegram → Notifications для бота → найгучніший звук + Importance: High
  - Якщо є Apple Watch: дозволити сповіщення з цього чату

---

## Step 6: Старт нової сесії Claude Code

- [ ] Відкрити https://code.claude.com
- [ ] Створити **нову сесію** на репозиторії `air-guard-bot`
- [ ] Гілка: `main` або створити `claude/air-guard-v1`
- [ ] У перше повідомлення вставити **повний вміст файлу `MASTER_PROMPT.md`** (з цієї папки)
- [ ] Дочекатись поки Claude розгорне фундамент (Week 1 step 1-2 за одну сесію)
- [ ] Коли скаже "потрібен .env" — створити локально (НЕ комітити!) з усіма зібраними ключами

---

## Step 7: Перевірка `.env` перед запуском

**Обов'язкові:**
- [ ] `BOT_TOKEN`
- [ ] `TELEGRAM_API_ID`
- [ ] `TELEGRAM_API_HASH`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `ALERTS_IN_UA_TOKEN`
- [ ] `ROLE_CODE_YOZHYK`
- [ ] `ROLE_CODE_MISHKA`

**Сильно рекомендовані:**
- [ ] `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_FROM_NUMBER`
- [ ] `SINCH_SERVICE_PLAN_ID`, `SINCH_API_TOKEN`, `SINCH_FROM_NUMBER`
- [ ] `PRIMARY_USER_PHONE`, `BACKUP_USER_PHONE`
- [ ] `STADIAMAPS_API_KEY`
- [ ] `DTEK_YASNO_QUEUE`
- [ ] `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`, `AGE_PUBLIC_KEY`

**Опціональні:**
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (якщо хочеш якісний UA голос Мишки)
- ~~`TURBOSMS_TOKEN`~~ (DISABLED у v1)

**Порожні OK на старті:**
- `PRIMARY_USER_ID`, `BACKUP_USER_ID` — заповняться автоматично після `/im_yozhyk` та `/im_mishka`

---

## Step 8: Перший запуск і реєстрація ролей

1. Підняти бот на VPS через `docker compose up -d`
2. Перевірити `docker logs airguard` — має бути "Telethon connected", "alerts.in.ua poller started", "Bot started"
3. У Telegram написати боту `/start` від ежика
4. Вона: `/im_yozhyk <код>` — отримає "Привіт, ежик! Зареєстровано як primary."
5. Ти: `/start`, потім `/im_mishka <код>` — реєстрація backup
6. **Видалити з `.env` рядки `ROLE_CODE_YOZHYK` і `ROLE_CODE_MISHKA`** (single-use захист)
7. Перевірити `/whoami` від обох
8. Тестове `/sos` від ежика — має прийти карта з укриттями
9. Тестове `/svitlo` — має показати графік DTEK для черги Савкіна 6
10. Перевірити voice call: `/test_call` від тебе (development-only) → телефон ежика має задзвонити через ~10 сек

---

## Step 9: Налаштування sticker pack

- [ ] У Telegram написати `@stickers`
- [ ] `/newpack` → назва `Air Guard Alerts`
- [ ] Додати стікери за списком з `ASSETS_PROMPTS.md` секція "Sticker Pack Manifest"
  - Готові Lottie з https://lottiefiles.com (фільтр free for commercial)
  - Або згенерувати через Sora/Pika по prompts з `ASSETS_PROMPTS.md`
- [ ] Отримати `file_id` кожного стікера через `@stickerinfobot`
- [ ] Внести `file_id` у `src/air_guard/bot/stickers.py`
- [ ] Так само створити **emoji pack** `Air Guard Characters` з 8 емодзі-персонажів (ежик/мишка)

---

## Step 10: Створити логотип бота

- [ ] Обрати ім'я зі `NAMING_AND_LOGO.md`
- [ ] Згенерувати лого через Midjourney/DALL-E за prompt'ом обраного варіанту
- [ ] Обрізати у круг (Telegram автоматично кропить, але краще завчасно), 640×640 PNG
- [ ] `@BotFather` → `/setuserpic` → завантажити
- [ ] `/setdescription` — короткий опис
- [ ] `/setcommands` — список команд:
  ```
  start - Початок роботи
  whoami - Хто я зараз
  status - Поточна обстановка
  svitlo - Графік світла
  sos - Найближче укриття
  safe - Я в безпеці
  pause - Тимчасово приглушити
  digest - Звіт за день
  ```

---

## Step 11: Custom siren sound (опційно, але корисно)

- [ ] Згенерувати .mp3 з кастомним звуком тривоги через OpenAI TTS + наклад siren sample (через Audacity)
- [ ] Надіслати один раз ежику в Telegram як file
- [ ] Вона: довге натиснення → "Зберегти для сповіщень"
- [ ] У Telegram налаштуваннях бота вибрати цей звук
- [ ] Тест: попросити бота надіслати тестовий IMMEDIATE → перевірити звук

---

## Step 12: Тестові сценарії

- [ ] **`/test_alert immediate`** — синтетичний IMMEDIATE через debug-команду
  - Перевірити: latency прильоту (має бути <2 сек), inline-кнопки, voice call escalation
- [ ] **`/test_alert ballistic`** — балістика-shortcut
  - Має прилетіти моментально через ballistic_path
- [ ] **`/test_alert pre_alert`** — pre-alert тест
- [ ] **`/test_blackout`** — синтетичне сповіщення про блекаут DTEK
- [ ] **`/digest`** — примусовий ранковий дайджест

---

## Operational Routine

**Раз на тиждень:**
- `/latency_stats` — p95 має бути < 3 сек
- Перевірити логи watchdog — не було downtime
- Баланси: Plivo, Sinch, Anthropic, OpenAI, ElevenLabs

**Раз на місяць:**
- **Fire drill:** бот сам шле "🟦 ТРЕНУВАННЯ" → перевірка end-to-end (це автоматизовано в коді)
- Поповнення балансів
- Перевірити schema YASNO API (undocumented endpoint, може зламатись)
- Перегляд логів vision (нові формати картинок)
- Оновити blacklist каналів якщо щось виявилось

---

## У разі проблем

| Сервіс лежить | План Б |
|---|---|
| alerts.in.ua | Дублюємо з @kpszsu, @dnipropetrovsk_ova Telegram |
| Anthropic | Vision-race fallback на Gemini only |
| Gemini | Vision на Claude only |
| Plivo voice | Sinch failover автоматично |
| Plivo + Sinch одночасно | Telegram voice message + escalation backup-користувачу |
| YASNO API | Text-scrape DTEK Dnem як fallback |
| Stadia Maps | MapTiler як backup tile-провайдер |
| Hetzner | Migrate to Contabo (інший IP, але працює) |
| Telegram API (full block) | Email-fallback через Resend/SendGrid |
| Backblaze | Local backup на той же VPS (тимчасово) |

**Аварійний контакт:** якщо бот лежить >5 хв і watchdog не прийшов — пиши прямо у Claude Code: "бот лежить, лог такий-то, фікс". Помічу за 2-3 хв.
