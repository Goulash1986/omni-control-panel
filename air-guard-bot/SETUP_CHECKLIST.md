# Air Guard Bot — Setup Checklist

Чек-лист дій до старту розробки. Виконай кроки 1-4 руками (це ~30-60 хв), потім переходь до Step 5 (нова сесія Claude Code на новому репо).

---

## Step 1: Створити приватний репозиторій GitHub

- [ ] Перейти на https://github.com/new
- [ ] Назва: `air-guard-bot` (або як хочеш)
- [ ] **Visibility: Private** (важливо — там будуть токени і її координати)
- [ ] Initialize: README.md, .gitignore (Python), license (опціонально)
- [ ] Створити

---

## Step 2: Отримати всі API-ключі

### Telegram (обов'язково)

- [ ] **Bot token**
  1. У Telegram написати `@BotFather`
  2. `/newbot`
  3. Назва: `Air Guard` (або як хочеш)
  4. Username: має закінчуватись на `bot` (наприклад `air_guard_personal_bot`)
  5. Зберегти токен у Apple Notes / 1Password — він знадобиться як `BOT_TOKEN`

- [ ] **API ID + API Hash** для Telethon
  1. Перейти на https://my.telegram.org
  2. Увійти через свій номер
  3. "API development tools"
  4. Створити новий додаток:
     - App title: `Air Guard`
     - Short name: `airguard`
     - Platform: Desktop
     - Description: будь-яке
  5. Зберегти `API_ID` (число) і `API_HASH` (рядок)

### LLM провайдери (обов'язково)

- [ ] **Anthropic API key**
  1. https://console.anthropic.com
  2. Settings → API Keys → Create Key
  3. Поповнити баланс на $10 (хватить надовго)
  4. Зберегти ключ як `ANTHROPIC_API_KEY`

- [ ] **Gemini API key**
  1. https://aistudio.google.com/apikey
  2. Create API Key (безкоштовно з лімітом, нам вистачить)
  3. Зберегти як `GEMINI_API_KEY`

- [ ] **OpenAI API key** (для TTS)
  1. https://platform.openai.com
  2. API Keys → Create
  3. Поповнити баланс на $5 (хватить на тисячі дзвінків)
  4. Зберегти як `OPENAI_API_KEY`

### Тривога API (обов'язково)

- [ ] **alerts.in.ua API token**
  1. https://devs.alerts.in.ua
  2. Заповнити форму запиту token'а (для некомерційного використання — безкоштовно, видають за день)
  3. Зберегти як `ALERTS_IN_UA_TOKEN`

### Voice + SMS (рекомендовано для безпеки)

- [ ] **Twilio**
  1. https://twilio.com/try-twilio
  2. Зареєструватись, верифікувати свій телефон
  3. Купити номер: пошук номера в Account Console → Phone Numbers → Buy
     - Краще **український** номер (~$2/міс), якщо доступно
     - Або US/UK номер з підтримкою міжнародних дзвінків
  4. Зберегти:
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_FROM_NUMBER` (куплений номер у форматі `+1...`)
  5. Поповнити баланс на $10 (хватить на сотні дзвінків)
  6. **Початок верифікації може зайняти 1-2 дні** — почни сьогодні!

- [ ] **TurboSMS** (UA SMS-провайдер)
  1. https://turbosms.ua
  2. Реєстрація, верифікація компанії (для UA провайдерів іноді треба бути ФОП — перевір актуально на день)
  3. Альтернатива якщо не вийде: SMS Fly, IntellectMoney
  4. Поповнити на $5
  5. Зберегти `TURBOSMS_TOKEN`

### NEPTUN (опціонально, можна почати без)

- [ ] Відкрити файл `NEPTUN_API_REQUEST.md`, відправити лист на support@neptun.in.ua
- [ ] Розробку не блокуй — додамо, коли дадуть API

---

## Step 3: Налаштувати VPS

### Основний сервер

- [ ] **Hetzner Helsinki** (https://hetzner.cloud)
  - Project: `air-guard`
  - Server type: **CPX21** ($10/міс, 4GB RAM, 3 vCPU, 80GB SSD)
  - Image: Ubuntu 24.04 LTS
  - Location: **Helsinki** (HEL1) або Falkenstein (FSN1)
  - SSH key: додати свій
  - Server name: `airguard-main`
- [ ] Записати IPv4 у нотатки

### Watchdog (на іншому провайдері!)

- [ ] **Contabo** або **OVH** — $3-5/міс мінімальний VPS
  - Можна почати з **UptimeRobot** (https://uptimerobot.com, безкоштовно для базових перевірок) — фактично watchdog без власного коду
- [ ] Записати ендпоінт моніторингу

---

## Step 4: Підготувати ролі та секретні коди

- [ ] **Сполучитись з ежиком**, разом придумати **два секретних кода**:
  - `ROLE_CODE_YOZHYK` = наприклад `ежик-савкина-травень-26`
  - `ROLE_CODE_MISHKA` = наприклад `мишка-помічник-26`
  - Записати ОБИДВА у Apple Notes / 1Password
  - НЕ передавати в чатах де не довіряєш

- [ ] **Записати номери телефонів обох:**
  - `PRIMARY_USER_PHONE` (її): `+380...`
  - `BACKUP_USER_PHONE` (твій): `+380...`

- [ ] **Перевірити її iPhone налаштування** (зробите при першому використанні):
  - Settings → Focus → дозволити сповіщення з Air Guard навіть у Do Not Disturb
  - У Telegram → Notifications для бота → найгучніший звук
  - Якщо є Apple Watch: дозволити сповіщення в Watch app

---

## Step 5: Старт нової сесії Claude Code

- [ ] Відкрити https://code.claude.com
- [ ] Створити **нову сесію** на репозиторії `air-guard-bot`
- [ ] Гілка: `main` або створити `claude/air-guard-v1`
- [ ] У перше повідомлення вставити **повний вміст файлу `MASTER_PROMPT.md`** (з цієї папки)
- [ ] Дочекатись поки Claude розгорне фундамент (Week 1 step 1-2 за одну сесію зробить)
- [ ] Коли скаже "потрібен .env" — створити локально (НЕ комітити!) з усіма зібраними ключами зі Step 2

---

## Step 6: Перевірка `.env` перед запуском

Перед першим запуском перевір що в `.env` заповнені:

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
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_FROM_NUMBER`
- [ ] `PRIMARY_USER_PHONE`
- [ ] `BACKUP_USER_PHONE`
- [ ] `TURBOSMS_TOKEN`

