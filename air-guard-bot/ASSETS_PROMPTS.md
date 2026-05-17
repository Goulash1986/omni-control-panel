# Air Guard Bot — Генеративні промпти для візуальних активів

Цей файл містить готові промпти для генерації всіх візуальних елементів через Midjourney, DALL-E 3, Sora, Runway Gen-3, Pika, Stable Video. Плюс пошукові ключі на LottieFiles.com для готових безкоштовних анімацій.

## Принцип "без шума"

Гіфки та персонажні емодзі **не повинні забивати інтерфейс**. Правила:

| Тип повідомлення | Гіфки/Анімація | Персонажні емодзі (ежик/мишка) |
|---|---|---|
| 🔴 IMMEDIATE / Ballistic | Загрозний стікер (сирена/ракета) | **НІ** — жодного теплого |
| 🟠 HIGH | Стікер-загроза (радар) | **НІ** |
| 🟡 MEDIUM | НІ | 1 мишка в кінці підпису "— М. 🐻" |
| 🟢 ALL CLEAR | Зелений щит-стікер | 1 ежик "🐻 / 🦔" |
| ☕ Ранковий дайджест | НІ | 1-2 емодзі персонажів |
| 💌 Check-in / soft moments | НІ | 2-3 емодзі персонажів |
| 📊 Тижневий звіт | НІ | 1 в кінці |
| 📞 Voice call dispatched | Стікер телефона | НІ |

**Правило:** ніколи не більше **одного** стікера + **двох** емодзі персонажа в одному повідомленні. Жодних емодзі-смужок типу "🦔🐻🦔🐻🦔". Це life-safety бот, не іграшка.

---

## 1. Sticker Pack — анімовані .tgs / .webm

### 1.1 `SIREN_ROTATING` (Tier-0 alerts.in.ua)

**Призначення:** прилітає першим при оголошенні тривоги для громади.

**Midjourney/DALL-E prompt:**
```
A bright red emergency siren light, rotating 360 degrees, vector minimal style,
flat design, dark navy background with subtle red glow halo, 8 frames animation,
high contrast for tiny size display, no text, Telegram sticker style, 512x512,
isolated, transparent background ready
--ar 1:1 --style raw --v 6
```

**Sora/Runway prompt (3-сек loop):**
```
3-second seamless loop: red emergency dome siren light rotating clockwise on
black background, with two strong red light beams sweeping radially outward,
slight motion blur on beams, sharp central body, no people no text, vector
minimal aesthetic, very high contrast, 1024x1024
```

**LottieFiles search:** `siren red rotating`, `emergency alarm spinning`, `police lights`

---

### 1.2 `DRONE_INCOMING_RED` (IMMEDIATE Shahed/UAV)

**Prompt:**
```
A dark silhouette of a Shahed-136 kamikaze drone (delta-wing shape with tail
propeller) flying from right to left, red warning trail behind it, animated
2-second loop, minimal vector style, dark red background gradient, no text,
geometric and recognizable at 64px size, Telegram sticker, transparent edges
--ar 1:1 --style raw --v 6
```

**Sora prompt:**
```
2-second loop: black silhouette of triangular-shaped attack drone with rear
propeller moving smoothly from right edge to left edge of frame, leaving glowing
red exhaust trail that fades, dark background, slight pulsing red warning glow
around the drone, no people, vector animation style
```

**LottieFiles:** `drone military silhouette`, `flying drone warning`

---

### 1.3 `MISSILE_RED` (IMMEDIATE Cruise missile)

**Prompt:**
```
A cruise missile silhouette (X-101 style: cylindrical with small wings) moving
horizontally with bright white-red exhaust flame trail, animated 2-sec loop,
dark crimson background, minimal vector flat style, 512x512, no text, sharp
silhouette readable at small size, Telegram sticker, urgent feel
--ar 1:1 --style raw --v 6
```

**Sora:**
```
Cruise missile flying horizontally left to right with intense red-orange flame
exhaust trail, 2-second seamless loop, minimal black silhouette on dark
crimson background, urgent military aesthetic, vector animation style
```

**LottieFiles:** `missile flying`, `rocket launch`, `military missile`

---

### 1.4 `BALLISTIC_PULSE` (Ballistic threat — MAX urgency)

**Prompt:**
```
A pulsating red triangle warning sign with exclamation mark in center, intense
strobing pulse animation 4 cycles per second, deep red on black background,
massive central glow, very aggressive visual urgency, vector minimal flat,
Telegram sticker style 512x512, recognizable even at 24px
--ar 1:1 --style raw --v 6
```

