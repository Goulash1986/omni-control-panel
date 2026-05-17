# Air Guard Bot — Master Build Prompt

> Вставь этот файл целиком как первое сообщение в новой Claude Code сессии на репозитории `air-guard-bot`.

---

## КОНТЕКСТ И МИССИЯ

Собери Telegram-бот «Air Guard» — персональный агрегатор информации о воздушных угрозах для одного человека, живущего в Дніпрі, Новокодацький район, ж/м Червоний Камінь, вул. Савкіна 6, 2 під'їзд, кв. 59, 6 поверх.

**Это life-safety система.** Война в Україні триває, Дніпро регулярно зазнає атак шахедів, крилатих ракет, балістики. Новокодацький район неодноразово був під ударами (підтверджено: жовтень 2024, січень 2026, квітень 2026). Кожна секунда затримки до укриття — це 50 метрів польоту шахеда (180 км/год = 50 м/с).

**Користувачі:** двоє, у двох ролях:
- **«ежик» (primary)** — отримувачка всіх сповіщень
- **«мишка» (backup)** — отримує копії IMMEDIATE + ескалації, коли вона не відповідає

**Принципи (в порядку важливості):**
1. **Швидкість доставки** > точність аналітики. Краще "є щось підозріле" за 1 сек, ніж точний діагноз за 10 сек.
2. **Польза** > стилізація. У IMMEDIATE-повідомленнях спочатку дія, потім тепло.
3. **Чесність** > впевненість. Коли confidence низький — пишемо "можливо", а не "точно".
4. **Резервування** > економія. **Telegram — єдиний канал доставки у v1**, але в межах Telegram множимо способи привернути увагу: sticker + текст + voice note + повторні повідомлення + ескалація до backup-користувача. _Зовнішні дзвінки (Plivo/Twilio) і SMS архітектурно НЕ використовуємо у v1 — увімкнемо тільки якщо досвід покаже що Telegram-only недостатньо._
5. **Спостережність** > "віримо що працює". Self-watchdog обов'язковий.
6. **Backup-як-співпілот** > backup-як-резерв. Мишка бачить все що відбувається з ежиком (з тихими push'ами щоб не турбувати її), має повну адмін-панель для моніторингу здоров'я системи і поповнення балансів.

---

## СТЕК (verified May 2026)

- **Python 3.13** (production-recommended; 3.14 теж стабільний для нового коду)
- **uv** (https://docs.astral.sh/uv/) — пакетний менеджер замість pip/poetry, у 10–100 разів швидше
- **aiogram 3.28.2+** — відправка повідомлень. **Важливо:** прямі kwargs `parse_mode`/`disable_web_page_preview`/`protect_content` для `Bot()` deprecated — використовувати `DefaultBotProperties`
- **Telethon 1.43.0** — читання Telegram-каналів від user-session. **⚠️ Репозиторій архівований у Feb 2026** — поки що працює, MTProto стабільний, але в v2 планувати міграцію на **Pyrogram** або pure-aiogram
- **anthropic SDK 0.102.0+** — Claude Haiku 4.5 (`claude-haiku-4-5`) для vision-аналізу карт. **Обов'язково** prompt caching (90% економії на повторюваних system prompts і fixtures)
- **google-genai 2.3.0+** — Gemini 2.5 Flash-Lite (`gemini-2.5-flash-lite`) для vision race з Claude. **Важливо:** новий пакет, **НЕ** застарілий `google-generativeai`
- **openai SDK 2.37.0+** — `gpt-4o-mini-tts` для генерації .ogg voice messages у Telegram (НЕ для зовнішніх дзвінків — їх немає)
- **elevenlabs SDK** — для голосу персони "Мишка" українською у Telegram voice messages (значно краща якість ніж OpenAI). Instant Voice Clone або Professional Voice Clone
- _Зовнішні voice-дзвінки (Plivo/Sinch/Twilio): **НЕ використовуємо у v1**. Фокус на Telegram-native ескалацію._
- _SMS-провайдер: **НЕ використовуємо у v1**. `transport/sms.py` — stub_
- **httpx[http2] 0.28+** — REST API. HTTP/2 включити через `pip install httpx[http2]` (обов'язково для concurrent calls до alerts.in.ua, DTEK, ElevenLabs)
- **websockets 13+** — alerts.in.ua WebSocket, Dron Alerts SSE
- **aiosqlite 0.22.1** — БД (дедуплікація, історія, кеш)
- **Pillow 12.2.0** + **py-staticmaps** (flopp/py-staticmaps на GitHub) — рендеринг карт. Старий `staticmap` low-maintained, **не використовувати**
- **pydantic 2.13.3+** — конфіги і типізація
- **structlog 25.5.0** — JSON-логи
- **prometheus_client** — метрики латентності
- **age** (https://age-encryption.org) — шифрування backup'ів
- **docker compose v2** — деплой
- **pytest + pytest-asyncio** — тести

---

## СТРУКТУРА ПРОЕКТУ

```
air-guard-bot/
├── pyproject.toml
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── README.md
├── config/
│   ├── sources.yaml
│   ├── user.yaml
│   ├── home_layout.yaml
│   ├── safety_circle.yaml
│   └── blacklist.yaml
├── data/
│   ├── dnipro_locations.yaml
│   ├── dnipro_geo.geojson         # райони + ж/м (Overpass dump)
│   ├── shelters_dnipro.geojson    # укриття (Diia/OSM dump)
│   └── eta_table.yaml             # pre-computed ETA від відомих точок запуску
├── src/
│   └── air_guard/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── ingest/
│       │   ├── telegram_reader.py
│       │   ├── alerts_api.py
│       │   ├── neptun_client.py
│       │   ├── dron_alerts_sse.py
│       │   ├── yasno_blackout.py
│       │   ├── open_meteo_wind.py
│       │   └── observer_reports.py
│       ├── pipeline/
│       │   ├── hot_path.py
│       │   ├── pre_alert.py
│       │   ├── image_analyzer.py       # multi-LLM race
│       │   ├── text_parser.py
│       │   ├── geo_matcher.py
│       │   ├── classifier.py
│       │   ├── trajectory.py
│       │   ├── wind.py
│       │   ├── deduplicator.py
│       │   ├── multi_threat_routing.py
│       │   ├── router.py
│       │   └── checkin.py
│       ├── bot/
│       │   ├── sender.py
│       │   ├── live_dashboard.py
│       │   ├── commands.py
│       │   ├── formatter.py
│       │   ├── templates.py
│       │   ├── circle.py
│       │   ├── post_event.py
│       │   └── sos.py
│       ├── transport/
│       │   ├── telegram_pool.py
│       │   ├── sms.py
│       │   └── telegram_escalation.py
│       ├── storage/
│       │   ├── db.py
│       │   ├── cache.py
│       │   └── metrics.py
│       ├── geo/
│       │   ├── geocoder.py
│       │   ├── locations.py
│       │   ├── shelters.py
│       │   └── routing.py
│       └── llm/
│           ├── claude_client.py
│           ├── gemini_client.py
│           └── openai_tts.py
├── watchdog/
│   ├── main.py                     # запускається на ОКРЕМОМУ VPS
│   ├── notify.py
│   └── Dockerfile
└── tests/
    ├── conftest.py
    ├── test_hot_path_latency.py
    ├── test_deduplicator.py
    ├── test_geo_matcher.py
    ├── test_text_parser.py
    ├── test_trajectory.py
    ├── test_formatter.py
    └── fixtures/
        └── sample_messages.json
```

---

## ДЖЕРЕЛА (config/sources.yaml)

```yaml
# Tier 1: GOV (officially confirmed, highest confidence)
gov_sources:
  - name: alerts_in_ua
    type: rest_polling                       # ⚠️ WebSocket НЕ існує у 2026; тільки polling
    base_url: https://api.alerts.in.ua
    poll_endpoint: /v1/iot/active_air_raid_alerts_by_oblast.json
    poll_interval_sec: 30                    # серверний cache TTL ~30s, частіше марно
    oblast_uid: 9                            # Дніпропетровська область
    hromada_uid: null                        # ВЕРИФІКУВАТИ через /v1/alerts/active.json при першому старті
    api_token_env: ALERTS_IN_UA_TOKEN
    auth_method: bearer_header               # Authorization: Bearer <token>
    sdk: "alerts-in-ua"                      # офіційний Python SDK (AsyncClient)
    event_types: ["air_raid", "artillery_shelling", "urban_fights", "chemical", "nuclear"]
    tier: gov
    confidence: 0.99
    rate_limit: "8-10 req/min/IP (soft), 12 hard"
    # ⚠️ ВАЖЛИВО: alerts.in.ua НЕ розрізняє balistic/UAV/cruise як окремі events!
    # Балістика та КАБ детектяться ВИКЛЮЧНО через OSINT-канали (Tier 2-3)
  - name: dnipropetrovsk_ova
    type: telegram_channel
    username: "dnipropetrovsk_ova"  # ВЕРИФІКУВАТИ актуальний username
    tier: gov
    confidence: 0.99
  - name: kpszsu
    type: telegram_channel
    username: "kpszsu"
    tier: gov
    confidence: 0.97

# Tier 2: VERIFIED OSINT (real-time positional data)
verified_realtime:
  - name: neptun
    type: api_or_sse                 # уточнити endpoint у саппорті neptun.in.ua
    url: tbd
    tier: verified_osint
    confidence: 0.95
    role: primary_positional
    process_images: true
  - name: dron_alerts
    type: sse
    url: tbd                         # дослідити DevTools на dron-alerts mobile API
    tier: verified_osint
    confidence: 0.90
  - name: monitor_ukraine
    type: telegram_channel
    username: "monitor_ukraine"
    tier: verified_osint
    confidence: 0.85
    process_images: true

# Tier 3: OSINT (Telegram channels)
osint_channels:
  - username: "dnipro_alerts"
    weight: 1.0
    pre_filtered: true               # уже локалізовано на Дніпро
    process_images: true
    tier: osint
    confidence: 0.80
  - username: "zliyEkran"
    weight: 0.8
    pre_filtered: false              # ОБОВ'ЯЗКОВО фільтрувати по Дніпру
    process_images: true             # критично — основна цінність у картах
    require_geo_match: true
    tier: osint
    confidence: 0.75
  - username: "ny_i_dnipro"
    weight: 0.7
    pre_filtered: true
    process_images: true
    tier: osint
    confidence: 0.75
  - username: "operativnoZSU"
    weight: 0.75
    pre_filtered: false
    process_images: false
    tier: osint
    confidence: 0.75

# Tier 4: CROWDSOURCED (low individual confidence, valuable in aggregate)
crowdsourced:
  - name: e_tryvoga_reports
    type: api
    url: tbd
    tier: crowdsourced
    confidence: 0.40
    require_cluster: 3               # ≥3 reports у радіусі 2км за 60 сек

# Context sources (не загрози, контекст)
context_sources:
  - name: dtek_yasno_blackout
    type: rest_polling
    # YASNO API (undocumented but stable, used by ha-yasno-outages HA integration)
    # YASNO — це retail-бренд DTEK; покриває Київ І Дніпро
    primary_url: https://api.yasno.com.ua/api/v1/pages/home/schedule-turn-off-electricity
    secondary_url: https://app.yasno.ua/api/blackout-service/public/shutdowns/regions/{region_id}/dsos/{dso_id}/planned-outages
    component: dnipro                # парсимо `components.dnipro.dailySchedule[<queue>]`
    queue: tbd                       # 1.1 .. 6.2 — УТОЧНИТИ один раз через dtek-dnem.com.ua для вул. Савкіна 6
    auth: none
    poll_interval_min: 30
    fallback: text_scrape_dtek_dnem  # https://www.dtek-dnem.com.ua/ua/shutdowns як другий канал
  - name: open_meteo_wind
    type: rest
    url: https://api.open-meteo.com/v1/forecast
    lat: 48.4647
    lon: 35.0462
    poll_interval_min: 30
  - name: diia_shelters
    type: static_dataset
    source: data/shelters_dnipro.geojson
```

**Anti-disinformation blacklist (config/blacklist.yaml):** ведеться вручну, оновлюється при виявленні скомпрометованих/фейкових каналів. Сповіщення з blacklist джерел ігноруються повністю.

---

## ГЕО-МОДЕЛЬ КОРИСТУВАЧКИ (config/user.yaml)

```yaml
user:
  pet_name: "ежик"
  partner_pet_name: "мишка"
  language_mode: mix                 # факти UA, тепле RU
  home:
    address: "вул. Савкіна 6, кв. 59, Дніпро"
    entrance: 2
    apartment: 59
    floor: 6
    # ЗАДАЧА: при першому запуску геокодувати через Nominatim
    # (https://nominatim.openstreetmap.org/, безкоштовно), кешувати.
    # НЕ хардкодити вслепу.
    lat: null
    lon: null
  district: "Новокодацький"
  microdistrict: "Червоний Камінь"
  radii_meters:
    immediate: 1500
    near: 4000
    district: 10000
  quiet_hours:
    start: "23:00"
    end: "07:00"
    timezone: "Europe/Kyiv"
  efficiency_thresholds:
    low_battery_pct: 20
    critical_battery_pct: 10
```

---

## ПЛАН КВАРТИРИ (config/home_layout.yaml)

```yaml
home_layout:
  safest_spot:
    description: "Ванна, північно-східний кут"
    instructions:
      - "Спиною до несучої стіни"
      - "Ноги до дверей"
      - "Накритись ковдрою, якщо буде осколкове скло"
  grab_bag_location: "Полиця у коридорі, ліворуч від вхідних дверей"
  avoid_zones:
    - "Кухня (плита, газ)"
    - "Вітальня з вікнами на схід"
    - "Балкон"
  shelter_route:
    name: "Підвал б. №17, вул. Білостоцького"
    distance_m: 180
    duration_min: 2
    steps:
      - "Під'їзд → вниз"
      - "Ліворуч у двір"
      - "Повз дитячий майданчик"
      - "Перейти вул. Білостоцького"
      - "Підвал б. №17, синя двері з північного боку"
    door_code: "4561"
    contact_starshyna: "+380..."
```

---

## СЛОВНИК ЛОКАЦІЙ (data/dnipro_locations.yaml)

Створи YAML з усіма районами Дніпра та крупними ж/м. Кожна локація — список усіх написань (укр/рус/сленг/абревіатури). Включити мінімум:

**Райони:**
- Новокодацький (старе: Ленінський): `["Новокодацький", "Новокодацкий", "НКР", "Ленінський", "Ленинский"]`
- Чечелівський: `["Чечелівський", "Чечеловский", "Червоногвардійський", "Красногвардейский"]`
- Шевченківський
- Соборний (старе: Жовтневий)
- Центральний
- Самарський
- Амур-Нижньодніпровський: `["Амур-Нижньодніпровський", "АНД", "Амур", "лівий берег"]`
- Індустріальний

**Мікрорайони:**
- Червоний Камінь (Красний Камінь): `["Червоний Камінь", "Красний Камінь", "Красный Камень", "ж/м Червоний Камінь", "КК", "Камінь"]` → `is_user_microdistrict: true`
- Тополя
- Перемога (Победа)
- Парус
- Сокіл
- Західний (Западный)
- Північний (Северный)
- Лівобережний (всі підрайони)

**Threat keywords:**
- drones: `["шахед", "шахеди", "Shahed", "герань", "Geran", "БпЛА", "безпілотник", "ударний дрон"]`
- missiles: `["ракета", "ракети", "крилата", "крилаті", "Калібр", "Х-101", "Х-555", "Іскандер", "Кинджал", "балістика", "балістична"]`
- kabs: `["КАБ", "керована авіабомба", "FAB"]`

**Direction patterns (regex):**
- `"курсом на (.+)"`
- `"у напрямку (.+)"`
- `"з боку (.+)"`
- `"проходять над (.+)"`
- `"залітають в (.+)"`
- `"пуск[и]? (?:з|із) (.+)"`
- `"над (.+) у напрямку (.+)"`

**Launch origin → ETA таблиця (data/eta_table.yaml):**
```yaml
launch_origins:
  kamianske:        {distance_km: 32,  eta_shahed_min: 10.7, eta_cruise_min: 2.1}
  pavlohrad:        {distance_km: 65,  eta_shahed_min: 21.7, eta_cruise_min: 4.3}
  zaporizhzhia:     {distance_km: 75,  eta_shahed_min: 25.0, eta_cruise_min: 5.0}
  kryvyi_rih:       {distance_km: 145, eta_shahed_min: 48.3, eta_cruise_min: 9.7}
  rf_belgorod:      {distance_km: 380, eta_shahed_min: 126.7, eta_cruise_min: 25.3}
  rf_kursk:         {distance_km: 450, eta_shahed_min: 150.0, eta_cruise_min: 30.0}
  rf_shatalovo:     {distance_km: 520, eta_shahed_min: 173.3, eta_cruise_min: 34.7}
  black_sea_fleet:  {distance_km: 400, eta_cruise_min: 26.7}
```

---

## РОЛІ ТА ПЕРСОНА

### Bootstrap / Role Assignment

`.env`:
```
PRIMARY_USER_ID=        # порожньо при першому старті
BACKUP_USER_ID=
ROLE_CODE_YOZHYK=ежик-савкина-2026   # одноразовий секрет
ROLE_CODE_MISHKA=мишка-2026
```

**Команди:**
- `/start` — якщо роль уже зайнята, відповідь "Цей бот приватний 🐻". Якщо юзер уже зареєстрований — привітання за роллю.
- `/im_yozhyk <code>` — claim primary. Код звіряється, user_id зберігається в БД, hash коду помічається як використаний (single-use НАЗАВЖДИ, навіть якщо `.env` змінено).
- `/im_mishka <code>` — те саме для backup.
- `/whoami` — показати свою роль і час реєстрації.

### Що отримує кожна роль

| Подія | Ежик (primary) | Мишка (backup) |
|---|---|---|
| 🔴 IMMEDIATE | Повне повідомлення + live dashboard + voice call ескалація | Копія + "дублюю тобі" |
| 🟠 HIGH | Повне повідомлення + live dashboard | — |
| 🟡 MEDIUM | Тихе сповіщення | — |
| 🟢 ОТБОЙ + check-in | Просить відповісти "ОК" | — |
| ⚠️ Немає відповіді 5 хв | — | "Ежик не відповіла, подзвони" |
| ☕ Ранковий дайджест | Детальний | Коротка зведення по її району |
| 📅 Тижневий дайджест | Так | — |

### Персона "Мишка" (bot/formatter.py)

**Принципи, вшити як коментарі в коді:**

1. У IMMEDIATE/HIGH повідомленнях **користь > стилізація**. Спочатку дія (УКРИТТЯ, ETA, район), потім тепло.
2. Теплі звертання ("ежик", "маленька", "люблю") — **тільки у MEDIUM/LOW/відбій/дайджест**.
3. Мова: **факти** (назви районів, типи загроз) — українською. **Звертання і тепло** — російською.
4. Підпис `— М.` або `— М. 🐻` тільки у MEDIUM/LOW/відбій. У IMMEDIATE підпису немає.
5. Жодного спаму emoji. Один статусний на початку (🔴🟠🟡🟢☕) + 🐻 у підписі MEDIUM/LOW.
6. Коли confidence low — "можливо", "є інформація", **не** категорично "летить".

**Шаблони (bot/templates.py, Jinja2):**

`immediate.j2`:
```
🔴 ЕЖИК, В УКРЫТИЕ!
{{ threat_type }} курсом на {{ district }}, ~{{ eta_min }} мин.
{{ home_layout.safest_spot.description }} → подальше от окон.
Я с тобой. — М. 🐻
```

`high.j2`:
```
🟠 Ежик, движение в районе.
{{ threat_count }} {{ threat_type }} {{ from_direction }} курсом на {{ to_direction }},
могут пройти над {{ user_microdistrict }} через ~{{ eta_min }} мин.
Собирай документы, готовься в укрытие. — М.
```

`medium.j2`:
```
🟡 Ежик, тревога по области.
{{ threat_type }} в {{ oblast }}, далеко от тебя.
Просто чтоб ты знала. — М.
```

`all_clear.j2`:
```
🟢 Отбой, маленькая.
Можно выдохнуть. Как ты? Напиши «ОК» 🐻
— М.
```

`morning.j2`:
```
Доброе утро, ежик ☀️
За ночь: {{ alert_count }} тревог (всего {{ total_duration }}), {{ impact_summary }}.
Сейчас спокойно. Люблю. — М.
```

`mishka_copy.j2`:
```
🔴 Брат, у ежика IMMEDIATE.
{{ threat_type }} на {{ district }}, ETA ~{{ eta_min }} мин.
Жду от неё «ОК» после отбоя — если 5 мин тишины, напишу.
```

`mishka_escalation.j2`:
```
⚠️ Ежик не ответила «ОК» 5 минут после отбоя.
Последняя угроза была в её районе ({{ microdistrict }}).
Позвони ей.
```

**Тести (tests/test_formatter.py):**
- IMMEDIATE ніколи не містить "ежик" у першому рядку
- IMMEDIATE містить дію (укриття/коридор/ванна) та ETA
- Назви районів залишаються українською
- Mishka_escalation спрацьовує строго після 5 хв тиші від primary після події ≥ HIGH

---

## ТИПИ ЗАГРОЗ — ПРОФІЛІ ТА ОБРОБКА

**Це КРИТИЧНА секція.** Шахеди, крилаті ракети та балістика мають радикально різні часові вікна. Універсальна обробка для всіх типів — небезпечна помилка.

### Таблиця профілів загроз (Дніпро як ціль)

| Тип | Походження | Швидкість | ETA до Дніпра | Вікно реакції | Escalation |
|---|---|---|---|---|---|
| **Shahed-136/131** | РФ, ЧФ, Крим | 180 км/год | 30-90 хв | Довге — хвилини-десятки хвилин | Fire-and-update (звичайний потік) |
| **Крилаті (Х-101, Х-555, Калібр)** | Бомбардувальники Ту-95/160, ЧФ | 800-900 км/год | 20-50 хв | Середнє — хвилини | Прискорена ескалація, voice call за 15 сек |
| **Балістика (Іскандер-М)** | Бєлгород, Курськ, Брянськ | 2000+ км/год | **5-10 хв** | **30-90 секунд** | INSTANT max, паралельно все |
| **Кинджал (гіперзвук)** | МіГ-31К повітряний пуск | 4000+ км/год (Mach 10) | **5-8 хв** | **<60 секунд** | INSTANT max, паралельно все |
| **КАБ (УМПК-планер)** | Бєлгород, дальність зростає | 900 км/год планування | 6-12 хв | Коротке | INSTANT |
| **Х-22/Х-32 (надзвукові)** | Ту-22М3 | 3500-4000 км/год | 8-15 хв | Дуже коротке | INSTANT |

### Спеціальна обробка балістики та гіперзвуку

**Балістика та Кинджал ламають звичайний flow.** У нас немає 30 секунд щоб чекати read_status — потрібно блискавично паралельно зробити ВСЕ:

```python
async def handle_ballistic_threat(threat):
    """ПАРАЛЕЛЬНО, без очікувань."""
    await asyncio.gather(
        play_loud_sticker_first(threat),       # ~200ms — eye-catching first
        send_telegram_immediate(threat),       # ~500ms — main alert text + map
        send_voice_note_immediate(threat),     # ~1-2s — TTS .ogg в чаті
        start_telegram_escalation_loop(threat),# ~0ms — фоновий task для повторних повідомлень
        broadcast_to_circle(threat),           # ~1s — family circle
        log_metrics(threat),
        # External voice calls (Plivo/Sinch) — DISABLED in v1
        # SMS (TurboSMS) — DISABLED in v1
    )
```

**Окремий шлях `pipeline/ballistic_path.py`:**

```python
BALLISTIC_PATTERNS = [
    r"балістик[аи]",
    r"швидкісн[аіо].*ціль",
    r"іскандер",
    r"іскандер.*М",
    r"швидкісна\s*ціль",
    r"балістична\s+загроза",
    r"пуск.*Бєлгород.{0,30}на",
    r"висока\s+швидкість",
    r"ЗРГК.*мах",
    r"Кинджал",
    r"гіперзвук",
    r"МіГ-31К.*пуск",
    r"супер.{0,5}звуков",
]

# alerts.in.ua має окремий event "ballistic_started" для деяких областей
# (інтегрувати окремою підпискою, треба свій handler)
```

**⚠️ Виправлення по типах подій (verified May 2026):** alerts.in.ua **НЕ розрізняє** ballistic, UAV, cruise як окремі event types. Public API має лише 5 типів:
- `air_raid` (загальна повітряна тривога)
- `artillery_shelling`
- `urban_fights`
- `chemical`
- `nuclear`

**Висновок:** ballistic/UAV/cruise/KAB granularity ми отримуємо **ВИКЛЮЧНО з OSINT-каналів** (kpszsu, monitor_ukraine, dnipro_alerts), парсячи текст постів. У `pipeline/ballistic_path.py` тригер — це не event від alerts.in.ua, а спрацювання `BALLISTIC_PATTERNS` regex по тексту OSINT-повідомлення з UA-офіційних чи перевірених джерел.

### Шаблон для балістики

`ballistic.j2`:
```
🚨🚨🚨 БАЛІСТИКА НА ОБЛАСТЬ
ЛЯГАЙ ПІД СТІНУ ВЖЕ.
Ванна → коридор → подалі від скла.
У тебе <2 хвилини.
Дзвоню зараз. — М.
```

(Жодних "ежик", жодного "будь ласка". Це **наказ для виживання**.)

### Шаблон для крилатих ракет

`cruise_missile.j2`:
```
🟠 РАКЕТА на Дніпро
{count} крилатих ракет курсом з {origin}.
ETA: ~{eta_min} хв.
Готуй укриття зараз. Я слідкую. — М.
```

### Шаблон для КАБ

`kab.j2`:
```
🔴 КАБ на Дніпро
Зафіксовано скид з {origin}, дальність {distance_km} км.
ETA: ~{eta_min} хв (планує без двигуна).
В укриття, низько до підлоги. — М.
```

### Pre-alert patterns для ракет (pipeline/pre_alert.py)

Додати до patterns:
```python
MISSILE_PRE_ALERT_PATTERNS = [
    # Зліт стратегічної авіації — попередження за 4-6 годин
    r"Ту-95(?:МС)?.*зліт",
    r"Ту-160.*зліт",
    r"стратегічна\s+авіація.*бойовий\s+курс",
    r"носії.*крилатих.*на\s+бойовий",

    # Підготовка МіГ-31К — попередження за 30-60 хв до Кинджала
    r"МіГ-?31К.*зліт",
    r"носії\s+Кинджалів",

    # Заходи на пуски з ЧФ
    r"носії\s+(?:Калібрів|крилатих).*в\s+морі",
    r"з\s+(?:акваторії|району)\s+Чорного\s+моря.*готовність",

    # Балістика — короткий PRE-ALERT (за хвилини до пуску)
    r"загроза\s+пуск[іу]?в?.*балістик",
]
```

При спрацьовуванні стратегічної авіації → `STRATEGIC_AVIATION_ALERT` (новий рівень, м'якший але важливий):

```
🟡 ЇЖАЧКУ, увага на ніч
Зафіксовано зліт стратегічної авіації РФ ({aircraft_type}).
Орієнтовно через 4-6 годин можливі масовані пуски крилатих ракет.
Підзаряди телефон, поприбирай воду в укритті. Я тут. — М.
```

### Telegram escalation — диференціація за типом

```python
# t0 = час відправки першого alert. Інтервал між sticker → бустер → emergency bot → backup ping.
ESCALATION_INTERVALS = {
    # Звичайний: 15s → 30s → 45s → 60s → 120s
    ThreatType.SHAHED: [15, 30, 45, 60, 120],
    # Прискорений
    ThreatType.SHAHED_JET: [10, 20, 30, 45, 75],
    ThreatType.CRUISE_MISSILE: [10, 20, 30, 45, 75],
    ThreatType.KAB: [5, 10, 20, 35, 60],
    # Максимальний: emergency bot + backup ping паралельно з first alert
    ThreatType.BALLISTIC: [0, 0, 0, 10, 30],
    ThreatType.KINZHAL: [0, 0, 0, 5, 20],
    ThreatType.X22: [0, 0, 0, 10, 30],
}
```

Для балістики / Кинджала / Х-22 emergency bot і backup ping **летять паралельно з першим alert** (intervals = [0, 0, 0, ...]). Часу на чекання реакції немає — кидаємо все одразу.

### ETA таблиця розширена за типами

`data/eta_table.yaml`:
```yaml
launch_origins:
  kamianske:
    distance_km: 32
    eta_shahed_min: 10.7
    eta_cruise_min: 2.1
    eta_ballistic_min: 0.96
  pavlohrad:
    distance_km: 65
    eta_shahed_min: 21.7
    eta_cruise_min: 4.3
    eta_ballistic_min: 1.95
  zaporizhzhia:
    distance_km: 75
    eta_shahed_min: 25.0
    eta_cruise_min: 5.0
    eta_ballistic_min: 2.25
  rf_belgorod:
    distance_km: 380
    eta_shahed_min: 126.7
    eta_cruise_min: 25.3
    eta_ballistic_min: 11.4
    eta_kab_min: 25.3       # КАБ з УМПК-200 планує ~25 хв на 380км
  rf_kursk:
    distance_km: 450
    eta_shahed_min: 150.0
    eta_cruise_min: 30.0
    eta_ballistic_min: 13.5
  rf_voronezh:
    distance_km: 480
    eta_cruise_min: 32.0
    eta_kinzhal_min: 7.2     # МіГ-31К може пускати з ~500км
  rf_shatalovo:
    distance_km: 520
    eta_shahed_min: 173.3
    eta_cruise_min: 34.7
  black_sea_fleet:           # позиція флоту змінюється, орієнтовно
    distance_km: 400
    eta_cruise_min: 26.7
    eta_caliber_min: 26.7
  caspian_sea_fleet:
    distance_km: 1100
    eta_cruise_min: 73.3
```

### Хитка межа: інтерсепти

Не всі ракети долітають. ЗРК-комплекси Patriot, NASAMS, IRIS-T можуть збивати крилаті ракети та балістику (Patriot — балістику). Для бота це означає:

```python
# В dashboard поки status = APPROACHING, окремо моніторимо джерела
# про збиття: "збито", "ППО спрацювала", "знищено"
INTERCEPT_PATTERNS = [
    r"збито\s+(?:над|у|в)\s+",
    r"ППО.*знищило",
    r"роботу\s+ППО.*чути",
    r"перехоплено",
]

# Якщо для активної загрози прийшло підтвердження intercept у її напрямку:
# state → INTERCEPTED, dashboard оновлюється
```

`intercepted.j2`:
```
🟢 Збито!
{threat_type} на {district} перехоплено ППО.
Все ще в укритті — можуть бути уламки. Сиди ще ~10 хв.
— М. 🐻
```

---

## АНІМОВАНІ СТІКЕРИ ТА ВІЗУАЛЬНА МОВА

**Плоскі emoji — base level. Для life-safety бота потрібен власний візуальний мовний шар** який моментально читається без читання тексту.

### Стратегія

1. **Власний sticker pack** через `@stickers` — Air Guard branded анімований набір
2. **Sticker-first delivery** для IMMEDIATE/HIGH — стікер прилітає першим, чіпляє око, потім текст з картою
3. **Tier-specific visual cue** — кожен тип загрози має унікальний стікер
4. **Video stickers (.webm)** для CRITICAL — 3-сек агресивна анімація з рухом
5. **Кастомні емодзі в caption** — premium фіча, бот з Telegram Premium може використовувати custom emoji ID у тексті

### Sticker Pack Manifest

Створити пак `Air Guard Alerts` через `@stickers`:

| Trigger | Стікер | Формат | Опис |
|---|---|---|---|
| Tier-0 alerts.in.ua | `SIREN_ROTATING` | .webm video | Червона сирена з обертанням, спалахи, 2 сек loop |
| IMMEDIATE shahed | `DRONE_INCOMING_RED` | .tgs Lottie | Шахед з траєкторією та emerald glow, рух праворуч-наліво |
| IMMEDIATE cruise | `MISSILE_RED` | .tgs | Ракета з димовим слідом, пульсація |
| IMMEDIATE ballistic | `BALLISTIC_PULSE` | .webm | Червоний трикутник попередження, потужна пульсація |
| IMMEDIATE Kinzhal | `HYPERSONIC` | .webm | Швидкісна анімація з motion blur |
| HIGH approaching | `RADAR_SWEEP` | .tgs | Радарний крутіж з точкою цілі |
| MEDIUM | `WARNING_AMBER` | .tgs | Жовтий трикутник пульсує м'яко |
| ALL CLEAR | `SHIELD_GREEN_PULSE` | .tgs | Зелений щит пульсує спокійно |
| PRE-ALERT | `WATCHFUL_EYE` | .tgs | Око, повільно блимає |
| Check-in OK | `BEAR_HEART` | .tgs | Мишка з серцем — ваш брендований |
| Voice call dispatched | `PHONE_RING` | .tgs | Телефон, що дзвонить |
| Family circle ping | `CIRCLE_PEOPLE` | .tgs | Силуети людей в колі |
| INTERCEPTED | `SHIELD_BLOCK` | .tgs | Щит відбиває ракету, золотий спалах |
| STRATEGIC AVIATION ALERT | `BOMBER_WATCH` | .tgs | Силует Ту-95, попередження |

**Створення:** альо `@stickers` боту, `/newpack`, додати кожний стікер як .tgs або .webm. Lottie файли можна згенерувати з After Effects через плагін `bodymovin`, або взяти готові з LottieFiles (https://lottiefiles.com) і адаптувати.

**Готові вільні Lottie ресурси:** lottiefiles.com має тисячі вільних анімацій, шукати по тегах: `siren`, `warning`, `alert`, `shield`, `radar`, `missile`.

### Integration в код

```python
# bot/stickers.py
class StickerPack:
    SIREN_ROTATING = "CAACAgIAA..."  # file_id після завантаження пака
    DRONE_INCOMING_RED = "CAACAgIAB..."
    MISSILE_RED = "CAACAgIAC..."
    BALLISTIC_PULSE = "CAACAgIAD..."
    # ... etc

STICKER_BY_THREAT = {
    (ThreatType.SHAHED, Priority.IMMEDIATE): StickerPack.DRONE_INCOMING_RED,
    (ThreatType.CRUISE_MISSILE, Priority.IMMEDIATE): StickerPack.MISSILE_RED,
    (ThreatType.BALLISTIC, Priority.IMMEDIATE): StickerPack.BALLISTIC_PULSE,
    (ThreatType.KINZHAL, Priority.IMMEDIATE): StickerPack.HYPERSONIC,
    (ThreatType.KAB, Priority.IMMEDIATE): StickerPack.MISSILE_RED,
    # ...
}

async def send_alert_with_sticker(threat, message_text, keyboard):
    """Sticker first (миттєвий візуал), потім повний alert."""
    sticker_id = STICKER_BY_THREAT.get(
        (threat.type, threat.priority),
        StickerPack.WARNING_AMBER
    )
    # Стікер летить першим
    sticker_task = asyncio.create_task(
        bot.send_sticker(chat_id, sticker=sticker_id)
    )
    # Текст з картою — секундою пізніше
    text_task = asyncio.create_task(
        bot.send_photo(chat_id, photo=map_image,
                       caption=message_text,
                       reply_markup=keyboard)
    )
    await asyncio.gather(sticker_task, text_task)
```

### Custom Emoji в caption (Telegram Premium)

Якщо у бота Premium-статус — можна використовувати custom emoji у тексті:

```python
from aiogram.types import MessageEntity

caption = "🚨 БАЛІСТИКА У ТЕБЕ"
entities = [
    MessageEntity(
        type="custom_emoji",
        offset=0,
        length=2,  # "🚨"
        custom_emoji_id="5429499720313853312"  # ID анімованого custom emoji
    )
]
await bot.send_message(chat_id, text=caption, entities=entities)
```

Custom emoji ID можна отримати з готових Telegram-наборів через `@PremiumBot` або зробити свій набір (потрібен Telegram Premium).

### Live Dashboard з анімацією

У `editMessageMedia` міняється тільки картинка. Анімація досягається тим, що **сама картинка-карта стає GIF або WebP з рухом** — стрілка-курс блимає, дрон-маркер пульсує. Pillow → анімований WebP:

```python
# bot/map_renderer.py
def render_animated_threat_map(threat, frames=8) -> bytes:
    """Створює анімований WebP з пульсацією маркера загрози."""
    images = []
    for i in range(frames):
        opacity = 0.4 + 0.6 * abs(math.sin(i * math.pi / frames))
        img = render_base_map()
        draw_threat_marker(img, threat.position,
                          opacity=opacity, size=10 + i % 4)
        draw_user_home(img)
        images.append(img)
    buf = io.BytesIO()
    images[0].save(buf, format="WEBP", save_all=True,
                   append_images=images[1:], duration=100, loop=0)
    return buf.getvalue()
```

WebP анімація працює в Telegram inline, виглядає як живе радар-око.

### Background tinting (тонування фону повідомлення)

Telegram дозволяє фон повідомлень через HTML-розмітку обмежено (через `quote` блоки з кольором у деяких клієнтах). Альтернатива — **prefix-рядок з кольоровою стрічкою**:

```
▓▓▓ 🔴 IMMEDIATE 🔴 ▓▓▓
ЕЖИК, В УКРЫТИЕ!
...
```

Графічно виглядає як червона стрічка, помітна навіть у preview без розкривання.

### Reactions auto-pinning

Бот може автоматично ставити реакцію 👍 коли вона тапнула "Я в укритті":

```python
@router.callback_query(F.data.startswith("safe:"))
async def on_safe(call):
    await bot.set_message_reaction(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        reaction=[ReactionTypeEmoji(emoji="🛡")]
    )
```

Візуально підтверджує що клік пройшов — менше тривоги.

### Notification sound (через клієнт)

Telegram не дозволяє боту керувати звуком (це налаштування user-side). Але можна **підготувати інструкцію** у `/start`:

```
Налаштування звуку (один раз):
1. Відкрий цей чат → ⋯ → Сповіщення
2. Звук → обери НАЙГОЛОСНІШИЙ варіант (Bamboo або custom)
3. Імпорт звуку → завантаж my_siren.mp3 (надсилаю далі)
4. На iPhone: Налаштування → Зосередження → дозволити цей чат у Do Not Disturb
5. Apple Watch: дозволити нотифікації цього чату
```

Можемо ще згенерувати кастомний .mp3 звук тривоги через OpenAI TTS + наклад сирени, надіслати ОДИН раз як файл, вона додає в Telegram.

### Голосові алерти в самому повідомленні

Бот може надсилати **голосове повідомлення** (.ogg) разом з alert — Telegram автоматично робить превью з кнопкою play, але також **на iOS показує duration в notification**, що візуально виділяється.

```python
# В hot path для CRITICAL:
voice_message = await openai_tts_ukrainian(
    "Тривога. Шахед на Червоний Камінь. Негайно в укриття."
)
await bot.send_voice(chat_id, voice=voice_message, duration=4)
```

Це створює гібрид — vibrate + текст + голос за один push.

---

## АРХІТЕКТУРА КОНВЕЄРА

```
[SOURCES] → [HOT PATH ≤2s] → [ENRICHMENT 1-3s] → [LIVE DASHBOARD 5s ticks] → [DELIVERY]
                ↓
        [STATE MACHINE per threat]
                ↓
        [CHECK-IN logic]
```

### 1. Hot Path (pipeline/hot_path.py)

**ПРИНЦИП №1:** У IMMEDIATE-шляху **заборонені** LLM-виклики, vision, БД-записи, синхронні HTTP. Тільки in-memory lookup і async fire-and-forget відправка.

**ПРИНЦИП №2:** Fire-and-update. Перше повідомлення — мінімальний текст за <2 сек. Уточнення з картою/ETA — окреме повідомлення через 3-5 сек. Якщо уточнення спростовує — третє "відбій".

```python
# In-memory структура
HOT_TRIGGERS = {
    "user_microdistrict_aliases": frozenset([...]),
    "user_district_aliases": frozenset([...]),
    "threat_keywords": frozenset([...]),
}

def check_hot(text: str) -> Priority | None:
    """Returns priority in <1ms"""
    tokens = set(text.lower().split())
    has_threat = bool(HOT_TRIGGERS["threat_keywords"] & tokens)
    has_micro = bool(HOT_TRIGGERS["user_microdistrict_aliases"] & tokens)
    has_district = bool(HOT_TRIGGERS["user_district_aliases"] & tokens)
    if has_threat and has_micro:
        return Priority.IMMEDIATE
    if has_threat and has_district:
        return Priority.HIGH
    return None  # піде звичайним шляхом
```

Викликається **першим** при отриманні будь-якого повідомлення з Telegram. До всього іншого.

### 2. Tier-0 шорткат (alerts.in.ua REST polling)

**⚠️ Виправлення:** alerts.in.ua **НЕ має WebSocket** (verified May 2026). Використовуємо REST polling.

Polling `/v1/iot/active_air_raid_alerts_by_oblast.json` з інтервалом **30 секунд** (серверний cache TTL = 30s, частіше марно). При першому виявленні `air_raid: true` для oblast UID 9 (Дніпропетровська) → **hardcoded** message без жодної обробки за <500ms:

```
🔴 ТРИВОГА на Дніпропетровщину. В укриття!
```

Далі вже підтягуються деталі з OSINT.

**Polling-діаграма:**
```python
async def alerts_in_ua_poller():
    last_state = False
    async with httpx.AsyncClient(http2=True, timeout=5.0) as client:
        while True:
            t0 = time.monotonic()
            try:
                r = await client.get(
                    f"{BASE}/v1/iot/active_air_raid_alerts_by_oblast.json",
                    headers={"Authorization": f"Bearer {TOKEN}"}
                )
                state = parse_oblast(r.text, oblast_uid=9)
                if state and not last_state:
                    await fire_immediate_tier0()  # <<<<< Tier-0 fire
                elif not state and last_state:
                    await fire_all_clear()
                last_state = state
            except Exception as e:
                logger.warning("alerts_poll_failed", error=str(e))
            elapsed = time.monotonic() - t0
            await asyncio.sleep(max(30 - elapsed, 5))
```

**⚠️ Latency caveat:** з polling 30s наш Tier-0 може запізнитись до **30 секунд** vs справжня подія. Тому Tier-0 — це **підстраховка**, а основний детект IMMEDIATE йде через **hot path по OSINT-каналах** (фактично 1-3 секунди від публікації постy в каналі).

### 3. Pre-Alert from Launch Detection (pipeline/pre_alert.py)

Паттерни в усіх каналах:
```python
PRE_ALERT_PATTERNS = [
    r"(?:масовий|груповий) пуск (\d+)?\s*шахед",
    r"зафіксовано пуск[и]? з (?:Шаталово|Кром|Приморсько-Ахтарськ|Брянськ|Бєлгород|Курськ)",
    r"багатоцільові БпЛА.{0,30}напрямок Україна",
    r"стратегічна авіація.{0,30}на бойовому курсі",
]
```

При спрацьовуванні:
- Lookup origin в `eta_table.yaml` → дистанція до Дніпра, ETA
- Якщо ETA ∈ [30, 90] хв → шлемо PRE_ALERT з інструкціями підготовки
- Запускаємо підвищений моніторинг (vision на ВСІ image у цьому каналі, не лише filtered)

PRE_ALERT шаблон:
```
🟡 ЇЖАЧКУ, ПОПЕРЕДЖЕННЯ
Зафіксовано пуск {count} {threat_type} з {origin}.
Можуть бути над Дніпром через ~{eta_min} хв ({arrival_time}).

Рекомендую:
  • Зарядити телефон до 100%
  • Підготувати укриття (вода, светр, ліки)
  • Перевірити повербанк

Слідкую, повідомлю при наближенні. — М.
```

### 4. Multi-LLM Vision Race (pipeline/image_analyzer.py)

```python
async def analyze_image_race(img_bytes: bytes, prompt: str) -> VisionResult:
    """Race Gemini Flash-Lite vs Claude Haiku, return first."""
    tasks = [
        asyncio.create_task(gemini_analyze(img_bytes, prompt)),
        asyncio.create_task(claude_analyze(img_bytes, prompt)),
    ]
    done, pending = await asyncio.wait(
        tasks, return_when=asyncio.FIRST_COMPLETED, timeout=1.5
    )
    for task in pending:
        task.cancel()
    if not done:
        return VisionResult.empty(reason="all_providers_timeout")
    return done.pop().result()
```

Vision prompt просить JSON:
```
{
  "is_threat_map": bool,
  "mentioned_districts": [],
  "mentioned_microdistricts": [],
  "mentioned_directions": [],
  "threat_types": ["shahed" | "missile" | "kab" | "ballistic"],
  "estimated_count": int,
  "raw_text_in_image": "",
  "confidence": 0.0-1.0
}
```

Кеш по sha256 картинки — одну картинку не аналізувати двічі.

### 5. Text Parser + Geo Matcher

- Витягуємо threat_keywords, locations (з резолвом аліасів у canonical), напрямки, час.
- Скоринг релевантності:
  - microdistrict збіг → +100
  - district збіг → +50
  - сусідній район → +20
  - тільки місто → +10
  - напрямок "сюди" (на її район) → +30

### 6. Wind-Adjusted Trajectory (pipeline/wind.py + trajectory.py)

```python
async def get_wind() -> WindData:
    """open-meteo.com, кеш 30 хв"""
    ...

def compute_trajectory_cone(
    origin_point: GeoPoint,
    direction_deg: float,
    threat_type: ThreatType,
    minutes: list[int],     # [1, 3, 5, 10]
    wind: WindData,
) -> list[Polygon]:
    """
    Повертає список полігонів — конус можливих позицій
    через 1, 3, 5, 10 хвилин з урахуванням вітру.
    Ширина конусу: ±15°/хв базова, + wind_drift_angle.
    """
    ...
```

ETA до її точки — діапазоном, не точкою: "5-9 хв", не "7 хв".

### 7. Deduplicator + Cross-Validation

```python
# Дедуплікація: hash нормалізованого опису події (тип + район + час до 2 хв), вікно 15 хв.
# При повторі — НЕ слати нове, оновити існуюче з приміткою "✓ підтверджено @canal" і підняти confidence.

def compute_confidence(sources: list[Source]) -> float:
    if any(s.tier == "gov" for s in sources):
        return 0.99
    base = max(s.confidence for s in sources)
    if len(sources) >= 2:
        base = min(base + 0.10, 0.95)
    return base
```

### 8. Multi-Threat Routing (pipeline/multi_threat_routing.py)

Якщо активних загроз ≥ 2:
- Для кожного шляху до укриття обчислюємо мін.дистанцію до будь-якого threat cone
- Обираємо maximum_safety route
- В IMMEDIATE: "Не йди через X — там можливий приліт. Йди через Y."

### 9. Priority Router

```python
class Priority(Enum):
    IMMEDIATE = 100   # score ≥ 100 OR ETA < 5 хв OR microdistrict
    HIGH      = 50    # score ≥ 50 OR district
    MEDIUM    = 20    # score ≥ 20
    LOW       = 0
```

Дії за пріоритетом:
- **IMMEDIATE**: миттєво, disable_notification=false, повтор через 30 сек якщо read_status не прийшов; voice call через 30 сек (10 сек у quiet hours)
- **HIGH**: миттєво, звичайне push, live dashboard
- **MEDIUM**: миттєво, тихе push (vibrate)
- **LOW**: у дайджест кожні 30 хв

---

## LIVE THREAT DASHBOARD (bot/live_dashboard.py)

**Killer feature.** Одне Telegram-повідомлення = одна активна загроза, оновлюється `editMessageMedia` кожні 5 сек.

```python
class LiveThreatDashboard:
    threat_id: UUID
    message_id: int         # для editMessage
    chat_id: int
    started_at: datetime
    last_updated: datetime
    state: ThreatState       # PRE_ALERT, APPROACHING, IN_AREA, LEAVING, RESOLVED
    threat: ThreatObject
    update_task: asyncio.Task
```

**Lifecycle:**

1. `ThreatDetector` створює `LiveThreatDashboard`, шле перше повідомлення з гучним push.
2. Запускається `update_task`: кожні 5 сек:
   - Отримує свіжу позицію з усіх джерел
   - Перемальовує карту
   - Перечитує state
   - Якщо state перейшов в `IN_AREA` (раніше був `APPROACHING`) → **нове повідомлення** з push, старе edit з поміткою "↓ оновлене"
   - `editMessageMedia` з новою картою + новий caption з ETA
3. На state=`RESOLVED`: фінальний edit "✅ Загроза пройшла", cancel voice call schedule.

**Rate limits Telegram:**
- `editMessage*`: 1/сек на повідомлення безпечно (API дозволяє 30/сек/чат)
- Нове повідомлення не частіше ніж раз у 30 сек без поважної причини (FloodWait risk)

**Caption template для IN_AREA:**
```
🔴🔴🔴 ШАХЕД У ТВОЄМУ РАЙОНІ
Координати: над Червоним Каменем
Висота: ~500м | Курс: 270° (на захід)
Оновлено: 23:47:18 (5 сек тому)
Залишилось до тебе: ~0.8 км

[🏠 Я в укритті] [🚶 Виходжу] [❗ Без зв'язку]
```

**Caption template для APPROACHING:**
```
🟠 Шахед курсом на Дніпро
Зараз: над Кам'янським (32 км)
Швидкість: ~180 км/год | Курс: схід (на тебе)
ETA до твого району: 8-12 хв
Оновлено: 23:38:42
Джерела: NEPTUN ✓ @kpszsu ✓ (2/2)

[🏠 Готуюсь до укриття] [👁 Стежу]
```

State-transition коротко в caption:
- `"🟡→🟠 Підтверджено другим джерелом, підвищую пріоритет."`
- `"🟠→🔴 Курс підтверджений на твій район!"`

---

## MAP RENDERER (bot/map_renderer.py)

Stack: `Pillow + staticmap` (cached OSM tiles).

**Шари (малюються в порядку):**
1. Базова карта OSM (зум 11 для огляду області, 14 для району)
2. Полігон Дніпропетровської області (тонка обводка)
3. Полігон м. Дніпро
4. Полігон району Новокодацький (напівпрозора зелена заливка)
5. Полігон ж/м Червоний Камінь (зелена обводка)
6. Концентричні кола 1/3/5 км від дому
7. Маркер дому (🏠 зелений)
8. Маркери укриттів у радіусі 500м (синій щит)
9. Маркери загроз (🔴 зі стрілкою напрямку)
10. Конус прогнозованих позицій (якщо є дані)
11. Підпис з ETA + час оновлення
12. Footer: "© OpenStreetMap contributors | Air Guard | приблизне положення"

Кеш згенерованих карт по hash події — 1 година.

**Геодані:** `data/dnipro_geo.geojson` (Overpass-запит виконати при першому старті, зберегти локально):
```overpassql
[out:json];
(relation["admin_level"="6"]["name"="Дніпро"];
 relation["admin_level"="9"]["place"="suburb"](area:dnipro););
out geom;
```

---

## SHELTER OVERLAY + ROUTING (geo/shelters.py + geo/routing.py)

Завантажити один раз з Diia / OSM:
```overpassql
[out:json];
(node["amenity"="shelter"]["shelter_type"="basement"](area:dnipro);
 way["amenity"="shelter"](area:dnipro););
out geom;
```

В `geo/routing.py`:
- Для кожного alert обчислюємо 3 найближчі укриття (по евклідовій дистанції)
- Для кожного — pedestrian route через OSRM (https://router.project-osrm.org) або вшитий граф OSM
- Виводимо найближче з timing: `"Найближче укриття: вул. Білостоцького 17, 180м, ~2 хв пішки"`
- У multi-threat сценарії — обираємо маршрут з max safety (не перетинає threat cones)

---

## TELEGRAM-ONLY ESCALATION (transport/telegram_escalation.py)

**Контекст:** у v1 ми **не використовуємо зовнішні дзвінки** (Plivo/Sinch/Twilio) і **не використовуємо SMS**. Весь шлях ескалації — у Telegram. Це проектне рішення: простіше, дешевше, надійніше, повністю в наших руках. Trade-off: якщо її телефон у silent mode або вона не дивиться екран — все одно дізнається через haptic Apple Watch або через backup-користувача (Мишку), який отримує сигнал паралельно і може фізично подзвонити їй з власного телефону.

### Багатоканальність у межах Telegram

При IMMEDIATE паралельно прилітають **5 окремих push-подій** на її телефон — кожна triggerить vibration + sound:

1. **Sticker** (анімований SIREN_ROTATING або BALLISTIC_PULSE) — миттєво, eye-catching
2. **Текстове повідомлення** з картою + ETA + інструкцією + inline-кнопками
3. **Voice message (.ogg)** — TTS українською "Тривога. Шахед на Червоний Камінь. Негайно в укриття." — на iOS показує duration у push, vibrate feels like incoming call
4. **Окремий emergency bot** (другий бот!) шле дублюючий alert — у нього на її телефоні окремі notification settings зі звуком що не приглушується
5. **Backup-користувач (Мишка) отримує паралельну копію** — він фізично може подзвонити їй якщо не реагує

### Workflow (для IMMEDIATE / Ballistic)

```python
# src/air_guard/transport/telegram_escalation.py

async def start_telegram_escalation_loop(threat: Threat):
    """
    Telegram-native ескалація. Викликається fire-and-forget з hot path.
    Зупиняється коли primary тапнула будь-яку inline-кнопку або відписала.
    """
    event_id = threat.id
    primary_chat = settings.PRIMARY_USER_ID
    backup_chat = settings.BACKUP_USER_ID
    
    # t=0: первинний alert вже відправлений з hot_path
    
    # t=15s: якщо не було interaction → бустер
    await asyncio.sleep(15)
    if await user_interacted(event_id):
        return
    await bot.send_sticker(primary_chat, sticker=StickerPack.SIREN_ROTATING)
    await bot.send_message(
        primary_chat,
        "🔴 Ежик, отзовись. Получила сообщение?",
        reply_markup=alert_keyboard(event_id)
    )
    
    # t=30s: voice message (TTS), якщо немає реакції
    await asyncio.sleep(15)
    if await user_interacted(event_id):
        return
    voice_ogg = await render_tts_ogg(
        f"Ежик, тревога. Шахед на Червоный Камень, осталось {threat.eta_min} минут. "
        f"Ответь Мишке."
    )
    await bot.send_voice(primary_chat, voice=voice_ogg, duration=6)
    
    # t=45s: emergency bot — другий бот з іншими notification settings
    await asyncio.sleep(15)
    if await user_interacted(event_id):
        return
    await emergency_bot.send_sticker(primary_chat, sticker=EmergencyPack.RED_FLASH)
    await emergency_bot.send_message(
        primary_chat,
        f"🚨🚨🚨 ЕЖИК, СРОЧНО ОТВЕТЬ\n{threat.summary}",
        reply_markup=alert_keyboard(event_id)
    )
    
    # t=60s: ping backup (Мишка) щоб він подзвонив фізично
    await asyncio.sleep(15)
    if await user_interacted(event_id):
        return
    await bot.send_message(
        backup_chat,
        f"⚠️ <b>Ежик 60 сек не реагує на alert</b>\n\n"
        f"Загроза: {threat.summary}\n"
        f"ETA: {threat.eta_min} хв\n\n"
        f"📞 Подзвони їй з власного телефону: <code>{settings.PRIMARY_USER_PHONE}</code>\n"
        f"Якщо не відповість — телефонуй сусідам або 102.",
        parse_mode="HTML",
    )
    
    # t=120s: пінгуємо весь family circle
    await asyncio.sleep(60)
    if await user_interacted(event_id):
        return
    await broadcast_to_family_circle_urgent(threat)


async def user_interacted(event_id: str) -> bool:
    """True якщо primary тапнула кнопку або написала в чат за останні N секунд."""
    last_action = await db.get_last_interaction(
        user_id=settings.PRIMARY_USER_ID,
        since=event_started_at(event_id),
    )
    return last_action is not None
```

### Що рахується "interaction"

- Тапнула будь-яку inline-кнопку на alert (callback_query)
- Написала будь-яке текстове повідомлення в чат бота (звичайний message)
- Надіслала reaction до alert-повідомлення
- Викликала /safe, /sos, /im_safe команду
- Прочитала повідомлення (немає, бо Bot API не дає read receipts) → не використовуємо

### Чому два боти

**Primary bot** (`@AirGuard_bot`) — повсякденні notification, користувачка налаштовує звичайний push.

**Emergency bot** (`@AirGuard_SOS_bot`) — тільки IMMEDIATE/Ballistic, в його чаті користувачка налаштовує **максимально гучний звук + ігнорування DND + critical Focus exception**. Це обхід обмеження що один бот не може примусово розпушити повідомлення goлосніше за свою стандартну notification config.

Окрема перевага: якщо primary bot тимчасово залочений Telegram'ом (FloodWait, banned) — emergency bot все одно достукається.

### Voice message generation

```python
# src/air_guard/llm/openai_tts.py
async def render_tts_ogg(text: str, voice_id: str = None) -> bytes:
    """
    Генерує .ogg (OPUS) voice message для Telegram.
    Telegram автоматично показує duration у push нотифікації.
    """
    if settings.ELEVENLABS_API_KEY and voice_id:
        # Українська якісна — голос персони Мишки
        audio = await elevenlabs.generate(
            text=text,
            voice=voice_id,
            model="eleven_multilingual_v2",
            output_format="opus_48000_128",
        )
    else:
        # Fallback OpenAI — теж працює, гірше з українською
        response = await openai_client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="nova",
            input=text,
            response_format="opus",
        )
        audio = response.content
    return audio
```

### iOS налаштування користувача (one-time, після Step 8 setup)

Інструкція летить ежику автоматично після `/im_yozhyk`:

```
Ежик, налаштуй iPhone один раз — щоб мене точно почути.

Для головного бота (@AirGuard_bot):
1. Settings → Focus → Sleep → People & Apps → Allow Notifications From → додай мене
2. Settings → Focus → Do Not Disturb → те саме
3. Telegram → відкрий мій чат → ⋯ → Notifications:
   • Sound: HighestVolume.m4a (надішлю далі окремим файлом)
   • Importance: Loud
4. Apple Watch app → Notifications → Telegram → Mirror iPhone Alerts

Для emergency бота (@AirGuard_SOS_bot):
1. Telegram → відкрий чат з ним → ⋯ → Notifications:
   • Sound: Sirene.m4a (надішлю)
   • Importance: ⚠️ MAXIMUM, override silent mode (на iOS це робиться через Focus exception)
2. Settings → Focus → ALL profiles → People & Apps → дозволь і цього бота окремо

Готово. /test_alert щоб перевірити що чути.
```

### Quiet hours політика (без зовнішніх дзвінків)

```python
QUIET_HOURS_ESCALATION = {
    Priority.IMMEDIATE: "full_escalation",  # quiet hours ігноруються повністю
    Priority.BALLISTIC: "full_escalation",
    Priority.HIGH:      "full_escalation",
    Priority.MEDIUM:    "delay_until_morning",
    Priority.LOW:       "skip_until_morning_digest",
}
```

В quiet hours емоції повідомлень м'якіші, але **IMMEDIATE / Ballistic ніколи не відкладаються** — там йде повний ескалаційний ланцюг.

### Чого свідомо немає у v1

| Канал | Чому ні |
|---|---|
| Зовнішні voice-дзвінки (Plivo/Sinch/Twilio) | Складність + $12/міс + ризик невірно зрозумілої IVR + UA-провайдери можуть блокувати. Заміна — emergency bot з гучним звуком + backup-користувач як людина-диспетчер |
| SMS (TurboSMS) | Не покриває блекаут краще ніж Telegram з power bank. Якщо мобільна мережа лежить — SMS теж не дойдут |
| Email | Якщо вона дивиться email коли йде під удар — щось не так. Корисно тільки для тебе як адміна (watchdog email-alert) |
| WhatsApp | Не використовує |
| Apple Push прямі | Потребує власний iOS додаток, $99/рік developer account, складність — не варто |
| Голосові виклики через Telegram Voice | Бот не може ініціювати voice call (це фіча user-to-user) |

### Майбутнє розширення (v2 якщо знадобиться)

Якщо досвід v1 покаже що ескалації в Telegram недостатньо (наприклад, є реальний випадок коли вона не отримала alert вчасно), додаємо:

1. Plivo + Sinch active-active voice (повертаємось до архітектури яку обговорювали раніше)
2. SMS-провайдер як третій канал
3. Apple Watch standalone з cellular + спеціальний WatchOS додаток

Це **opt-in розширення**, не дефолт. До v2 — Telegram-only.

---

## SMS FALLBACK (DISABLED IN v1 — архітектура збережена для майбутнього)

**Статус:** не використовуємо у v1. Створи `transport/sms.py` як **stub-модуль** з NotImplementedError, але інтерфейс задокументований — щоб коли захочемо увімкнути, не переписувати router.

```python
# src/air_guard/transport/sms.py
class SMSProvider:
    """Stub. Активуй коли буде потреба у SMS-fallback.

    Можливі провайдери для +380 (на момент v1 не інтегровано):
    - TurboSMS (https://turbosms.ua)
    - SMS Fly (https://sms-fly.ua)
    - Kyivstar SMS API (для ФОП)
    """
    async def send(self, phone: str, text: str) -> None:
        raise NotImplementedError("SMS disabled in v1")
```

**Чому без SMS у v1:**
- Telegram (primary bot + emergency bot + voice .ogg + backup-користувач) достатньо для primary escalation у v1
- SMS додає $5/міс і операційні складнощі (баланси, верифікація провайдера)
- Telegram-канал до Мишки як backup escalation покриває сценарій "ежик не відповіла"

**Коли увімкнути SMS:** якщо буде досвід де Telegram + voice call провалилися одночасно. Тоді — повертаємось і активуємо.

---

## LIVE LOCATION SHARING (bot/live_location.py)

**Контекст:** ежик не завжди вдома. Вона їздить на роботу, до батьків, у парк, у магазин. Якщо ETA до загрози розраховуємо тільки від домашньої точки — отримуємо хибну картину. Telegram має built-in **Live Location**, який стрімить її координати ботові кожні N секунд протягом 8 годин (по 8 годин з продовженням).

### Як це працює

1. **Ежик** у Telegram-чаті з ботом тапає 📎 (скрепка) → Location → **Share My Live Location** → обирає тривалість (15 хв / 1 год / 8 год / forever)
2. **Бот** отримує message з полем `location.live_period` > 0 — це початок стріму
3. Далі кожні **15-90 секунд** (Telegram сам вирішує частоту залежно від руху і батареї) приходить **edited** version того ж message з оновленою позицією
4. Коли період закінчується або вона зупинила share — приходить final edited message з `live_period = 0`

### Реалізація

```python
# src/air_guard/bot/live_location.py
from aiogram import Router, F
from aiogram.types import Message

router = Router()

@router.message(F.location.live_period > 0)
async def on_live_location_start(msg: Message):
    """Ежик увімкнула live location."""
    user_id = msg.from_user.id
    if user_id != settings.PRIMARY_USER_ID:
        return
    await db.upsert_live_location(
        user_id=user_id,
        message_id=msg.message_id,
        lat=msg.location.latitude,
        lon=msg.location.longitude,
        live_period_end=now() + timedelta(seconds=msg.location.live_period),
        heading=msg.location.heading,
        horizontal_accuracy=msg.location.horizontal_accuracy,
    )
    district = await reverse_geocode_district(
        msg.location.latitude, msg.location.longitude)
    if district != settings.user.district:
        await msg.reply(
            f"Бачу тебе у <b>{district}</b>, ежик. "
            f"Перемикаю моніторинг сюди на {format_duration(msg.location.live_period)}. "
            f"— М. 🐻",
            parse_mode="HTML")

@router.edited_message(F.location.live_period > 0)
async def on_live_location_update(msg: Message):
    """Telegram прислав свіжу позицію (стрім автоматичний)."""
    user_id = msg.from_user.id
    if user_id != settings.PRIMARY_USER_ID:
        return
    await db.update_live_location(
        user_id=user_id,
        lat=msg.location.latitude,
        lon=msg.location.longitude,
        heading=msg.location.heading,
    )
    # Перевіряємо чи перетнула district boundary
    new_district = await reverse_geocode_district(
        msg.location.latitude, msg.location.longitude)
    last_district = await db.get_last_known_district(user_id)
    if new_district != last_district:
        await bot.send_message(
            user_id,
            f"📍 Бачу що ти переїхала в <b>{new_district}</b>. "
            f"Моніторю цей район. — М.",
            parse_mode="HTML")
        await db.set_last_known_district(user_id, new_district)

@router.edited_message(F.location.live_period == 0)
async def on_live_location_stop(msg: Message):
    """Live period закінчився або вона зупинила share."""
    await db.deactivate_live_location(msg.from_user.id)
    # Не пишемо нічого — щоб не нав'язуватись. Просто переключаємось назад на home.
```

### Як це впливає на ETA-розрахунок

```python
# src/air_guard/pipeline/router.py
async def compute_threat_eta(threat: Threat) -> ThreatRouting:
    """Якщо є активна live location — використовуємо її, інакше — home."""
    primary_pos = await get_current_position(settings.PRIMARY_USER_ID)
    # get_current_position: live_location якщо активна і свіжа (<2 хв), 
    # інакше fallback на home_coords з config
    
    eta_min, eta_max = compute_eta_range(
        from_point=threat.last_known_position,
        to_point=primary_pos,
        threat_type=threat.type,
        wind=await get_wind(),
    )
    nearest_shelter = await find_nearest_shelter(primary_pos)
    return ThreatRouting(eta=(eta_min, eta_max), shelter=nearest_shelter, ...)
```

### Контекстуальні сповіщення на основі позиції

- При IMMEDIATE: маршрут і ETA рахуються **від її поточної позиції**, не від дому
- Шаблон у IMMEDIATE: `"Ежик, ти зараз у Тополі — найближче укриття 80м праворуч за супермаркетом АТБ"`
- Якщо вона їде у транспорті (швидкість >20 км/год) — інше повідомлення: `"Ежик, ти у транспорті. Скажи водієві зупинитись біля найближчого підвалу. Найближчий — через 200 м"`
- Якщо вона ходить пішки в небезпечному районі — нагадування про укриття на маршруті

### Privacy і безпека

- Координати live location зберігаються **тільки в RAM + поточна позиція в SQLite**, історію руху НЕ логуємо
- Old positions purge через 24 години
- В жодних публічних логах, скріншотах, бекапах не з'являються її координати у відкритому вигляді
- Backup `airguard.db` шифрується через `age` (вже задокументовано)

### Команда `/share_location_request`

Бот може **попросити** ежика поділитись live location:

```python
@router.message(Command("share_location_request"))
async def request_location(msg: Message):
    """Адмін-команда — Мишка просить ежика увімкнути live location."""
    if msg.from_user.id != settings.BACKUP_USER_ID:
        return
    await bot.send_message(
        settings.PRIMARY_USER_ID,
        "🐻 Ежик, Мишка просить тебе увімкнути 📍 Live Location "
        "(тільки до вечора, не назавжди). Це допоможе мені краще "
        "тебе берегти. Тап скрепку → Location → Share My Live Location."
    )
```

Вона сама вирішує погодитись чи ні. Бот **не може** примусово увімкнути її геолокацію — це привілей користувача.

---

## ZONE MONITORING (bot/zones.py)

**Контекст:** окрім поточної геолокації, корисно мати **постійні зони моніторингу** — місця де ежик буває регулярно (робота, дім батьків, тренажерка). Бот моніторить загрози не тільки для її поточної точки, а й для всіх її zone-маркерів і попереджає коли там стає небезпечно.

### Типи зон

```python
class ZoneType(Enum):
    HOME = "home"                  # 1 зона, з config/user.yaml
    WORK = "work"                  # 1 зона, типово 9-18 weekdays
    PARENTS = "parents"            # дім батьків, на вихідні
    FRIEND = "friend"              # дім подруги
    GYM = "gym"                    # фітнес
    SHOP = "shop"                  # типовий магазин
    CUSTOM = "custom"              # будь-що
```

### Структура зон у БД

```python
class Zone(BaseModel):
    id: UUID
    user_id: int                   # primary або backup
    type: ZoneType
    name: str                      # "Робота", "Мама", "Дача"
    geometry: ZoneGeometry         # circle або polygon
    active: bool
    monitoring_schedule: ScheduleRule  # коли активне
    notify_threshold: Priority     # від якого пріоритету сповіщати

class ZoneGeometry(BaseModel):
    type: Literal["circle", "polygon"]
    circle_center: GeoPoint | None
    circle_radius_m: int | None
    polygon_points: list[GeoPoint] | None
```

### Створення зони — варіанти UX

**Варіант 1: швидко через 📎 location:**
```
Ежик надсилає звичайний (не live) location через 📎
↓
Бот пропонує:
[➕ Додати як зону]
↓
[🏢 Робота] [👵 Батьки] [🏋️ Спортзал] [✏️ Своє ім'я]
↓
[🔵 Коло 500м] [🔵 Коло 1км] [🔷 Намалювати область (Web App)]
```

```python
@router.message(F.location & ~F.location.live_period)
async def on_static_location(msg: Message):
    """Звичайний (не live) location → пропонуємо створити зону."""
    if msg.from_user.id not in [settings.PRIMARY_USER_ID, settings.BACKUP_USER_ID]:
        return
    await msg.reply(
        "Додати цю точку як зону моніторингу?",
        reply_markup=zone_creation_keyboard(
            lat=msg.location.latitude,
            lon=msg.location.longitude,
        )
    )
```

**Варіант 2: Telegram Web App для малювання полігонів** (premium UX):
```python
@router.message(Command("set_zone"))
async def set_zone_wa(msg: Message):
    await msg.reply(
        "Намалюй зону на карті:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🗺 Відкрити карту",
                web_app=WebAppInfo(url=f"{TWA_BASE_URL}/zones/draw"
                                       f"?user={msg.from_user.id}")
            )
        ]])
    )
```

Telegram Web App (TWA) — це HTML+JS додаток який відкривається у нативному Telegram. У ньому Leaflet/MapLibre з можливістю малювати полігон, обмежити радіус, потім "Save" повертає координати у бот.

### Команди

- `/zones` — список зон з статусом (активна/ні, остання активність)
- `/zone_add <name>` + надіслати location у відповідь
- `/zone_remove <id>`
- `/zone_pause <id>` — призупинити моніторинг тимчасово
- `/zone_show <id>` — карта з границями зони

### Як зона впливає на сповіщення

```python
# pipeline/router.py
async def compute_priority_for_user(threat: Threat, user_id: int) -> Priority:
    """Враховуємо ВСІ активні зони користувача, не тільки поточну позицію."""
    base = base_priority_for_district(threat, user_id)
    
    active_zones = await db.get_active_zones(user_id, at_time=now())
    for zone in active_zones:
        if zone_intersects_threat(zone, threat):
            zone_priority = priority_for_zone(threat, zone)
            base = max(base, zone_priority)
    
    return base
```

**Приклад сценарію:** ежик у себе в Червоному Камені, але її мама зараз у Тополі. У Тополі IMMEDIATE загроза. Тоді:
- Для ежика — звичайний MEDIUM (загроза далеко від неї)
- Але оскільки **зона "Мама" перетинається з загрозою** — окреме сповіщення:
  ```
  ⚠️ Ежик, у Тополі IMMEDIATE — там зараз твоя мама.
  Подзвони їй, переконайся що вона в укритті.
  Її зона активна до 21:00. — М.
  ```

### Polygon area selection (на майбутнє через Web App)

Стандарт OSM полігона у GeoJSON форматі:
```python
class PolygonZone(ZoneGeometry):
    type: Literal["polygon"] = "polygon"
    polygon_points: list[GeoPoint]  # обхід проти годинникової стрілки
    
    def contains(self, point: GeoPoint) -> bool:
        """Точка всередині полігона (ray-casting)."""
        ...
    
    def intersects_with(self, other: PolygonZone | CircleZone) -> bool:
        """Перетин з threat cone або іншою зоною."""
        ...
```

### Auto-zones з routine

Якщо `config/user.yaml` має `routine.work_location` — автоматично створюється `WORK` зона з graceful timing (Mon-Fri 9-18). Те саме для `weekend_locations`.

---

## ADMIN MIRROR MODE (bot/admin_mirror.py)

**Контекст:** backup-користувач (Мишка) — це не просто другорядний отримувач alert'ів, а **співпілот системи**. Він повинен бачити все що відбувається з primary (ежиком): її команди, її геолокацію, її дії в боті, її статуси, навіть її повідомлення в чат з ботом. Без цього він не може ні допомогти, ні діагностувати проблему, ні фізично подзвонити їй вчасно.

**Принципи:**
1. **Прозоро для primary** — ежик у `/start` та `/help` бачить що backup є співпілотом і має доступ до її активності. Це не таємне стеження.
2. **Тихо для primary** — backup отримує мирор-сповіщення з `disable_notification=true` щоб не спричиняти push'ів у ежика. Але отримує їх своєчасно — не з 5-хвилинною затримкою.
3. **Чітко відмежовано** — admin-функції недоступні з акаунта primary. Якщо ежик випадково тапне `/admin` — побачить "Це команда для Мишки 🐻".

### Що дзеркалиться silent для backup

```python
SILENT_MIRROR_EVENTS = {
    "primary_command": "Ежик: {command}",
    "primary_message": "Ежик написала: {text}",
    "primary_callback": "Ежик тапнула: {button_label} (event {event_id})",
    "primary_reaction": "Ежик поставила {emoji} на повідомлення",
    "alert_sent_to_primary": "→ Ежик: {priority} {threat_type}",
    "voice_ogg_sent": "→ Ежик: voice .ogg ({duration}s)",
    "sticker_sent": "→ Ежик: sticker {sticker_name}",
    "zone_added": "Ежик додала зону «{name}» у {district}",
    "zone_removed": "Ежик видалила зону «{name}»",
    "zone_paused": "Ежик призупинила зону «{name}»",
    "live_location_started": "Ежик увімкнула 📍 Live Location ({duration})",
    "live_location_district_change": "Ежик перейшла в {new_district} (з {old_district})",
    "live_location_ended": "Ежик зупинила Live Location після {duration}",
    "circle_member_added": "Ежик додала контакт «{name}» у family circle",
    "circle_member_removed": "Ежик видалила контакт «{name}»",
    "circle_member_replied": "{contact_name} відповіла: {status}",
    "battery_low": "📱 Батарея ежика: {pct}%",
    "battery_critical": "🪫 Батарея ежика КРИТИЧНА: {pct}%",
    "battery_charged": "🔋 Ежик підключила зарядку",
    "primary_idle": "💤 Ежик не активна {duration} (немає взаємодії з ботом)",
    "primary_active_again": "💬 Ежик повернулась (після {duration} тиші)",
    "blackout_scheduled": "⚡ DTEK графік оновлено: {today}",
    "blackout_starting": "⚡ Світло вимикають через {min_to_start} хв (черга {queue})",
    "settings_changed_by_primary": "Ежик змінила: {setting} → {new_value}",
}

LOUD_MIRROR_EVENTS = {
    # Ці події = з push (disable_notification=false), бо потребують уваги backup'а
    "primary_not_responding": "⚠️ Ежик не реагує {duration} після IMMEDIATE",
    "alert_immediate": "🔴 IMMEDIATE → ежик: {threat_type} на {district}",
    "alert_ballistic": "🚨 БАЛІСТИКА → ежик",
    "system_health_alert": "⚠️ {service} лежить >5 хв",
    "balance_critical": "💸 {service} баланс < 3 днів роботи",
}
```

### Реалізація

```python
# src/air_guard/bot/admin_mirror.py

async def mirror_to_backup(event_type: str, payload: dict, silent: bool = True):
    """Дзеркалить будь-яку подію primary у чат backup'а."""
    if not BACKUP_USER_ID:
        return  # backup ще не зареєстрований
    
    template = SILENT_MIRROR_EVENTS.get(event_type) or LOUD_MIRROR_EVENTS.get(event_type)
    if not template:
        logger.warning("unknown_mirror_event", event_type=event_type)
        return
    
    text = template.format(**payload)
    timestamp = datetime.now(KYIV_TZ).strftime("%H:%M:%S")
    formatted = f"<code>{timestamp}</code> {text}"
    
    is_loud = event_type in LOUD_MIRROR_EVENTS
    
    try:
        await bot.send_message(
            BACKUP_USER_ID,
            formatted,
            disable_notification=not is_loud,
            parse_mode="HTML",
        )
    except Exception as e:
        logger.error("mirror_send_failed", error=str(e), event_type=event_type)
        # Не raise — мирор не повинен ламати основний потік
    
    # Завжди логуємо до БД для audit log
    await audit_log.write(
        timestamp=now(),
        actor="primary",
        event_type=event_type,
        payload=payload,
        mirrored=True,
    )


# Hook у кожному відповідному handler'і:
@router.message(F.from_user.id == settings.PRIMARY_USER_ID)
async def on_primary_message(msg: Message):
    # ... обробка для primary ...
    await mirror_to_backup("primary_message", {"text": msg.text or "[non-text]"})


@router.callback_query(F.from_user.id == settings.PRIMARY_USER_ID)
async def on_primary_callback(call: CallbackQuery):
    # ... обробка ...
    await mirror_to_backup("primary_callback", {
        "button_label": call.message.reply_markup.button_by_data(call.data).text,
        "event_id": parse_event_id(call.data),
    })
```

### Як виглядає у чаті Мишки

Окремий чат з botom тільки для admin/mirror подій. Перший рядок кожного запису — час, далі тиха подія:

```
14:23:01  → Ежик: HIGH Шахед
14:23:01  → Ежик: sticker DRONE_INCOMING_RED
14:23:02  → Ежик: voice .ogg (4s)
14:23:18  Ежик тапнула: 🏠 Я в укритті
14:23:18  Ежик поставила 🛡 на повідомлення
14:25:00  Ежик увімкнула 📍 Live Location (60 min)
14:25:08  Ежик перейшла в Чечелівський (з Новокодацький)
14:30:00  📱 Батарея ежика: 18%
14:31:15  🔋 Ежик підключила зарядку
```

Це йде у спеціальний топік або просто звичайним стрімом — як зручніше Мишці.

### Фільтрація шуму

Якщо за добу прилетає >500 silent mirror подій (наприклад, через активну тривалу live location з 15s оновленнями) — bot автоматично переключає live location в **digest mode**: замість кожного оновлення позиції шле раз на 5 хв "Ежик у {district} (~{distance_km}км від дому)".

Бекап може налаштувати через `/admin_filter`:
- `everything` (default)
- `summary` (тільки HIGH/IMMEDIATE + командний підсумок раз на годину)
- `critical_only` (тільки LOUD events)

---

## ADMIN PANEL & BALANCE MANAGEMENT (bot/admin_panel.py)

**Команда `/admin`** — відкриває інтерактивну панель тільки для backup. Це **єдине** перезаписуване повідомлення з `editMessageReplyMarkup` яке оновлюється кожні 30 сек.

```python
@router.message(Command("admin"))
async def show_admin_panel(msg: Message):
    if msg.from_user.id != settings.BACKUP_USER_ID:
        await msg.reply("Це команда для Мишки 🐻")
        return
    
    snapshot = await build_admin_snapshot()
    panel_msg = await msg.reply(
        format_admin_panel(snapshot),
        reply_markup=admin_panel_keyboard(),
        parse_mode="HTML",
    )
    # Запускаємо background update task
    asyncio.create_task(auto_refresh_panel(panel_msg.chat.id, panel_msg.message_id))
```

### Layout панелі

```
🛠 <b>Air Guard Admin Panel</b>
Оновлено: 23:47:18

📊 <b>Сьогодні</b>
• 3 alerts (2 HIGH, 1 IMMEDIATE)
• 2 acked ежиком, 1 ескалувалось до тебе
• Primary last seen: 14 хв тому (Червоний Камінь)
• Battery: 64% (заряджалась о 13:20)
• Live Location: ❌ off (з 20:15)

⚡ <b>DTEK</b>
• Сьогодні: вимкнень не було
• Завтра: 18:00–21:00 (3 год)

💰 <b>Баланси</b>
• Anthropic:  $4.20 ⚠️ (~6 днів)
• OpenAI:     $1.30 ⚠️ (~4 дні)
• ElevenLabs: 8K chars (~3 тижні)
• Hetzner:    OK (автосписання, $7.50 22.05)
• B2:         $0.12 з $5 ліміту

🩺 <b>System health (24h)</b>
• alerts.in.ua: 100% uptime, p95 latency 340ms
• Telegram API: 100%
• YASNO API: 98% (1 fail 03:14, retry ok)
• Vision LLM race: 99.7%, avg 780ms

[💳 Anthropic +$20] [💳 OpenAI +$10]
[🔄 Refresh] [📜 Audit log] [⚙️ Settings]
[🛡 Family circle] [🗺 Зони ежика]
[📡 Sources health] [🧪 /fire_drill]
[📞 Її телефон: tap to call]
```

### Top-up buttons

Кнопки `[💳 Anthropic +$20]` ведуть на URL відповідного провайдера з підготовленим параметром amount:

```python
TOPUP_URLS = {
    "anthropic": "https://console.anthropic.com/settings/billing?topup={amount}",
    "openai":    "https://platform.openai.com/settings/organization/billing/overview?topup={amount}",
    "elevenlabs":"https://elevenlabs.io/app/subscription",
    "hetzner":   "https://accounts.hetzner.com/billing",
    "b2":        "https://secure.backblaze.com/account_settings.htm",
    "stadiamaps":"https://client.stadiamaps.com/account/billing/",
}

def topup_button(service: str, amount: int) -> InlineKeyboardButton:
    url = TOPUP_URLS[service].format(amount=amount)
    return InlineKeyboardButton(
        text=f"💳 {service.title()} +${amount}",
        url=url,
    )
```

Telegram in-app browser відкриває URL → Мишка логіниться (якщо ще ні) → видно форму поповнення з підготовленою сумою → тапає Pay → готово. Не платимо через бота (це додало б compliance-навантаження).

### Балансо-моніторинг (background task)

```python
# src/air_guard/storage/balance_monitor.py

class ServiceBalance(BaseModel):
    service: str
    usd_remaining: float | None
    units_remaining: int | None     # для ElevenLabs (chars), Stadia (tiles)
    burn_rate_per_day: float
    days_remaining: float
    last_checked: datetime
    topup_url: str

async def check_anthropic_balance() -> ServiceBalance:
    # Через Anthropic Admin API: /v1/organizations/usage
    ...

async def check_openai_balance() -> ServiceBalance:
    # /v1/dashboard/billing/credit_grants
    ...

async def check_elevenlabs_balance() -> ServiceBalance:
    # GET /v1/user/subscription
    ...

# Запускається щодня о 09:00
async def daily_balance_audit():
    balances = await check_all_balances()
    await db.save_balance_snapshot(balances)
    
    for b in balances:
        if b.days_remaining < 7:
            await alert_backup_balance_low(b)


async def alert_backup_balance_low(b: ServiceBalance):
    text = (
        f"💸 <b>{b.service}</b> закінчується\n"
        f"Залишок: ${b.usd_remaining:.2f}\n"
        f"Burn rate: ${b.burn_rate_per_day:.2f}/день\n"
        f"Залишилось: <b>~{b.days_remaining:.0f} днів</b>"
    )
    await bot.send_message(
        BACKUP_USER_ID,
        text,
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            topup_button(b.service, 20),
            topup_button(b.service, 50),
        ]]),
        parse_mode="HTML",
    )
```

### Команди адмін-панелі

- `/admin` — головна панель
- `/balances` — детальний breakdown по балансах
- `/audit [N=30]` — останні N подій audit log
- `/audit_filter <type>` — фільтр по типу події
- `/audit_export <from> <to>` — CSV дамп за період
- `/her_status` — все що зараз з ежиком (battery, location, last interaction, active alerts, mood inferred)
- `/sources_health` — uptime/latency кожного API за 24г
- `/circle_full` — повний family circle з статусами і часом останньої перевірки
- `/zones_full` — всі зони ежика з геометрією і активністю
- `/replay <event_id>` — реконструкція минулої події (стікер, повідомлення, ETA, відповідь — все що було)
- `/backup_now` — манульний бекап БД до B2
- `/test_alert <priority>` — синтетичний alert для тесту (видно і ежику)
- `/test_alert_silent <priority>` — тест видимий тільки тобі (для перевірки рендерингу без турбування ежика)
- `/fire_drill` — запустити monthly fire drill зараз
- `/mute_mirror [N]` — приглушити silent mirror на N хв (default 60)
- `/admin_filter <level>` — змінити рівень мирору (everything/summary/critical_only)

---

## AUDIT TRAIL (storage/audit_log.py)

Все що відбувається — пишемо у audit log SQLite таблиці + структуровані JSON-логи. Це джерело правди для:
- `/audit` команди
- Post-event review (`/replay`)
- Compliance/etiquette при спорі
- ML/learning (майбутні фічі типу "smart shelter recommender")

### Schema

```python
class AuditEvent(BaseModel):
    id: UUID
    timestamp: datetime           # UTC
    actor: Literal["system", "primary", "backup", "external_api"]
    actor_id: int | None          # user_id якщо actor=primary/backup
    event_type: str               # "alert_sent", "callback_clicked", тощо
    severity: Literal["debug", "info", "warning", "critical"]
    payload: dict                 # JSON, типізовано по event_type
    related_event_id: UUID | None # для тредінга (alert → callback → reaction)
    threat_id: UUID | None        # якщо подія належить до конкретної загрози
```

### Що логуємо

**Зі сторони системи:**
- Запуск/зупинка бота, реконект Telethon, рестарт alerts polling
- Кожний прийом нового OSINT-повідомлення (з sha256 для dedup)
- Vision-аналіз: початок, кінець, latency, який LLM виграв race, confidence
- Pipeline rivers: decision points (`classified_as=HIGH because reasons=[district_match, threat_keyword]`)
- Backup auto-restored, schema migration applied

**Зі сторони primary:**
- Кожне message/command/callback/reaction
- Live location updates (digest: позиція і час, не raw stream)
- Zone CRUD
- Setting changes

**Зі сторони backup:**
- Admin commands
- Settings змінені через панель
- Topup buttons clicked (without sensitive data)

**Зі сторони external:**
- API errors, rate limits, retries
- Webhook callbacks
- Balance checks results

### Query examples

```bash
# Останні 50 подій
/audit 50

# Тільки те що було з ежиком за останні 2 години
/audit_filter actor=primary since=2h

# Експорт за добу
/audit_export today

# Конкретна загроза end-to-end
/replay abc123  # показує timeline загрози від першого OSINT-сигналу до /safe
```

### Privacy

Audit log зберігає **тільки** дані які корисні для системи. **Жодних** чутливих даних типу:
- Точні координати її live location → пишемо тільки district
- Текст приватних повідомлень → пишемо тільки `[text 42 chars]`, повний текст тільки якщо це команда
- Імена family circle → пишемо тільки `[member_id]`

Audit log шифрується разом з основною БД через `age` під час щоденного бекапу.

### TTL

- Detailed events: 90 днів
- Summary aggregates (для метрик): 2 роки
- Threat replays (`/replay`): 1 рік
- Settings changes: forever (важливо для розслідувань)

---

## ПРЕМІУМ-ФІЧІ (опціональні, для v1.5–v2)

12 ідей розташовані за impact/effort. Обери які активувати в v1, які в v1.5, які залишити для v2.

### 🥇 Tier 1: Найвищий impact, помірний effort

**1. Conversational Mishka chat (`bot/conversation.py`)**
Будь-яке non-command повідомлення від primary не до alert'а → відповідь персони Мишки через Claude Sonnet 4.6 з контекстом останніх 20 повідомлень.
```
Ежик: я устала, опять тревога
Мишка: Тяжелый день, маленькая. Тебе принести чай мысленно?
       Может, поспи 30 минут — я разбужу только если реально серьёзно. 🐻
```
- Stack: Anthropic SDK, prompt з персонажним промптом + last_20_messages context
- Storage: окрема таблиця `conversation_memory` з compressed summaries
- Cost: ~$3-5/міс при помірному вжитку
- Effort: 1 тиждень

**2. Trauma-aware messaging**
Бот стежить за метриками стресу: alerts/day, час відповіді на check-in, частота `/sos`, частота "не отвечала 5 мин" подій. Якщо > поріг → автоматично переключає всі MEDIUM в `extra_gentle` тон, додає рекомендації (дихальна вправа, музика, пропозиція подзвонити Мишці).
- Stack: rolling-window метрики у SQLite
- Effort: 3-4 дні

**3. Threat replay GIF**
Після major event (>= HIGH) — автоматично генерує анімований GIF з рухом загрози по карті Дніпра за останню годину. Можна переглянути, поділитися, обробити емоційно.
- Stack: Pillow animated WebP/GIF з frame-by-frame map snapshots
- Effort: 4-5 днів

### 🥈 Tier 2: Високий impact, більший effort

**4. AI photo assessment**
Ежик надсилає фото підозрілого предмета/звуку/диму → vision LLM аналізує і відповідає: "Це не загроза, це супутник Starlink ✓" або "⚠️ Це може бути уламок — не торкайся, повідом 102".
- Stack: Claude Haiku 4.5 vision з safety-trained prompt
- Cost: ~$1/міс
- Effort: 3 дні

**5. Crisis mode (`/crisis`)**
Ежик або Мишка активує — бот переходить у режим continuous high-priority polling:
- Polling alerts.in.ua: 5s замість 30s
- Всі alerts → IMMEDIATE незалежно від priority
- Quiet hours відключаються
- Voice .ogg повторюється кожну хвилину поки не /safe
- Spike traffic — рахуємо токени щоб не вийти за бюджет
- Effort: 1 тиждень

**6. Smart shelter recommender**
ML над історичними даними: яке укриття ежик реально використовує, в які години, який маршрут найшвидший. Підлаштовує `/sos` рекомендації під її звички.
- Stack: simple decision tree на історії
- Effort: 1 тиждень + 1 місяць збору даних

**7. Weekly podcast**
Кожну неділю 09:00 — Мишка voice (ElevenLabs) читає тижневий дайджест як 3-хвилинний подкаст: скільки було тривог, скільки часу в укритті, як ти трималась, важливі моменти, прогноз на наступний тиждень.
- Stack: ElevenLabs long-form, audio file send як audio (не voice — щоб був з обкладинкою)
- Cost: +$2/міс ElevenLabs
- Effort: 4-5 днів

### 🥉 Tier 3: Корисні, але можна почекати

**8. Document vault (`/docs`)**
Зашифроване сховище її документів: скан паспорта, медична інформація, страховка, контакти лікарів. Доступно через `/docs`. Корисно коли emergency dispatch запитує "групу крові, алергії".
- Stack: age encryption + Telegram file_id storage
- Effort: 3 дні

**9. Battery prediction**
ML на 2-тижневій історії її розрядки/зарядки + DTEK графіки → попередження "за 4 години буде блекаут на 3 години, а у тебе 23% батареї і ти не заряджаєшся — підключи зараз".
- Stack: simple linear regression на time series
- Effort: 1 тиждень

**10. Auto-respond mode**
Коли вона передбачувано зайнята (in transit з motion sensor, у спорті за календарем) — auto-reply на check-in "Дякую, в дорозі до укриття" без потреби тапати. Backup отримує мирор з поміткою [AUTO].
- Stack: iOS Shortcuts integration або Telegram-side heuristic
- Effort: 4-5 днів

**11. Public-friendly Telegram channel**
Окремий канал куди бот шле public-safe статуси: "🟢 Ежик у безпеці", "🟡 Ежик у спостереженні", "🔴 Ежик у тривозі". Без розкриття точної локації. Її друзі/родичі підписуються — отримують спокій без приватних деталей.
- Stack: aiogram channel posting
- Effort: 2 дні

**12. Conversation memory + long-term Mishka**
Доповнення до фічі №1: Мишка пам'ятає попередні розмови, важливі дати, події. "Вчора ти казала що погано спала — як сьогодні було?". Compressed summaries старих розмов через Claude.
- Stack: vector store (sqlite-vec або pgvector у local SQLite extension)
- Cost: +$2/міс vector embeddings
- Effort: 1.5 тижні

---

## INLINE KEYBOARD НА КОЖНОМУ ALERT

```python
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def alert_keyboard(event_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🏠 Я в укритті", callback_data=f"safe:{event_id}"),
            InlineKeyboardButton(text="🚶 Виходжу зараз", callback_data=f"moving:{event_id}"),
        ],
        [
            InlineKeyboardButton(text="❗ Без зв'язку", callback_data=f"offline:{event_id}"),
        ]
    ])
```

**Handlers (bot/commands.py):**
```python
@router.callback_query(F.data.startswith("safe:"))
async def on_safe(call):
    # Лог в БД, повідомлення backup, скасовуємо voice call escalation
    ...
```

---

## КОМАНДИ БОТА

**Базові:**
- `/start` — привітання, перевірка whitelist
- `/im_yozhyk <code>` / `/im_mishka <code>` — claim role
- `/whoami` — поточна роль
- `/help` — повний довідник команд

**Стан і налаштування:**
- `/status` — поточний стан тривоги в області + останні 3 події
- `/sources` — статистика по каналах за 24г
- `/digest` — примусовий дайджест LOW за сьогодні
- `/pause [N]` — пауза LOW/MEDIUM на N хв (default 60)
- `/resume`
- `/silent_night` — режим "тільки IMMEDIATE з 23:00 до 07:00"
- `/battery <pct>` — primary повідомляє рівень батареї

**Безпека і дії:**
- `/sos` — карта з найближчими укриттями + швидкі телефонні посилання
- `/safe` — кнопка "Я в безпеці" → broadcast всім у circle
- `/circle` — карта з усіма у safety circle + їх статуси

**Локація і зони (NEW):**
- 📎 (скрепка) → Location → Share My Live Location — найпростіший спосіб дати боту знати де ти зараз
- 📎 → Location (звичайний, не live) → бот пропонує **створити зону моніторингу**
- `/where` — показати де поточно бачить тебе бот (live location active / fallback to home)
- `/zones` — список твоїх зон з статусом
- `/set_zone` — Telegram Web App для малювання нової зони (полігон/коло)
- `/zone_pause <id>` — призупинити окрему зону
- `/zone_remove <id>` — видалити
- `/share_location_request` — backup просить primary увімкнути live location
- `/work_mode <lat> <lon>` — швидко встановити робочу локацію на сьогодні (без шарінгу live)

**Електрика DTEK/YASNO:**
- `/svitlo` — поточний статус (зараз є / немає) + найближче вимкнення
- `/svitlo_today` — повний графік на сьогодні і завтра timeline
- `/svitlo_diff` — що змінилось у графіку за останні 24г

**Адмін-панель (тільки backup-користувач):**
- `/admin` — інтерактивна панель адміна з auto-refresh
- `/balances` — детальний breakdown балансів усіх сервісів з top-up кнопками
- `/audit [N=30]` — останні N подій audit log
- `/audit_filter <type>` — фільтр по типу події
- `/audit_export <period>` — CSV дамп за період
- `/her_status` — все що зараз з ежиком (battery, location, last interaction, mood)
- `/sources_health` — uptime/latency кожного API за 24г
- `/latency_stats` — p50/p95/p99 latency
- `/circle_full` — повний family circle з статусами
- `/zones_full` — всі зони ежика з геометрією
- `/replay <event_id>` — реконструкція минулої події
- `/verify` — перевірити HMAC-підпис повідомлення (anti-spoofing)
- `/test_alert <priority>` — синтетичний alert (видно ежику)
- `/test_alert_silent <priority>` — тест видимий тільки тобі
- `/test_blackout` — синтетичне DTEK сповіщення
- `/fire_drill` — запустити monthly fire drill зараз
- `/backup_now` — примусовий бекап БД до B2
- `/mute_mirror [N]` — приглушити silent mirror на N хв
- `/admin_filter <level>` — рівень мирору (everything/summary/critical_only)

---

## FAMILY CIRCLE (config/safety_circle.yaml)

```yaml
contacts:
  - name: "Мама"
    telegram_id: 12345
    phone: "+380..."
    home_coords: {lat: ..., lon: ...}
    relation: mother
    invite_status: accepted
  - name: "Подруга Аня"
    telegram_id: 67890
    relation: friend
```

**На IMMEDIATE event автоматично:**
```
Увага: тривога над {district}.
Ежик у небезпеці. Чи ти в безпеці?

[Так, в укритті] [Дома, ОК] [Допомога!]
```

---

## /SOS КОМАНДА

При виклику:
1. Карта з її локацією + 3 найближчі укриття
2. Inline-кнопки `tel:` посилань:
   - 📞 Мишка (твій номер)
   - 🚨 102 (поліція)
   - 🆘 112 (екстрена)
   - 🚑 103 (швидка)
3. Адреса її точки у тексті для копі-паста при дзвінку

---

## CHECK-IN ЛОГІКА (pipeline/checkin.py)

- Після кожного HIGH/IMMEDIATE → таймер 5 хв після відбою alerts.in.ua
- Відбій прийшов → primary "Як ти? Напиши ОК"
- Будь-яке повідомлення від primary в 5 хв = ОК (необов'язково слово "ОК")
- Через 5 хв тиші → escalation backup
- Після відповіді primary → backup отримує "Ежик у порядку ✓"

---

## POST-EVENT SELF-REPORT (bot/post_event.py)

Через 30 хв після resolved IMMEDIATE/HIGH:
```
Як ти? Все нормально? Можеш написати або надіслати голосове. — М. 🐻
```

Логуємо відповідь. Використовуємо у weekly digest. Шлемо backup short summary.

---

## SELF-WATCHDOG (watchdog/)

**КРИТИЧНО:** окремий процес на **іншому VPS** (не тому ж де основний бот). UptimeRobot як мінімум.

Логіка:
- HTTP GET `https://airguard.example.com/healthz` кожні 60 сек
- Якщо 3 fail підряд → Telegram повідомлення тобі через **окремого** watchdog-бота (інший токен!) + email через Resend/SendGrid як другий канал
- Ніколи не використовувати той же токен — якщо процес впав, впав і watchdog

Endpoint `/healthz` в основному боті перевіряє:
- `tg_client.is_connected()`
- `bot.get_me()` < 2 сек
- Останнє повідомлення з будь-якого каналу < 1 година
- Останній alerts.in.ua ping < 30 сек

---

## БЕЗПЕКА

- Всі секрети у `.env`, `.env.example` без значень
- `.gitignore`: `.env`, `*.session`, `sqlite.db`, `logs/`, `data/cache/`
- `ALLOWED_USER_IDS` — тільки primary+backup можуть писати боту, іншим "Цей бот приватний 🐻"
- Координати дому НЕ у публічних логах, тільки в `.env` або зашифрованому config
- Rate limit на Anthropic/Gemini API — макс 100 картинок/год
- Single-use коди ролей (hash зберігається в БД після використання)

---

## .env.example

```
# === Telegram ===
BOT_TOKEN=
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_SESSION_NAME=air_guard_user

# === LLM ===
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

# === Alerts API ===
ALERTS_IN_UA_TOKEN=
# NEPTUN_API_KEY=        # NEPTUN не має public API у 2026 (verified May 2026)
                         # тільки моніторимо їх Telegram-канал як OSINT-джерело

# === Voice — ВНУТРІШНІ Telegram .ogg повідомлення (ЗОВНІШНІ дзвінки НЕ використовуємо у v1) ===
# OpenAI gpt-4o-mini-tts конфігурується через OPENAI_API_KEY вище
# ElevenLabs (опц., для голосу персони Мишки в .ogg) — нижче

# === Emergency bot (другий бот для критичних alerts) ===
EMERGENCY_BOT_TOKEN=    # окремий токен від @BotFather (інший бот!)

# === ЗОВНІШНІ ДЗВІНКИ — DISABLED у v1 ===
# Telegram-only ескалація. Якщо колись захочемо повернути:
# PLIVO_AUTH_ID=
# PLIVO_AUTH_TOKEN=
# PLIVO_FROM_NUMBER=
# SINCH_SERVICE_PLAN_ID=
# SINCH_API_TOKEN=
# SINCH_FROM_NUMBER=
# TTS_CDN_BASE_URL=     # потрібно тільки для зовнішнього TwiML/PlivoXML

# === ElevenLabs (опц., для голосу персони "Мишка") ===
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=     # ID склонованого голосу Мишки

# === Карти ===
STADIAMAPS_API_KEY=

# === DTEK / YASNO електрика ===
DTEK_YASNO_QUEUE=        # 1.1 .. 6.2 (отримати один раз з dtek-dnem.com.ua/ua/shutdowns)

# === SMS — DISABLED IN v1 ===
# TURBOSMS_TOKEN=        # активуй коли увімкнеш SMS-fallback

# === Ролі (порожні при першому запуску) ===
PRIMARY_USER_ID=
BACKUP_USER_ID=
ROLE_CODE_YOZHYK=
ROLE_CODE_MISHKA=

# === Phones ===
PRIMARY_USER_PHONE=      # +380...
BACKUP_USER_PHONE=

# === Watchdog ===
WATCHDOG_BOT_TOKEN=      # інший токен!

# === Logs ===
LOG_LEVEL=INFO
```

---

## DEPLOYMENT

**VPS (verified May 2026):**
- Основний: **Hetzner Falkenstein (FSN1)** — `CAX21` (4 ARM vCPU / 8 GB RAM / 80 GB SSD) ~€7/міс
  - **Чому Falkenstein, а не Helsinki:** ping до Telegram DC (Amsterdam) ~15–25мс vs ~25–40мс з Helsinki
  - **Чому CAX21 (ARM), а не x86:** дешевше за core, нам швидкісних single-thread бенчмарків не треба
  - Альтернатива якщо ARM-сумісність проблема: **CX23** (Intel, 2 vCPU/4 GB) ~€3.49–3.79/міс
  - **CPX21 deprecated** з 2025 — не існує більше
- Watchdog: **окремий провайдер** (Contabo / OVH / Vultr — будь-який ≥$3/міс)
- **НЕ використовувати** AWS US, GCP US (+100мс на хоп)

**systemd:**
```ini
[Service]
Restart=always
RestartSec=2
```

**Логи:** journald + ротація. Метрики latency у SQLite.

---

## DTEK / YASNO — ГРАФІК ВІДКЛЮЧЕНЬ ЕЛЕКТРИКИ (ВУЛ. САВКІНА 6)

**Контекст:** під час війни електрика в Україні — це критичний ресурс. Перед знеструмленням ежик має знати точно коли воно почнеться, щоб встигнути зарядити power bank, набрати воду, увімкнути обігрівач, поснідати, відкласти важливі справи. Це **не загроза життю**, але дуже впливає на якість і стресовість дня.

### Архітектура

**Провайдер:** YASNO — retail-бренд DTEK Group; покриває і Київ, і Дніпро.
**Регіональний DSO для адреси Савкіна 6:** ДТЕК Дніпровські Електромережі (DTEK Dnem).
**Система чергування:** 6 основних черг (1, 2, 3, 4, 5, 6), розбитих на підчерги (1.1, 1.2, ..., 6.1, 6.2 — всього ~12).

### One-time setup: дізнатись чергу для Савкіна 6

**ЦЕ робиться один раз руками** при налаштуванні бота:

1. Перейти на https://www.dtek-dnem.com.ua/ua/shutdowns
2. У формі пошуку: місто `Дніпро` → район `Новокодацький` → вулиця `Савкіна` → будинок `6`
3. Сторінка покаже чергу (наприклад `3.2`) — записати у `config/user.yaml`:
   ```yaml
   utilities:
     dtek_yasno_queue: "3.2"     # отримане з dtek-dnem.com.ua/ua/shutdowns
   ```

**Альтернатива:** Telegram-бот `@DTEKDniprovskiElektromerezhiBot` (після реєстрації з особовим рахунком) повертає чергу автоматично.

### Polling implementation

```python
# src/air_guard/ingest/yasno_blackout.py
YASNO_API = "https://api.yasno.com.ua/api/v1/pages/home/schedule-turn-off-electricity"

async def fetch_dnipro_schedule(queue: str) -> list[OutageWindow]:
    """Returns list of {start, end, type} for today and tomorrow."""
    async with httpx.AsyncClient(http2=True, timeout=10.0) as c:
        r = await c.get(YASNO_API)
        data = r.json()
    component = data["components"]["dnipro"]
    daily = component["dailySchedule"].get(queue, {})
    windows = [
        OutageWindow(
            start=parse_dt(entry["start"]),
            end=parse_dt(entry["end"]),
            type=entry.get("type", "DEFINITE_OUTAGE"),
        )
        for date_key in ("today", "tomorrow")
        for entry in daily.get(date_key, [])
    ]
    return windows
```

**Polling:** кожні 30 хвилин. Кеш — у БД, з timestamp `fetched_at`. Якщо API >2 годин не оновлюється → попередження у `/digest` "графік DTEK не оновлюється, дані можуть бути застарілі".

### Fallback: text-scrape DTEK Dnem

Якщо YASNO API мовчить >2 години (а це буває під час масованих обстрілів):

```python
# src/air_guard/ingest/dtek_dnem_scrape.py
DTEK_DNEM_URL = "https://www.dtek-dnem.com.ua/ua/shutdowns"

async def scrape_dtek_dnem_for_queue(queue: str, address: str) -> list[OutageWindow]:
    """Парсимо HTML — крихкий метод, тільки як fallback."""
    async with httpx.AsyncClient(timeout=15.0,
        headers={"User-Agent": "Mozilla/5.0 (AirGuard fallback)"}) as c:
        r = await c.get(DTEK_DNEM_URL)
    # парсимо BeautifulSoup, шукаємо row для нашої черги
    ...
```

### Сповіщення про блекаут

**Шаблони (bot/templates.py):**

`blackout_30min.j2` (30 хв до початку):
```
⚡ Через 30 хв вимикають світло, ежик
{{ start_time }} — {{ end_time }} (~{{ duration_h }} год)
Встигни зарядити телефон, набрати воду, налити чай. — М. 🐻
```

`blackout_5min.j2` (5 хв до початку):
```
⚡ Через 5 хв світло вимкнуть.
Якщо щось зараз готується — допивай каву, заваривай чайник.
Я тут (у мене дизель). — М.
```

`blackout_ended.j2`:
```
💡 Світло повернулось 🎉
Прокладаюся з графіком — наступне вимкнення о {{ next_start }}.
— М.
```

`blackout_schedule_changed.j2` (графік раптово оновився):
```
⚡ Ежик, графік змінили!
Раніше було {{ old_window }}, тепер: {{ new_window }}.
Перенесла планувальник. — М.
```

### Команди

- `/svitlo` — поточний статус (зараз є / немає) + найближче вимкнення
- `/svitlo_today` — повний графік на сьогодні і завтра у вигляді timeline
- `/svitlo_diff` — що змінилось у графіку за останні 24 години

### Інтеграція з повітряними тривогами

Якщо під час IMMEDIATE event є плановий блекаут протягом 30 хв — додаємо до тексту:
```
⚠️ Через {{ X }} хв вимкнуть світло. Зайди в укриття з повербанком і ліхтариком.
```

### Бюджет

YASNO API безкоштовний, polling раз на 30 хв — це 48 req/день, копіївки трафіку.

---

## ДОПОВНЕННЯ ПО АКТУАЛЬНОСТІ 2025–2026

**Цей розділ містить уточнення які виявилися критичними при перегляді актуальних даних. Включай їх з самого старту.**

### Шахед-238 (турбореактивний)

З середини 2024 РФ масово застосовує реактивну версію шахеда. Швидкість **~600 км/год** (в 3.3 разу швидше Shahed-136), політ на більшій висоті, шумніший. Для нашого ETA-розрахунку це означає що звичайна формула 180 км/год **некоректна** якщо в OSINT-каналах є слова `"реактивний"`, `"швидкісний"`, `"висока швидкість"`, `"Shahed-238"`, `"Шахед-238"`, `"238"`.

Доповнення до `data/eta_table.yaml`:
```yaml
launch_origins:
  kamianske:
    # ... існуючі поля
    eta_shahed_jet_min: 3.2     # 32км ÷ 10км/хв
  rf_belgorod:
    eta_shahed_jet_min: 38.0    # 380км ÷ 10км/хв
  # додати для всіх origins
```

В `pipeline/classifier.py` додати:
```python
def detect_shahed_variant(text: str) -> ShahedVariant:
    if any(p in text.lower() for p in ["238", "реактив", "швидкісн", "jet"]):
        return ShahedVariant.JET
    return ShahedVariant.STANDARD
```

Шаблон для реактивного:
```
🔴 РЕАКТИВНИЙ ШАХЕД на твій район!
Швидкість ~600 км/год — це **не звичайний шахед**.
ETA: всього ~{eta_min} хв. Зараз у ванну. — М.
```

### Voice провайдери — НЕ ВИКОРИСТОВУЄМО у v1

**Рішення:** фокус повністю на Telegram. Зовнішні дзвінки (Plivo, Sinch, Twilio, Infobip) **архітектурно виключені** у v1.

**Чому:**
- Telegram + emergency bot + voice message в чаті + backup-користувач як людина-диспетчер дають достатній рівень ескалації для нашого use-case
- Економимо $12/міс
- Менше точок відмови (no Geo Permissions, no Twilio's UA mobile flakiness, no Plivo's per-minute fees, no fraud detection blocks)
- Простіше тестувати end-to-end

**Якщо колись захочемо повернути зовнішні дзвінки** (v2 опція):
- Архітектура повністю задокументована вище у секції "TELEGRAM-ONLY ESCALATION → Майбутнє розширення"
- Просто додати модуль `transport/voice_call.py` з Plivo + Sinch active-active
- Параметри Plivo: $0.3930/хв до UA mobile, треба ввімкнути Ukraine у Geo Permissions
- Sinch як failover

**v1 alternative:** **emergency bot** (другий бот!) з окремими iOS notification settings — деталі вище у секції "Чому два боти".

### Apple Critical Alerts — обмеження

iOS має `UNNotificationInterruptionLevel.critical` що обходить Do Not Disturb, але **бот через стандартний Telegram client не може це активувати** — Apple вимагає окремий entitlement на developer account, який Telegram не використовує для звичайних повідомлень.

**Реальний Telegram-only workaround (у v1):**

1. **iOS Focus → дозволити обидва боти у Do Not Disturb:**
   - Settings → Focus → Sleep / Do Not Disturb → People & Apps
   - Allow Notifications From → додати чат з `@AirGuard_bot` І `@AirGuard_SOS_bot`
   - Це обходить нічний DND для цих конкретних чатів
2. **Гучний кастомний звук** імпортований через "Save Sound" — обходить тихий режим завдяки vibration + max volume override якщо чат у whitelist
3. **Emergency bot з другим звуком** — інший бот має окремий notification sound, ще гучніший, тільки для IMMEDIATE/Ballistic. Так одна нотифікація = два push-овника з різними звуками
4. **Apple Watch Haptic Alert** — навіть якщо телефон тихий, Watch вібрує на зап'ястя
5. **Voice .ogg повідомлення в чаті** — на iOS push показує `🎤 0:06` і vibrate тригериться як incoming voice memo
6. **Backup-користувач (Мишка) як human-as-a-service дзвонар** — отримує паралельну копію alert, якщо примарі не відповіла за 60 сек — паралельно звичайним дзвінком зі свого телефону

Інструкція має йти у /start як setup-wizard:
```
Ежик, налаштуй iPhone один раз:
1. Settings → Focus → Sleep → People & Apps → дозволити Air Guard Bot
2. Settings → Focus → Do Not Disturb → те саме
3. У Telegram → відкрий чат зі мною → ⋯ → Сповіщення:
   - Звук: HighestVolume.m4a (надішлю файл)
   - Сповіщення: Завжди (не "тільки коли розблоковано")
4. Apple Watch: дозволити сповіщення з цього чату
Готово, тестую: /test_alert
```

### OSM Tiles — Mapbox / MapTiler для продакшну

`tile.openstreetmap.org` має tile usage policy: max ~1 req/sec, для особистого використання OK, але **рендерити карти кожні 5 секунд × 8 тайлів** перевищить ліміт за годину.

Рішення (verified May 2026, у порядку рекомендації):
- **Stadia Maps** (https://stadiamaps.com) — **рекомендовано для нашого профілю**: perpetual free dev plan з місячним кредитом, без картки, privacy-first, MapLibre drop-in, EU endpoint. Нам ~5000 тайлів/міс — вкладемось у free
- **MapTiler Cloud** (https://www.maptiler.com) — free tier 100K map loads/міс, без картки. Backup-варіант якщо Stadia не зайде
- **Mapbox** (https://www.mapbox.com) — 50K free, $5 за 1K overage, потрібна картка
- **Self-host через TileServer-GL** + регіональний дамп Україна (~5GB) — складніше але безкоштовно і повна приватність

В `bot/map_renderer.py`:
```python
TILE_URL = os.getenv("TILE_URL",
    "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png?api_key={key}")
```

`.env`:
```
STADIAMAPS_API_KEY=
TILE_URL=https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png?api_key=${STADIAMAPS_API_KEY}
```

**Чому dark тема:** alert-карти мають високий контраст (червоні маркери загроз на темному фоні), краще читаються вночі без сліпучого ефекту, узгоджуються з Telegram dark mode яким ежик користується.

Кеш на стороні бота: 7 днів TTL, бо тайли практично не змінюються.

### Apartment-level метадані для /sos та emergency dispatch

Розширити `config/home_layout.yaml`:
```yaml
address_details:
  building: "вул. Савкіна, 6"
  entrance: 2                  # під'їзд
  floor: 6                     # поверх
  apartment: 59                # номер квартири
  intercom_code: "59К"         # код домофону (УТОЧНИТИ у ежика)
  building_color: ""           # УТОЧНИТИ у ежика
  landmarks_visible: ""        # УТОЧНИТИ у ежика — що видно з вікна (для emergency dispatch)
  emergency_contacts:
    starshyna: "+380..."        # старший по дому
    neighbour_emergency: "+380..."
    house_manager: "+380..."
```

В /sos карта показує квартиру з підписом:
```
📍 вул. Савкіна 6, під'їзд 2, 6 поверх, кв. 59
Код домофону: 59К
```

Це дозволяє швидкому пожежі/швидкій знайти точне місце без розпитувань.

### Daily routine awareness

`config/user.yaml` додати:
```yaml
routine:
  sleep_hours: ["23:00", "07:00"]
  work_location:
    lat: ...
    lon: ...
    weekdays: [Mon, Tue, Wed, Thu, Fri]
    hours: ["09:00", "18:00"]
  commute_routes:
    - home_to_work: {start: "08:30", duration_min: 30, modes: [bus, walk]}
    - work_to_home: {start: "18:30", duration_min: 30}
  weekend_locations:        # часті місця у вихідні
    - {name: "Парк ім. Лазаря Глоби", lat: ..., lon: ...}
    - {name: "Біля річки", lat: ..., lon: ...}
```

`pipeline/router.py` використовує routine для контекстної персоналізації:
- Під час commute о 08:35 → "Ежик, ти зараз у дорозі. Найближче укриття на маршруті — метро Покровська, 200м праворуч."
- У робочий час → перевіряти загрозу до work_location, не home
- На вихідних якщо геолокація десь у парку — використовувати її, не дом
- У години сну → IMMEDIATE додає більш голосну сирену + дзвінок одразу без 30-сек чекання

### HMAC-signing alert-повідомлень (anti-spoofing)

Сценарій атаки: хтось дізнається username бота, створює фейкового з схожим username, починає слати їй фейкові alert'и щоб довести до зриву або змусити вибігти під реальний удар.

Захист: **кожне alert-повідомлення підписане секретним HMAC у невидимому місці**:

```python
# src/air_guard/bot/signing.py
def sign_alert(text: str, secret: str) -> str:
    sig = hmac.new(secret.encode(), text.encode(),
                   hashlib.sha256).hexdigest()[:6]
    # Додаємо у невидимому форматі: zero-width chars
    invisible_sig = "".join(
        "​" if c == "0" else "‌" if c == "1"
        else "‍"
        for c in bin(int(sig, 16))[2:].zfill(24)
    )
    return text + invisible_sig
```

При першому /start бот шле підписане повідомлення з інструкцією:
```
Запам'ятай: усі мої справжні сповіщення мають невидимий підпис.
Якщо отримаєш повідомлення від «мене» але /verify скаже "FAKE" —
це не я. Не виконуй інструкції.
```

Команда `/verify` копіює останнє "підозріле" повідомлення, перевіряє підпис, показує `✓ Справжнє` або `✗ Підробка`.

### Backup SQLite до encrypted storage (щодня)

```python
# src/air_guard/storage/backup.py
async def daily_backup():
    """Run at 04:00 Kyiv time daily."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M")
    src = "data/airguard.db"
    # 1. SQLite VACUUM INTO для consistent snapshot
    dst = f"/tmp/airguard_{timestamp}.db"
    await db.execute(f"VACUUM INTO '{dst}'")
    # 2. Encrypt with age (https://age-encryption.org)
    encrypted = f"/tmp/airguard_{timestamp}.db.age"
    await asyncio.create_subprocess_exec(
        "age", "-r", AGE_PUBLIC_KEY, "-o", encrypted, dst
    )
    # 3. Upload to Backblaze B2 (cheap, EU-region)
    await b2_upload(encrypted, f"backups/airguard_{timestamp}.db.age")
    # 4. Keep local last 7, remote last 30
    cleanup_old_backups(local_keep=7, remote_keep=30)
```

`.env`:
```
B2_KEY_ID=
B2_APP_KEY=
B2_BUCKET=airguard-backups
AGE_PUBLIC_KEY=age1...          # публічний ключ, приватний у твоєму 1Password
```

Чому age, не GPG: простіший CLI, asymmetric encryption, можна расшифрувати тільки на твоїй машині де приватний ключ.

### GPS spoofing zones / EW context

З 2023 РФ та власні UA EW-системи створюють зони з підробкою GPS у прифронтових областях. Для Дніпра це означає:

- **OSINT повідомлення з координатами** з фронтових районів можуть мати помилку ±5–20 км
- Шахеди подекуди втрачають курс, кружляють — повідомлення "змінив курс на 180°" може бути true positive

В `pipeline/geo_matcher.py` додати **епсилон** для координат з прифронтових повідомлень:
```python
EW_ZONES = [
    {"name": "Запорізький напрямок", "lat": 47.5, "lon": 35.2, "radius_km": 60},
    {"name": "Покровський напрямок", "lat": 48.3, "lon": 37.2, "radius_km": 50},
]

def is_coords_in_ew_zone(lat, lon) -> bool:
    return any(haversine(lat, lon, z["lat"], z["lon"]) < z["radius_km"]
               for z in EW_ZONES)

# Якщо координати у EW zone — confidence -0.10, додаємо мітку "(точність ±5–20км)"
```

### eSIM dual-carrier + Apple Watch cellular

Це **не код**, це instruction у `SETUP_CHECKLIST.md`. Додати:

**Resilience setup для ежика (один раз):**
1. **eSIM додати другого оператора** на її iPhone:
   - Якщо основний Київстар → додати Vodafone або Lifecell
   - Налаштувати automatic switching при втраті сигналу
   - Vodafone Ukraine дав free eSIM з 2024 для існуючих UA-номерів
2. **Apple Watch з cellular** (Series 5+):
   - Підключити свій eSIM-план на Watch (~$5/міс у Київстар)
   - Якщо телефон зник/розрядився — Watch отримає push з Telegram самостійно
3. **Спарений iPad в укритті:**
   - Старий iPad з активним Telegram-аккаунтом
   - Залишити у шафі укриття, заряджається від power bank
   - При IMMEDIATE сповіщення прийде на нього теж

### Spare phone в укритті

Простий, але важливий пункт у setup:
- Купити дешевий смартфон (Nokia X20 ~$120, або старий iPhone SE)
- Прописати Telegram-аккаунт ежика на ньому
- Залишити у пакеті з power bank в укритті (вул. Білостоцького 17)
- Старший по укриттю має знати, що це "її телефон на випадок"
- Один раз на місяць перевіряти що батарея заряджена

### Anti-disinformation enhancement

Додати в `pipeline/deduplicator.py` **image metadata trust**:
```python
def assess_image_trust(image_msg) -> float:
    """Зменшити confidence якщо картинка стара / без exif / з repost."""
    score = 1.0
    if image_msg.exif_datetime:
        age_hours = (now() - image_msg.exif_datetime).total_seconds() / 3600
        if age_hours > 6:
            score -= 0.3
    if image_msg.is_forwarded_from_unknown:
        score -= 0.2
    if image_msg.contains_watermark_blacklisted:
        score -= 0.4
    return max(score, 0.1)
```

**Reaction analysis** — якщо повідомлення на каналі набрало 100+ реакцій 👍/🔥 і 0 🤔/👎 — confidence +0.1.

### Monthly fire drill

Раз на місяць (1 числа о 14:00 — обідній час, бадьора), бот сам:
1. Шле тестове "🟦 ТРЕНУВАННЯ: симульована IMMEDIATE. Якщо реальна — `/im_safe`."
2. Чекає її відповідь
3. Логує latency response, якщо вона не відповіла 3 хв — нагадує: "Тренування пройшло? Все ОК?"
4. Місячний звіт латентності у `/digest`

Це підтримує її натренованість + перевіряє що чат живий + перевіряє latency бота end-to-end.

### Pets / dependents

В `config/safety_circle.yaml` додати:
```yaml
dependents:
  - type: pet
    name: "Котик"
    species: cat
    grab_priority: 2         # 1=телефон+документи, 2=кіт, 3=...
    notes: "Переноска у коридорі, поличка ліворуч"
```

В `home_layout.shelter_route` додати поле `dependents_handling: "Кота у переноску, документи на полиці у коридорі, час +30сек."` — це впливає на ETA до укриття.

---

## SDK НОТАТКИ (verified May 2026)

### alerts.in.ua — використовуй офіційний SDK

```python
# pip install alerts-in-ua
from alerts_in_ua import AsyncClient

client = AsyncClient(token=os.getenv("ALERTS_IN_UA_TOKEN"))
alerts = await client.get_active_alerts()
# alerts — список об'єктів з полями: location_uid, location_title,
# location_type, alert_type, started_at, updated_at, ...
```

Не пиши свій HTTP-клієнт — у SDK вже є retry, rate-limit handling, парсинг.

**При першому старті:** виклич `get_active_alerts()`, виведи всі унікальні `location_title` для Дніпропетровської області, знайди UID для `"Дніпровська міська територіальна громада"`. Запиши у конфіг.

### anthropic — обов'язково prompt caching

90% економії на input tokens для повторюваних system prompts і vision examples:
```python
import anthropic
client = anthropic.AsyncAnthropic()
response = await client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=1024,
    system=[{
        "type": "text",
        "text": LONG_VISION_INSTRUCTIONS,
        "cache_control": {"type": "ephemeral"}    # <<<< кешуємо
    }],
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {...}},
            {"type": "text", "text": "Витягни локації з цієї карти"}
        ]
    }]
)
```

### google-genai vs google-generativeai

```python
# ✅ Новий, актуальний
from google import genai
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
response = await client.aio.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents=[image, "Витягни локації з цієї карти"]
)

# ❌ Старий пакет — НЕ використовуй для нового коду
# import google.generativeai as genai
```

### aiogram — DefaultBotProperties

```python
# ✅ Правильно у 3.28+
from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
bot = Bot(
    token=BOT_TOKEN,
    default=DefaultBotProperties(parse_mode="HTML")
)

# ❌ Deprecated, з 3.10+
# bot = Bot(token=BOT_TOKEN, parse_mode="HTML")
```

### Telethon — план міграції

Telethon GitHub-репо архівований у Feb 2026. Для v1 продовжуємо використовувати (MTProto стабільний, функціонал є), але:
- Веди список використовуваних Telethon-фіч у `docs/telethon_migration_plan.md`
- У v2 (3-6 місяців) мігруй на Pyrogram (https://docs.pyrogram.org/) або, якщо вистачить, на чисто bot-API через aiogram (без user-session, але без читання чужих каналів)

---

## ВЕРИФІКАЦІЯ ДЖЕРЕЛ (2025–2026)

Перед першим production-запуском перевір що канали активні та слідкуй за актуальністю списків. Канали в Україні мігрують, банять, ребрендуються постійно.

**Перевір вручну** (через https://t.me/<username> — має бути ≥1 пост за останні 24 години):
- `dnipropetrovsk_ova` — офіційний канал ОВА
- `kpszsu` — Повітряні Сили ЗСУ
- `dnipro_alerts`
- `ny_i_dnipro`
- `monitor_ukraine`
- `serhii_flash` (Сергій Стерненко — добрий агрегатор, перепостить ОВА швидко)
- `astra_news` — незалежний OSINT
- `operativnoZSU`
- `dnipro_oblast_alerts` (якщо існує)

Якщо канал змінив username — оновити `config/sources.yaml`. Якщо неактивний — закоментувати з датою `# inactive since YYYY-MM`.

---

## ОПЕРАЦІЙНИЙ БЮДЖЕТ (verified May 2026, **~$26–31/міс recurring у v1**)

| Сервіс | Деталі | Місячно |
|---|---|---|
| **Hetzner CAX21** (Falkenstein, 4 ARM vCPU / 8GB) | основний бот | €7 ≈ $7.50 |
| Watchdog VPS (Contabo / Vultr) | окремий провайдер | ~$4 |
| **Anthropic Haiku 4.5** | vision ~3000 img/міс, з prompt caching | ~$5 |
| **Gemini 2.5 Flash-Lite** | parallel race з Claude | ~$3 |
| **OpenAI gpt-4o-mini-tts** | TTS для Telegram .ogg voice messages (~50/міс) | ~$1 |
| **ElevenLabs Starter** (опц.) | голос персони "Мишка" українською | ~$5 |
| Telegram Bot API (primary + emergency) | — | $0 |
| **Stadia Maps** | ~5K тайлів/міс, free dev plan | $0 |
| **Backblaze B2** | encrypted backups, ~5GB | ~$0.50 |
| **СУМАРНО recurring (з ElevenLabs)** | | **~$26–31/міс** |
| **СУМАРНО recurring (без ElevenLabs)** | | **~$21–26/міс** |
| ~~SMS~~ | DISABLED у v1 | $0 |
| ~~Plivo + Sinch voice calls~~ | DISABLED у v1 (Telegram-only ескалація) | $0 |

**One-time:**
- Custom sticker pack (Lottie + конвертер): ~$30
- Spare phone у укритті (старий iPhone/Nokia): ~$120
- Apple Watch eSIM для ежика (опц.): ~$5/міс

**Знижки бюджету:**
- Якщо OpenAI TTS вистачає для .ogg повідомлень — економимо $5/міс на ElevenLabs
- Якщо self-host tiles — економимо $0 (Stadia free вже), але +складність
- Якщо watchdog через UptimeRobot free → економимо $4

**Що подорожчало б у v2 якщо повернули б зовнішні дзвінки:** +$12/міс (Plivo + Sinch active-active) і $30+ одноразово на тестові дзвінки до production.

---

## ЗАПРЕТЫ В HOT PATH

У файлах `pipeline/hot_path.py` та `transport/sender.py` для IMMEDIATE **заборонені**:
- `await anthropic_client.*`
- `await db.execute` (використовувати write-behind queue)
- Синхронний `requests.*` / `httpx` без таймауту < 500мс
- Блокуючі операції з файловою системою
- `logger.info` без поля `extra={'fast': True}` (буферизуємо)

Юніт-тест `tests/test_hot_path_latency.py`:
- Synthetic message with her district + drone keyword
- Measure `check_hot()` → <5ms
- Measure full hot path (no real network) → <50ms

---

## ПОРЯДОК РОЗРОБКИ

**Week 1: Фундамент + Hot Path + Ballistic Path**
1. pyproject.toml, структура, .env.example, README з інструкцією по ключах
2. Config-моделі (pydantic) + завантажувач + словник локацій
3. Geo-модуль: геокодинг, резолв аліасів, релевантність. Тести.
4. text_parser з patterns для УСІХ типів загроз (shahed, cruise, ballistic, kab, kinzhal) + deduplicator
5. alerts.in.ua REST polling (немає WebSocket у 2026; ballistic/UAV granularity тільки через OSINT regex)
6. aiogram бот з командами + sender + formatter з шаблонами для всіх типів
7. Telethon-reader (поки фейк-обробник)
8. Hot path + **окремий ballistic_path** з тестами латентності
9. Role system + .env bootstrap

**Week 2: Vision + Live Dashboard + Stickers**
10. Vision race (Gemini + Claude)
11. Map renderer з shelter overlay + анімовані WebP
12. Live dashboard з editMessageMedia
13. Trajectory + wind
14. Cross-validation + confidence scoring
15. **Створення sticker pack через @stickers** + інтеграція bot/stickers.py
16. **Sticker-first delivery** для IMMEDIATE/HIGH/BALLISTIC

**Week 3: Telegram-only ескалація + Admin mirror + Resilience**
17. Telegram escalation chain (transport/telegram_escalation.py) — sticker → бустер → voice .ogg → emergency bot → backup ping
18. **Emergency bot** — другий @BotFather bot, окремий токен, інтеграція з primary
19. Voice .ogg generation: OpenAI gpt-4o-mini-tts + (опц.) ElevenLabs з voice clone Мишки
20. Inline keyboard + callback handlers + auto-reactions
21. **Admin Mirror Mode** — silent mirror primary-подій у чат backup
22. **Admin Panel** з auto-refresh + balance monitoring + top-up кнопками
23. **Audit log** з queryable history + /replay
24. Self-watchdog (окремий проект `watchdog/`)
25. Check-in logic + escalation до backup
26. Intercept detection (нові patterns) + state INTERCEPTED
27. Live Location ingestion (📎 → geolocation) + dynamic origin для ETA
28. /set_zone — користувач малює зону моніторингу

**Week 4: Premium + Predictive**
24. Pre-alert from launch detection (включаючи стратегічну авіацію → 4-6 годин попередження)
25. Apartment routing (home_layout)
26. Family circle + /circle, /safe
27. /sos команда
28. YASNO blackout integration
29. Post-event self-report
30. Weekly digest
31. NEPTUN моніторинг через їх Telegram-канал як OSINT (у 2026 public API немає)
32. Custom notification sound generator (TTS + siren mix → .m4a для імпорту в iOS)
33. **Telegram Web App** — інтерактивна карта з малюванням зон, історія загроз
34. Mic detection PWA (окремий міні-проект, опціонально)
35. Weather context (open-meteo) — додавати до alert "при сильному вітрі шахед може відхилитись"
36. Intercept detection enhancement — OSINT patterns про роботу ППО

**Після кожного кроку:** git commit з описовим повідомленням.

---

## ФІНАЛЬНИЙ ЧЕКЛИСТ ФУНКЦІЙ (v1 scope)

Це повний реєстр того що має бути у v1. Жодна фіча не "забута" — все нижче перевір що написано вище в архітектурі.

### Ingest (вхідні дані)

- [x] alerts.in.ua REST polling (30s, oblast UID 9), 5 типів подій
- [x] Tier-0 шорткат при `air_raid: true`
- [x] OSINT Telegram-канали через Telethon (kpszsu, dnipropetrovsk_ova, dnipro_alerts, monitor_ukraine, serhii_flash, astra_news, ny_i_dnipro)
- [x] NEPTUN моніторинг через їх Telegram-канал (public API немає у 2026)
- [x] e-Tryvoga crowdsourced (опц.)
- [x] YASNO API для DTEK Dnem електрика
- [x] Open-Meteo для вітру
- [x] Live location від користувача через 📎

### Pipeline (обробка)

- [x] Hot path <2s з in-memory triggers
- [x] Ballistic path (паралельний з усім, миттєвий)
- [x] Multi-LLM vision race (Claude Haiku 4.5 + Gemini 2.5 Flash-Lite)
- [x] Text parser з threat keywords, locations, directions
- [x] Geo matcher з alias resolver (Новокодацький=Ленінський=НКР тощо)
- [x] Deduplicator з cross-validation і confidence scoring
- [x] Wind-adjusted trajectory cones
- [x] Multi-threat routing (вибір безпечного маршруту)
- [x] Priority router (IMMEDIATE/HIGH/MEDIUM/LOW)
- [x] Threat-type-specific handling (Shahed, Shahed-238 jet, cruise, ballistic, Kinzhal, KAB, X-22)
- [x] Pre-alert from launch detection (стратегічна авіація, МіГ-31К)
- [x] Intercept detection (state INTERCEPTED)
- [x] Zone monitoring (домашня + WORK + custom)

### Delivery (Telegram-only у v1)

- [x] Primary bot (`@AirGuard_bot`)
- [x] Emergency bot (`@AirGuard_SOS_bot`) — другий бот для критичних
- [x] Анімовані стікери (13 у sticker pack)
- [x] Кастомні емодзі персонажів (8: ежик×4, мишка×4)
- [x] Voice messages (.ogg) через OpenAI gpt-4o-mini-tts або ElevenLabs з voice clone
- [x] Live Threat Dashboard з editMessageMedia (оновлюється 5s)
- [x] Анімовані карти (WebP loop) з пульсуючими маркерами
- [x] Карти з кольорами районів, концентричними радіусами, маркерами укриттів, threat cone
- [x] Static maps через Stadia Maps + py-staticmaps
- [x] Telegram escalation chain (sticker → бустер → voice .ogg → emergency bot → backup ping → family circle)
- [x] Inline keyboard на кожному alert
- [x] Auto-reactions при тапі "Я в укритті"
- [x] HMAC-signed alert повідомлення (anti-spoofing)
- [x] Quiet hours політика (м'якіша мова, але IMMEDIATE завжди йде)
- [x] Інструкція з налаштування iOS Focus / Apple Watch
- [x] Custom siren sound generator (.m4a для імпорту)

### Команди

- [x] `/start`, `/im_yozhyk`, `/im_mishka`, `/whoami`, `/help`
- [x] `/status`, `/sources`, `/digest`, `/pause`, `/resume`, `/silent_night`, `/battery`
- [x] `/sos`, `/safe`, `/circle`
- [x] `/where`, `/zones`, `/set_zone`, `/zone_pause`, `/zone_remove`, `/share_location_request`, `/work_mode`
- [x] `/svitlo`, `/svitlo_today`, `/svitlo_diff`
- [x] Адмін: `/latency_stats`, `/verify`, `/test_alert`, `/test_blackout`, `/fire_drill`, `/backup_now`

### Live Location & Zones (NEW)

- [x] 📎 → Share My Live Location — детект через `live_period > 0`
- [x] Auto-update message handler для стрімінга позиції
- [x] District boundary crossing notification
- [x] Dynamic ETA розрахунок від поточної позиції
- [x] Privacy: координати тільки in RAM + поточна позиція у SQLite, історія не логується
- [x] 📎 → звичайний location → пропозиція "додати як зону"
- [x] /set_zone через Telegram Web App для малювання полігонів
- [x] Auto-zones з routine (WORK з робочих годин)
- [x] Zone intersection alerting (мама в Тополі коли там IMMEDIATE)

### Resilience

- [x] Self-watchdog на окремому VPS (Contabo/Vultr) + UptimeRobot як другий
- [x] Daily encrypted SQLite backup до Backblaze B2 (з age encryption)
- [x] Family circle escalation chain
- [x] Backup-користувач (Мишка) як людина-диспетчер
- [x] Fail-safe: якщо primary bot заблокований — emergency bot працює
- [x] Plan Б для кожного зовнішнього сервісу (API_LINKS.md)
- [x] Spare phone у укритті (recommendation)
- [x] eSIM dual-carrier (recommendation)
- [x] Apple Watch cellular (recommendation)

### UX & Tone

- [x] Персона "Мишка" — у IMMEDIATE наказ для виживання, у MEDIUM/soft тепло
- [x] Підпис `— М.` / `— М. 🐻` тільки у MEDIUM/LOW
- [x] Факти UA + теплі звертання RU
- [x] Анімовані стікери з матрицею використання (без шума)
- [x] Apartment-level routing з адресою Савкіна 6 під'їзд 2 кв. 59 6 поверх
- [x] Pets/dependents handling
- [x] Daily routine awareness
- [x] Monthly fire drill
- [x] Post-event self-report
- [x] Weekly digest

### Admin & Backup-як-співпілот

- [x] Silent mirror всіх primary-подій у чат backup'а (disable_notification=true)
- [x] Loud mirror критичних подій (IMMEDIATE, не відповідає, balance critical)
- [x] `/admin` інтерактивна панель з auto-refresh
- [x] Balance monitoring всіх сервісів (Anthropic, OpenAI, ElevenLabs, Hetzner, B2)
- [x] Inline top-up кнопки → URL білінгу провайдера з amount param
- [x] Daily balance audit о 09:00 з alert при < 7 днів запасу
- [x] Audit log з 90-денним retention + щоденний bekap
- [x] `/replay` реконструкція минулих подій
- [x] `/admin_filter` рівень мирору налаштовується backup'ом
- [x] Backup отримує всі callbacks/reactions/zone-changes primary без push'а ежику

### Tooling

- [x] Python 3.13, uv, aiogram 3.28+, Telethon (план міграції на Pyrogram у v2)
- [x] Docker-compose, Hetzner CAX21 Falkenstein
- [x] structlog JSON-logs, prometheus_client метрики
- [x] pytest з тестами латентності hot/ballistic path

---

## ІДЕЇ ДЛЯ v2 (вже задокументовані, не включаються у v1)

Список зафіксований щоб не забути:

1. **Зовнішні voice-дзвінки через Plivo + Sinch active-active** — якщо досвід v1 покаже що Telegram-only недостатньо
2. **SMS-fallback через TurboSMS** — третій канал для блекаут-сценаріїв
3. **Telegram Web App** для:
   - Інтерактивна карта зон з малюванням полігонів
   - Історія загроз з timeline
   - Налаштування у GUI замість команд
   - Family circle dashboard
4. **Microphone detection PWA** — окремий міні-PWA на iPhone, що використовує мікрофон для детекції характерного шуму шахеда
5. **Custom iOS app** з Critical Alerts entitlement — обхід DND на системному рівні
6. **Weather context integration** — open-meteo не тільки для вітру, а й опадів (дощ погіршує курс шахеда)
7. **Air defense map** — якщо колись будуть public-friendly дані про позиції ППО
8. **Voice STT для interaction** — вона надсилає голосове "Я в укритті" → бот через Whisper transcribe → counts as interaction
9. **Photo verification з EXIF reverse geocoding** — вона надсилає фото де вона зараз
10. **Telegram Stories from bot** — постити поточний threat status як Story
11. **OSINT channel reputation learning** — бот сам learns яким каналам більше довіряти на основі історичних збігів
12. **Calendar integration** — попереджати про загрози у місцях запланованих подій
13. **Reverse OSINT** — коли OSINT каже "Парус", бот резолвить у координати, генерує threat cone
14. **Multiple primary users** — якщо колись захочемо моніторити кількох близьких людей одним botом
15. **Drone visual recognition** через камеру iPhone (PWA, AR Kit) — детект візуальний на льоту
16. **Підпис файлу з рисунком області** — ежик надсилає скріншот Google Maps зі своєю обведеною областю → бот через vision LLM витягує polygon points

---

## ПРИНЦИП РОЗРОБКИ

**НЕ починай працювати з реальними токенами** — нехай user додасть `.env` сам. Для тестів використовуй fixtures.

**НЕ вигадуй координати, endpoint'и, uuid'и** — позначай `# TBD` і перевіряй з документації.

**КОЖНИЙ модуль покривай тестами** перш ніж переходити до наступного. Це life-safety code.

**КОМЕНТАРІ — мінімум.** Лише там, де "чому" не очевидно. Не описуй "що робить код".

**Поїхали — починай з Week 1, Step 1.**
