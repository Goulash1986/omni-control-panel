# Air Guard Bot — Master Build Prompt

> Вставь этот файл целиком как первое сообщение в новой Claude Code сессии на репозитории `air-guard-bot`.

---

## КОНТЕКСТ И МИССИЯ

Собери Telegram-бот «Air Guard» — персональный агрегатор информации о воздушных угрозах для одного человека, живущего в Дніпрі, Новокодацький район, ж/м Червоний Камінь, вул. Савкіна 6.

**Это life-safety система.** Война в Україні триває, Дніпро регулярно зазнає атак шахедів, крилатих ракет, балістики. Новокодацький район неодноразово був під ударами (підтверджено: жовтень 2024, січень 2026, квітень 2026). Кожна секунда затримки до укриття — це 50 метрів польоту шахеда (180 км/год = 50 м/с).

**Користувачі:** двоє, у двох ролях:
- **«ежик» (primary)** — отримувачка всіх сповіщень
- **«мишка» (backup)** — отримує копії IMMEDIATE + ескалації, коли вона не відповідає

**Принципи (в порядку важливості):**
1. **Швидкість доставки** > точність аналітики. Краще "є щось підозріле" за 1 сек, ніж точний діагноз за 10 сек.
2. **Польза** > стилізація. У IMMEDIATE-повідомленнях спочатку дія, потім тепло.
3. **Чесність** > впевненість. Коли confidence низький — пишемо "можливо", а не "точно".
4. **Резервування** > економія. Кілька каналів доставки (Telegram + SMS + voice call + мікрофонний детектор).
5. **Спостережність** > "віримо що працює". Self-watchdog обов'язковий.

---

## СТЕК

- Python 3.11+
- **aiogram 3.x** — відправка повідомлень
- **Telethon** — читання Telegram-каналів від user-session (у ботів немає доступу до чужих каналів)
- **anthropic SDK** — Claude Haiku 4.5 для vision-аналізу карт
- **google-genai SDK** — Gemini 2.5 Flash-Lite для vision (race з Claude)
- **openai SDK** — TTS для голосових дзвінків
- **twilio SDK** — голосові дзвінки + SMS (через окремого українського SMS-провайдера TurboSMS)
- **httpx** — REST API (alerts.in.ua, yasno, open-meteo, NEPTUN)
- **websockets** — alerts.in.ua WebSocket, Dron Alerts SSE
- **aiosqlite** — БД (дедуплікація, історія, кеш)
- **Pillow + staticmap** — рендеринг карт
- **pydantic v2** — конфіги і типізація
- **structlog** — JSON-логи
- **prometheus_client** — метрики латентності
- **docker-compose** — деплой
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
│       │   └── voice_call.py
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
    type: websocket
    url: wss://alerts.in.ua/ws
    hromada_filter: "Дніпровська міська громада"  # ВЕРИФІКУВАТИ uid
    api_token_env: ALERTS_IN_UA_TOKEN
    tier: gov
    confidence: 0.99
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
  - name: yasno_blackout
    type: rest
    url: https://app.yasno.ua/api/blackout-service/public/
    region_id: tbd                   # Дніпропетровська
    dso_id: tbd
    poll_interval_min: 30
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
    address: "вул. Савкіна 6, Дніпро"
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
        send_telegram_immediate(threat),       # ~500ms
        send_sms_immediate(threat),            # ~3-5s
        trigger_voice_call_now(threat),        # ~5-10s
        play_loud_sticker_first(threat),       # ~200ms
        broadcast_to_circle(threat),           # ~1s
        log_metrics(threat),
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

**Воєнно-важлива деталь:** alerts.in.ua з 2024 розрізняє типи тривог. Окремо приходять:
- `alert_started` (загальна повітряна тривога)
- `ballistic_started` (балістична загроза — окремий, ще терміновіший)
- `combat_uav_started` (наземні дрони/UAV)
- `chemical_threat`, `nuclear_threat` (рідко)

**Підпишися на ВСІ типи**, окремо обробляй кожен.

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

### Voice call escalation — диференціація за типом

```python
VOICE_CALL_DELAY = {
    ThreatType.SHAHED: timedelta(seconds=30),
    ThreatType.CRUISE_MISSILE: timedelta(seconds=15),
    ThreatType.KAB: timedelta(seconds=5),
    ThreatType.BALLISTIC: timedelta(seconds=0),    # НЕГАЙНО
    ThreatType.KINZHAL: timedelta(seconds=0),       # НЕГАЙНО
    ThreatType.X22: timedelta(seconds=0),
}
```

Для балістики/Кинджала dial відбувається **паралельно з Telegram send**, не послідовно. Часу на чекання немає.

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

### 2. Tier-0 шорткат (alerts.in.ua WebSocket)

WebSocket на `alerts.in.ua` → подія `alert_started` для громади/області → **hardcoded** message без жодної обробки за 0.5 сек:

```
🔴 ТРИВОГА. В укриття!
```

Далі вже підтягуються деталі з OSINT.

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