**Sora:**
```
Pulsating red warning triangle with exclamation mark inside, aggressive strobe
4Hz, intense red glow expanding and contracting, deep black background, no text,
maximum visual alarm urgency, 2-second loop, vector flat aesthetic
```

**LottieFiles:** `warning triangle pulse`, `alert exclamation`, `danger sign`

---

### 1.5 `HYPERSONIC` (Kinzhal / Х-22)

**Prompt:**
```
Streaks of bright light moving at extreme speed across dark sky, motion blur
trails, sonic boom shockwave effect, dark navy background with white-blue light
streaks, abstract representation of hypersonic projectile, 2-sec loop, vector
animation style, Telegram sticker 512x512
--ar 1:1 --style raw --v 6
```

**Sora:**
```
Extreme motion-blurred streak of white-blue light tearing across a dark navy sky,
hypersonic missile representation, sonic boom shockwave ring visible behind,
2-second loop, minimalist abstract, no people no text, vector animation
```

**LottieFiles:** `hypersonic streak`, `lightning bolt`, `speed motion blur`

---

### 1.6 `RADAR_SWEEP` (HIGH — approaching threat)

**Prompt:**
```
Classic radar display with rotating sweep line, green glowing scan, dark
green background, target dot blinking in upper-right quadrant, concentric range
rings, 360-degree sweep animation 4-sec loop, vector minimal, Telegram sticker,
recognizable at small size
--ar 1:1 --style raw --v 6
```

**LottieFiles:** `radar sweep`, `radar scan green`, `air traffic radar`

---

### 1.7 `SHIELD_GREEN_PULSE` (ALL CLEAR / safe)

**Prompt:**
```
A green protective shield icon, gentle calming pulse animation 1 cycle per second,
soft green glow, dark background, minimal vector flat style, comforting and safe
visual feel, no text, Telegram sticker 512x512
--ar 1:1 --style raw --v 6
```

**LottieFiles:** `shield green safe`, `protected check`, `secure pulse`

---

### 1.8 `WATCHFUL_EYE` (PRE-ALERT — monitoring)

**Prompt:**
```
A stylized minimalist eye, slowly blinking every 3 seconds, calm watchful
expression, amber/yellow iris with subtle glow, dark navy background, vector
flat illustration, Telegram sticker, gentle but alert feeling
--ar 1:1 --style raw --v 6
```

**LottieFiles:** `eye blinking watch`, `monitoring eye`, `surveillance eye`

---

### 1.9 `BEAR_HEART` (check-in / soft moments) — Мишка-персонаж

**Prompt:**
```
A cute minimalist bear character (мишка), warm brown color, sitting upright,
holding a red heart in paws and bringing it close to chest, gentle bobbing
animation 3-sec loop, kawaii style but not childish, warm beige background,
Telegram sticker 512x512, soft and reassuring
--ar 1:1 --style raw --v 6
```

**Sora:**
```
Cute brown cartoon bear (мишка/Mishka) sitting upright, holding a red heart
between paws and pulsing it gently toward viewer in 3-second loop, warm beige
background, kawaii animation style, soft and protective feel, no text, sticker
aesthetic
```

**LottieFiles:** `bear heart cute`, `teddy bear love`, `kawaii animal heart`

---

### 1.10 `PHONE_RING` (voice call dispatched)

**Prompt:**
```
An old-style telephone handset icon ringing, shaking left-right rapidly, with
sound wave arcs emanating outward, 2-second loop, vector minimal flat, dark
background, red ring color, urgent feel, Telegram sticker 512x512
--ar 1:1 --style raw --v 6
```

**LottieFiles:** `phone ringing`, `call incoming`, `telephone shake`

---

### 1.11 `CIRCLE_PEOPLE` (family circle ping)

**Prompt:**
```
Five stylized human silhouettes (different sizes - adults and one taller)
arranged in a circle holding hands, all glowing softly with green safe-light
when activated, vector minimal flat illustration, dark background, calm feel,
Telegram sticker 512x512
--ar 1:1 --style raw --v 6
```

**LottieFiles:** `people circle community`, `family icons`, `connected people`

---

### 1.12 `SHIELD_BLOCK` (INTERCEPTED — air defense success)

**Prompt:**
```
A glowing green shield deflecting an incoming missile, with bright gold spark
flash on impact, missile breaks into pieces, triumphant moment, 2-sec animation,
vector flat style, dark navy background, Telegram sticker 512x512
--ar 1:1 --style raw --v 6
```

**LottieFiles:** `shield blocking arrow`, `defense success`, `protected impact`

---

### 1.13 `BOMBER_WATCH` (Strategic aviation alert)