**Порожні OK на старті:**
- `PRIMARY_USER_ID`, `BACKUP_USER_ID` — заповняться автоматично після `/im_yozhyk` та `/im_mishka`
- `NEPTUN_API_KEY` — коли отримаєш

---

## Step 7: Перший запуск і реєстрація ролей

1. Підняти бот на VPS через `docker-compose up -d`
2. Перевірити `docker logs airguard` — має бути "Telethon connected", "Bot started"
3. У Telegram написати боту `/start` від ежика
4. Вона: `/im_yozhyk <код>` — отримує "Привіт, ежик! Зареєстровано як primary."
5. Ти: `/start`, потім `/im_mishka <код>` — реєстрація backup
6. **Видалити з `.env` рядки `ROLE_CODE_YOZHYK` і `ROLE_CODE_MISHKA`** (single-use захист)
7. Перевірити `/whoami` від обох
8. Тестове `/sos` від ежика — має прийти карта з укриттями

---

## Step 8: Налаштування sticker pack

- [ ] У Telegram написати `@stickers`
- [ ] `/newpack`
- [ ] Назва: `Air Guard Alerts`
- [ ] Додати стікери по списку з `MASTER_PROMPT.md` секція "Sticker Pack Manifest"
  - Готові Lottie анімації можна взяти з https://lottiefiles.com (фільтр по licensing → free for commercial)
  - Або згенерувати через AI tools (Lottie Generator) і доробити в After Effects
- [ ] Після створення пака отримати `file_id` для кожного стікера (через `@stickerinfobot` або власний бот команду)
- [ ] Внести `file_id` у `src/air_guard/bot/stickers.py`

---

## Step 9: Створити власну сирену (опціонально)

- [ ] Згенерувати .mp3 з кастомним звуком тривоги через OpenAI TTS + наклад siren sample
- [ ] Надіслати один раз ежику в Telegram
- [ ] Вона: довге натиснення на повідомлення → "Зберегти для сповіщень"
- [ ] У Telegram налаштуваннях бота вибрати цей звук
- [ ] Тест: попросити бота надіслати тестовий IMMEDIATE → перевірити звук

---

## Step 10: Тестування на безпечному сценарії

- [ ] **Тестовий IMMEDIATE** (бот має команду `/test_alert` яку видаляємо в production):
  - Перевірити швидкість прильоту повідомлення
  - Перевірити inline-кнопки (тапнути "Я в укритті" → отримати auto-reaction)
  - Перевірити voice call escalation (натиснути нічого, чекати 30 сек)
- [ ] **Тестовий PRE-ALERT** (через fake event у логи)
- [ ] **Тестовий weekly digest** (`/digest`)
- [ ] **Тестовий /sos** — має показати укриття на карті

---

## Operational Routine

**Раз на тиждень:**
- Перевірити `/latency_stats` — p95 має бути < 3 сек
- Перевірити логи watchdog — не було downtime
- Перевірити баланси: Twilio, TurboSMS, Anthropic, OpenAI

**Раз на місяць:**
- Поповнити що треба
- Переглянути логи помилок vision (можливо нові формати картинок з'явились)
- Оновити blacklist каналів якщо щось виявилось

---

## У разі проблем

1. **Бот мовчить:** перевір логи `docker logs airguard --tail 100`, перевір що `BOT_TOKEN` валідний
2. **Telethon disconnect:** session файл міг зіпсуватись, видалити і перелогінитись
3. **Vision повертає 429:** перевищили rate limit, перевір `data/cache/` чи кеш працює
4. **SMS не приходять:** перевір баланс TurboSMS, перевір що номер у форматі `+380...`
5. **Voice call падає:** перевір що `TTS_CDN_BASE_URL` доступний публічно для Twilio

**Аварійний контакт:** якщо бот лежить >5 хв і watchdog SMS не прийшов — пиши прямо у Claude Code в новій сесії: "бот лежить, лог такий-то, фікс". Помічу за 2-3 хв.
