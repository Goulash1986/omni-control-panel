# Air Guard Bot — план та матеріали

Папка з усією підготовкою для розробки персонального бота повітряної безпеки для жителя Дніпра.

## Файли

| Файл | Призначення |
|---|---|
| [`SETUP_CHECKLIST.md`](./SETUP_CHECKLIST.md) | **Почни звідси.** Покроковий чек-лист: створення репо, отримання ключів, налаштування VPS, реєстрація ролей. |
| [`API_LINKS.md`](./API_LINKS.md) | Повний список всіх API/сервісів з лінками і вартістю. Готовий чек-лист реєстрацій. |
| [`NAMING_AND_LOGO.md`](./NAMING_AND_LOGO.md) | 5 варіантів імені бота з характеристиками + Midjourney/DALL-E промпти для логотипу під кожен. |
| [`ASSETS_PROMPTS.md`](./ASSETS_PROMPTS.md) | Промпти для генерації всіх анімованих стікерів, персонажних емодзі (ежик/мишка), промо-гіфок. |
| [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) | Повний промпт для нової Claude Code сесії на репозиторії `air-guard-bot`. Архітектура, всі модулі, шаблони, послідовність розробки. |
| [`NEPTUN_API_REQUEST.md`](./NEPTUN_API_REQUEST.md) | Готовий текст листа до команди NEPTUN з запитом на партнерський API доступ. |

## Як цим користуватись

1. Прочитай `SETUP_CHECKLIST.md` цілком
2. Виконай Steps 1-4 руками (~30-60 хв роботи + 1-2 дні очікування Twilio верифікації)
3. Відправ лист NEPTUN (зі `NEPTUN_API_REQUEST.md`) — паралельно
4. Створи новий приватний репо `air-guard-bot` на GitHub
5. Відкрий нову Claude Code сесію на цьому новому репо
6. Скопіюй вміст `MASTER_PROMPT.md` як перше повідомлення
7. Розробка піде по плану з 4 тижнів (з робочим прототипом до кінця Week 2)

## Огляд що буде в боті

**Захист життя через (Telegram-only у v1)**:
- Real-time агрегація з alerts.in.ua (REST polling 30s) + OSINT Telegram-каналів
- Окрема обробка для шахедів (стандартних + реактивних 238) / крилатих ракет / **балістики** / Кинджалів / КАБ — кожен тип має свій профіль швидкості та escalation timing
- Live Threat Dashboard — одне повідомлення оновлюється кожні 5 сек з картою позицій загроз і ETA
- **Два Telegram-боти** (primary + emergency) — окремі notification settings для кожного, гарантує що IMMEDIATE буде почуто
- **Telegram voice messages (.ogg)** через OpenAI TTS або ElevenLabs з voice clone Мишки
- **Telegram escalation chain**: sticker → бустер → voice .ogg → emergency bot → backup ping → family circle (без зовнішніх дзвінків)
- Анімовані стікери (sticker pack `Air Guard Alerts`) — миттєвий візуальний сигнал
- Карти через **Stadia Maps** + py-staticmaps — з її домом, районом, концентричними радіусами, укриттями
- Pre-alert з засіканням зльоту стратегічної авіації РФ (4-6 годин попередження)
- Self-watchdog на окремому VPS — якщо бот ляже, тобі прийде Telegram через окремого watchdog-бота

**Premium UX**:
- Персона "Мишка" пише ежику — у спокійних повідомленнях тепло, в IMMEDIATE — наказ для виживання
- Inline-кнопки `[Я в укритті] [Виходжу] [Без зв'язку]` — один тап, статус залогований
- Family circle — її мама/папа/подруги бачать що вона в безпеці
- Apartment-level routing — інструкція "ванна, північно-східний кут, спиною до несучої стіни" + точна адреса Савкіна 6, під'їзд 2, кв. 59, 6 поверх
- Pre-cached escape route до конкретного укриття з кодом і часом до нього
- **Графік відключень DTEK/YASNO** для її черги — попередження за 30 хв і за 5 хв
- **Live Location via 📎** — вона ділиться location через скрепку, бот динамічно перераховує ETA від її поточної точки
- **Zone monitoring** — вона малює зони (робота, дім батьків, спортзал), бот моніторить їх окремо

**Backup user (Мишка) як співпілот**:
- **Silent mirror** — backup тихо бачить все що ежик робить у боті (повідомлення, callbacks, зони, location зміни, battery) без турбування push'ами
- **Loud mirror** — критичні події (IMMEDIATE, "ежик не реагує", balance critical) прилітають з push'ом
- **`/admin` панель** — інтерактивний дашборд з auto-refresh: статус ежика, DTEK графік, баланси сервісів, system health
- **Balance monitoring + Top-up кнопки** — щоденний аудит балансів (Anthropic/OpenAI/ElevenLabs/Hetzner/B2), inline-кнопки → пряме поповнення на сайті провайдера
- **Audit log** — повна історія всіх подій з `/audit`, `/replay <event_id>` для post-mortem
- **`/her_status`** — все що з ежиком зараз (battery, location district, last interaction, inferred mood)

**Premium фічі (всі 12 включені у v1)**:
- **Conversational Mishka chat** — Claude Sonnet 4.6 в персоні Мишки, з пам'яттю (vector memory через sqlite-vec + OpenAI embeddings)
- **Voice in/out** — голосове від ежика → Whisper STT → Мишка відповідає → ElevenLabs voice .ogg
- **Trauma-aware messaging** — stress metrics, адаптивний тон, дихальні вправи
- **Threat replay GIF** — animated map з рухом загрози після major event
- **AI photo assessment** — фото підозрілого предмета → vision LLM "це загроза чи Starlink?"
- **Crisis mode `/crisis`** — continuous polling, ескалація на крок вище, ігнор quiet hours
- **Smart shelter recommender** — baseline + ML на 30 днях даних
- **Weekly podcast** — ElevenLabs Мишка-голос читає тижневий дайджест неділями
- **Document vault `/docs`** — age-encrypted сховище паспорта, медкартки, страховки
- **Battery prediction** — ML модель прогнозу заряду з урахуванням DTEK графіка
- **Auto-respond mode** — auto-acks check-in коли вона у транспорті / спить / на роботі
- **Public-friendly channel** — окремий канал зі статусами для її друзів без розкриття локації

**Operational**:
- Multi-LLM (Claude Haiku 4.5 + Gemini 2.5 Flash-Lite парально) — швидкість + надійність
- VPS **Hetzner CAX21 у Falkenstein** — ping до Telegram DC ~15-25мс (краще ніж Helsinki)
- Бюджет **~$36-46/міс** з усіма premium фічами (Telegram-only без зовнішніх дзвінків і SMS)
- Розробка 7 тижнів до повноцінного v1 з усіма premium
- **SMS і зовнішні дзвінки відключені у v1** — фокус на Telegram. Інструкція для активації у v2 збережена в `MASTER_PROMPT.md`

## Стан

| Що | Стан |
|---|---|
| Архітектура | ✅ Готова, у `MASTER_PROMPT.md` |
| Setup checklist | ✅ Готовий, у `SETUP_CHECKLIST.md` |
| Лист NEPTUN | ✅ Готовий, у `NEPTUN_API_REQUEST.md` |
| Створення репо | ⏳ Очікує дій користувача (Step 1) |
| Розробка коду | ⏳ Стартує в новій сесії на новому репо |

## Контекст

Це не звичайний side-project. Це **система життєзабезпечення** для коханої людини в зоні активних ракетних атак. Жодних компромісів по швидкості, надійності, чесності даних.