**Prompt:**
```
Side silhouette of Tu-95 strategic bomber (4-propeller engines, long fuselage),
flying slowly with subtle eye-shape watching overlay, amber warning glow, dark
background, vector minimal, 4-sec loop, Telegram sticker 512x512
--ar 1:1 --style raw --v 6
```

**LottieFiles:** `bomber plane silhouette`, `military aircraft`, `surveillance plane`

---

## 2. Персонажні емодзі (custom emoji set)

Створити окремий **emoji set** (не стікер-пак) через `@stickers` → `/newemojipack`. Розмір: **100x100 px**, статичні WebP або анімовані .tgs.

### Ежик — 4 вирази

#### 2.1 `EZHYK_NEUTRAL` (нейтральний, для підпису)

**Prompt:**
```
Cute minimalist hedgehog character, small round body covered in subtle spikes,
calm neutral facial expression, big eyes, ukrainian style folk slight, sitting
upright, frontal view, vector flat illustration, transparent background, 100x100px
emoji sticker, warm brown-amber colors, friendly and gentle
--ar 1:1 --style raw --v 6
```

#### 2.2 `EZHYK_SLEEPY` (нічний дайджест, спокій)

**Prompt:**
```
Cute hedgehog with eyes closed sleeping peacefully, small "Z" symbol floating
above head, curled into half-ball position, soft amber color, transparent
background, emoji 100x100, vector flat, calm and cozy feeling
--ar 1:1 --style raw --v 6
```

#### 2.3 `EZHYK_SAFE` (ALL CLEAR confirmation)

**Prompt:**
```
Cute hedgehog raising tiny paw with thumbs-up gesture, confident expression,
small green checkmark sparkle nearby, vector flat illustration, transparent
background, emoji 100x100px, warm amber-brown color, reassuring
--ar 1:1 --style raw --v 6
```

#### 2.4 `EZHYK_HEART` (love expression, only soft moments)

**Prompt:**
```
Cute hedgehog holding a small red heart close to chest with both paws, eyes
closed in blissful expression, soft amber color, transparent background, emoji
100x100, vector flat, kawaii but not childish
--ar 1:1 --style raw --v 6
```

### Мишка — 4 вирази

#### 2.5 `MISHKA_NEUTRAL` (підпис "— М.")

**Prompt:**
```
Cute minimalist bear character (мишка), small round body, warm brown color,
gentle watchful expression, sitting upright frontal view, vector flat
illustration, transparent background, 100x100px emoji, protective gentle feel
--ar 1:1 --style raw --v 6
```

#### 2.6 `MISHKA_WATCHING` (під час моніторингу)

**Prompt:**
```
Cute brown bear with paw raised to eyes (looking-far gesture), alert but calm
expression, scanning the distance, vector flat, transparent background, emoji
100x100, watchful protective stance
--ar 1:1 --style raw --v 6
```

#### 2.7 `MISHKA_HUG` (check-in, comfort)

**Prompt:**
```
Cute brown bear opening arms wide for a hug, warm welcoming expression, soft
amber-brown color, transparent background, emoji 100x100, vector flat
illustration, comforting and safe feeling
--ar 1:1 --style raw --v 6
```

#### 2.8 `MISHKA_WORRIED` (post-event self-report)

**Prompt:**
```
Cute brown bear with slightly concerned expression, one paw at cheek, worried
but caring look, vector flat illustration, transparent background, emoji
100x100px, soft empathetic feeling
--ar 1:1 --style raw --v 6
```

---

## 3. Промо/постер гіфки

Для зовнішнього показу (твоя сторінка, GitHub README, presentation), **не** для самого бота.

### 3.1 Hero GIF — "як це працює" demo

**Prompt (Sora/Pika):**
```
8-second cinematic demo: dark Ukrainian night sky over Dnipro city silhouette,
red drone trail appearing from east, RED ALERT flash on smartphone screen
showing map with concentric circles around a small home icon, then green
'protected' confirmation, ending with bear character holding heart at center.
Cinematic mood, navy-red-amber palette, vector animation style, 1920x1080
horizontal, no text
```

### 3.2 Feature highlight loops (3-5 секунд кожна)

Кожна фіча — окрема коротка loop-ка для соц-постів:

```
1. "Live Threat Dashboard": animated map update, threat marker moving every 5sec,
   ETA countdown ticker visible. 5-sec loop, vector flat.

2. "Multi-LLM Vision Race": two parallel "thinking" indicators (Claude + Gemini),
   first to finish wins, image of map flowing through. 4-sec loop.

3. "Voice Call Escalation": phone icon ringing, calling Mishka silhouette, then
   handset answer, voice waves visualizing. 4-sec loop.

4. "Family Circle Safety": ring of glowing person icons, when one alerts (red)
   others light up green for confirmation. 5-sec loop.

5. "Pre-Alert from Launch": satellite icon detects launch in distant area,
   warning travels across map to home icon. 6-sec loop.
```