## VOICE CALL ESCALATION (transport/voice_call.py)

**Trigger:** IMMEDIATE alert, немає read_status від primary через 30 сек (10 сек у quiet hours).

**Workflow:**

1. Генеруємо TTS через OpenAI:
   ```python
   await openai.audio.speech.create(
       model="tts-1-hd",
       voice="onyx",  # тест на українській, fallback "nova"
       input=f"Тривога. {threat_type} напрямок {district}. "
             f"Орієнтовно {eta} хвилин. Негайно в укриття. Повторюю..."
   )
   ```

2. Завантажуємо mp3 на тимчасовий публічний URL (S3/CDN або локальний nginx з підписаним URL, TTL=5 хв).

3. Twilio Voice API:
   ```python
   call = twilio_client.calls.create(
       to=PRIMARY_USER_PHONE,
       from_=TWILIO_FROM_NUMBER,
       twiml=f'<Response><Play loop="3">{url}</Play></Response>'
   )
   ```

4. Лог: час старту дзвінка, тривалість, status (answered/no-answer/busy/failed).

5. Якщо no-answer 2 рази підряд → SMS backup:
   ```
   Ежик не отвечает на звонок. Прилёт возможен в её районе.
   ```

---

## SMS FALLBACK (transport/sms.py)

**Provider:** TurboSMS (https://turbosms.ua), баланс поповнюється вручну.

**Тригери:**
- IMMEDIATE → SMS паралельно з Telegram (завжди дублюємо)
- HIGH + немає read_status з Telegram через 30 сек → SMS
- Повна відмова Telegram (вимк сервера, помилка API) → SMS

**Текст SMS:** максимально короткий, без emoji (UCS-2 подвоює символи).
```
TRYVOGA! Drone -> Chervony Kamin, ~3 min. UKRYTTYA.
```

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

- `/start` — привітання, перевірка whitelist
- `/im_yozhyk <code>` / `/im_mishka <code>` — claim role
- `/whoami` — поточна роль
- `/pause [N]` — пауза LOW/MEDIUM на N хв (default 60)
- `/resume`
- `/status` — поточний стан тривоги в області + останні 3 події
- `/digest` — примусовий дайджест LOW за сьогодні
- `/sources` — статистика по каналах за 24г
- `/silent_night` — режим "тільки IMMEDIATE з 23:00 до 07:00"
- `/sos` — карта з найближчими укриттями + швидкі дзвінки
- `/battery <pct>` — primary повідомляє рівень батареї
- `/work_mode <lat> <lon>` — тимчасова зміна локації (на день, поїздки)
- `/circle` — карта з усіма у safety circle + їх статуси
- `/safe` — кнопка "Я в безпеці" → broadcast всім у circle
- `/latency_stats` — p50/p95/p99 latency за 24г (для тебе, моніторинг)

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
- Якщо 3 fail підряд → SMS backup-номеру + Telegram повідомлення тобі через **окремого** watchdog-бота (інший токен!)
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
NEPTUN_API_KEY=          # після отримання

# === Voice & SMS ===
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TTS_CDN_BASE_URL=        # для розміщення згенерованих mp3
TURBOSMS_TOKEN=

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

**VPS:**
- Основний: **Hetzner Helsinki** або **Falkenstein** (CPX21 ~$10/міс)
  - ping до Дніпра ~30мс, до Telegram DC ~10мс
- Watchdog: **окремий провайдер** (Contabo / OVH ~$3/міс)
- **НЕ використовувати** AWS US, GCP US (+100мс на хоп)

**systemd:**
```ini
[Service]
Restart=always
RestartSec=2
```

**Логи:** journald + ротація. Метрики latency у SQLite.

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

### Voice провайдер для +380 — НЕ Twilio

Twilio з 2023 практично припинив надавати voice до українських номерів через регулятивні обмеження. **Не використовуй Twilio для дзвінків в Україну.**

**Робочі альтернативи** (перевір актуально на день інтеграції):
- **Plivo** (https://plivo.com) — стабільно термінує +380, API схожий на Twilio, $0.05-0.10/хв
- **Sinch** (https://sinch.com) — глобальний провайдер, працює з UA
- **Vonage / Nexmo** (https://www.vonage.com) — теж робочий
- **Twilio для SMS** — досі працює, дзвінки — ні

Альтернатива дзвінкам: **Telegram Voice Note** через ботa — це насправді audio file message, але на iOS показує duration в push, ефект подібний до дзвінка. Якщо primary не відповіла на text — шлемо voice message з тривогою (5-секундна сирена + TTS).

`.env` оновити:
```
PLIVO_AUTH_ID=
PLIVO_AUTH_TOKEN=
PLIVO_FROM_NUMBER=
# Twilio залишається для SMS на не-UA номерів, якщо потрібно
```

### Apple Critical Alerts — обмеження

iOS має `UNNotificationInterruptionLevel.critical` що обходить Do Not Disturb, але **бот через стандартний Telegram client не може це активувати** — Apple вимагає окремий entitlement на developer account, який Telegram не використовує для звичайних повідомлень.

**Реальний workaround який працює:**

1. **iOS Focus → дозволити цей чат у Do Not Disturb:**
   - Settings → Focus → Sleep / Do Not Disturb → People & Apps
   - Allow Notifications From → додати чат з ботом
   - Це обходить нічний DND для конкретного чату
2. **Voice call через Plivo/Sinch** — дзвінок завжди дзвенить навіть у DND/silent mode (це системна функція iOS)
3. **Гучний кастомний звук** імпортований через "Save Sound" — обходить тихий режим завдяки vibration + max volume override якщо чат у whitelist
4. **Apple Watch Haptic Alert** — навіть якщо телефон тихий, Watch вібрує на зап'ястя

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

Рішення:
- **MapTiler** (https://www.maptiler.com) — free tier 100K tiles/міс, нам вистачить, $25/міс якщо більше
- **Mapbox** (https://www.mapbox.com) — free 50K, $0.6/1000 tiles після
- **Stadia Maps** (https://stadiamaps.com) — від $20/міс
- **Self-host через TileServer-GL** + регіональний дамп ~5GB — складніше але безкоштовно

В `bot/map_renderer.py`:
```python
TILE_URL = os.getenv("TILE_URL",
    "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key={key}")
```

`.env`:
```
MAPTILER_API_KEY=
TILE_URL=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}
```

Кеш на стороні бота: 7 днів TTL, бо тайли практично не змінюються.

### Apartment-level метадані для /sos та emergency dispatch

Розширити `config/home_layout.yaml`:
```yaml
address_details:
  building: "вул. Савкіна, 6"
  entrance: 3                  # під'їзд
  floor: 5                     # поверх
  apartment: 47                # номер квартири
  intercom_code: "47К"         # код домофону
  building_color: "червона цегла"
  landmarks_visible: "ТРЦ Караван видно з вікна, ліворуч"
  emergency_contacts:
    starshyna: "+380..."        # старший по дому
    neighbour_emergency: "+380..."
    house_manager: "+380..."
```

В /sos карта показує квартиру з підписом:
```
📍 вул. Савкіна 6, під'їзд 3, 5 поверх, кв. 47
Код домофону: 47К
Червона цегла, видно ТРЦ "Караван"
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

## ОПЕРАЦІЙНИЙ БЮДЖЕТ (~$45–55/міс)

- VPS Hetzner CPX21 (Helsinki): ~$10
- Watchdog VPS (Contabo): ~$4
- Anthropic Haiku 4.5 (vision ~3000 img/міс): ~$8
- Gemini 2.5 Flash-Lite (parallel race): ~$3
- OpenAI TTS (~30 дзвінків): ~$1
- **Plivo voice** для +380 (~30 дзвінків × 30 сек): ~$5
- TurboSMS (~200 SMS): ~$5
- Telegram bot API: $0
- MapTiler tiles (для динамічних карт): $0 free tier (до 100K/міс) або $25
- Backblaze B2 (backups, ~5GB): ~$0.50
- Custom стікер-пак (one-time, генерація): ~$30 одноразово (Lottie) або $50-200 (custom AE)
- Apple Watch eSIM для ежика (опціонально): ~$5/міс
- Spare phone у укритті (one-time): ~$120

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
5. alerts.in.ua WebSocket з ПІДПИСКОЮ НА ВСІ типи (alert_started, ballistic_started, combat_uav_started)
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

**Week 3: Resilience + Voice**
17. Voice call (OpenAI TTS + Twilio) з **диференційованими затримками за типом**
18. Голосові повідомлення (.ogg) у самому alert для CRITICAL
19. SMS fallback (TurboSMS)
20. Inline keyboard + callback handlers + auto-reactions
21. Self-watchdog (окремий проект `watchdog/`)
22. Check-in logic + escalation
23. Intercept detection (нові patterns) + state INTERCEPTED

**Week 4: Premium + Predictive**
24. Pre-alert from launch detection (включаючи стратегічну авіацію → 4-6 годин попередження)
25. Apartment routing (home_layout)
26. Family circle + /circle, /safe
27. /sos команда
28. YASNO blackout integration
29. Post-event self-report
30. Weekly digest
31. NEPTUN integration (коли отримаємо API)
32. Custom notification sound generator (TTS + siren mix → .mp3 для імпорту)
33. Mic detection PWA (окремий міні-проект, опціонально)

**Після кожного кроку:** git commit з описовим повідомленням.

---

## ПРИНЦИП РОЗРОБКИ

**НЕ починай працювати з реальними токенами** — нехай user додасть `.env` сам. Для тестів використовуй fixtures.

**НЕ вигадуй координати, endpoint'и, uuid'и** — позначай `# TBD` і перевіряй з документації.

**КОЖНИЙ модуль покривай тестами** перш ніж переходити до наступного. Це life-safety code.

**КОМЕНТАРІ — мінімум.** Лише там, де "чому" не очевидно. Не описуй "що робить код".

**Поїхали — починай з Week 1, Step 1.**