Style для всіх: vector flat, navy-amber-red palette, minimal, no text overlays (текст накладається окремо у Figma/CapCut).

---

## 4. Telegram Bot Logo (avatar 640x640)

Це **обличчя бота** — кругла іконка в чат-листі. Має:
- Бути впізнаваною на 32×32
- Не мати text (текст не читається в малому розмірі)
- Працювати в light і dark mode
- Мати індивідуальність + сенс місії

Окремий промпт для кожного з 5 варіантів імені (див. `NAMING_AND_LOGO.md`). Тут — узагальнені принципи + 5 готових промптів.

### Шаблон Midjourney prompt structure:
```
[concept], minimalist vector logo, [color palette], centered composition,
flat design, no text, no letters, recognizable at small size, premium
clean aesthetic, [mood] feeling, square 1:1 format, 640x640,
solid or simple gradient background, suitable for Telegram bot avatar
--style raw --v 6 --ar 1:1
```

(Детальні промпти для кожної назви — у файлі `NAMING_AND_LOGO.md`)

---

## 5. Технологічний пайплайн створення

### Для статичних емодзі і простих стікерів (.webp 100×100):

1. Midjourney → згенерувати ілюстрацію
2. Photoroom або remove.bg → прозорий фон
3. Squoosh (https://squoosh.app) → конвертувати в WebP, оптимізувати
4. Завантажити через @stickers як emoji pack

### Для анімованих стікерів (.tgs Lottie до 64 KB):

1. **Шлях 1 (швидкий):** скачати готову анімацію з https://lottiefiles.com (фільтр по `free for commercial use`)
   - Конвертувати у .tgs через https://lottiefiles.com/tools/lottie-to-tgs або lottieconvert
2. **Шлях 2 (custom):**
   - Згенерувати референс-картинку через Midjourney
   - Створити анімацію в After Effects + плагін `Bodymovin` (експорт у Lottie JSON)
   - Конвертувати JSON → .tgs (стиснутий Lottie для Telegram)
   - Обмеження Telegram: до 64 KB, до 3 сек, до 60 fps

### Для video stickers (.webm):

1. **Шлях 1:** Sora / Runway Gen-3 / Pika → відео 3-5 сек
2. **Шлях 2:** Midjourney static → Pika img2vid → loop edit
3. Конвертувати у .webm через ffmpeg:
   ```
   ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 32 -b:v 256k -an -t 3 \
          -vf "scale=512:512" output.webm
   ```
4. Обмеження Telegram: до 256 KB, 3 сек, 30 fps, без audio

### Для бота-аватару:

1. Midjourney → 4 варіанти
2. Вибрати найкращий
3. Figma → docrop у круг (Telegram автоматично кропить, але краще завчасно)
4. Експорт PNG 640×640
5. Завантажити через @BotFather → `/setuserpic`

---

## 6. Бюджет на візуальні активи

| Що | Спосіб | Вартість |
|---|---|---|
| 13 стікерів (готові Lottie) | LottieFiles + конвертер | $0 |
| 13 стікерів (custom Sora/Pika) | API generation | ~$30-50 |
| 13 стікерів (After Effects custom) | Фрілансер на Upwork | $150-400 |
| 8 персонажних емодзі (статичні) | Midjourney + Photoroom | ~$10 |
| 8 персонажних емодзі (анімовані) | Lottie + конвертер | ~$10-20 |
| Логотип бота | Midjourney | $0 (підписка) |
| 5 промо-loop'ів | Sora/Runway | ~$20-30 |

**Total one-time:** ~$30-50 mvp / $150-300 premium.

---

## 7. Запит до Claude Code при роботі з активами

Коли всі асети готові, дай Claude інструкцію:

```
Створи src/air_guard/bot/stickers.py з file_id константами для всього
sticker-пака `Air Guard Alerts` та emoji-пака `Air Guard Characters`.
Я надам тобі file_id'и нижче. Реалізуй STICKER_BY_THREAT мапу як описано
в MASTER_PROMPT.md, плюс send_alert_with_sticker() helper.

File IDs стікерів:
SIREN_ROTATING: CAACAgIA...
DRONE_INCOMING_RED: CAACAgIA...
[...]
```

Бот сам пише `bot/stickers.py` модуль, ти просто підкидаєш file_id після того як завантажив пак.
