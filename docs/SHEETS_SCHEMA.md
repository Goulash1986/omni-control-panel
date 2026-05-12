# Структура Google Sheets

Все листы создаются автоматически функцией `setup()` в Apps Script.
Первая строка каждого листа — заголовки колонок. Не переставляй их.

## Categories — категории контента
| Колонка | Тип | Описание |
|---|---|---|
| id | number | ID |
| name | string | Название |
| icon | string | Эмодзи |
| sort_order | number | Порядок |
| created_at | datetime | |

## Posts — карточки контента / задачи
| id | number |
| cat_id | number | связь с Categories |
| title | string | |
| text | string | |
| poster_url | string | URL картинки в Drive |
| buttons | json | массив `[{text, url, clicks}]` |
| scheduled_date | string | `YYYY-MM-DD` (канбан) |
| scheduled_time | string | `HH:mm` |
| status | string | `draft` / `scheduled` / `sent` / `cancelled` |
| sent_at | datetime | |
| created_at | datetime | |

## Ads — рекламные кампании
| id, client, contact, text, poster_url, price, currency, pub_at, del_after, status, created_at |

- `status`: `pending` / `active` / `done` / `cancelled`
- `del_after`: часов до автоматического снятия рекламы (0 — не снимать)

## Hero — карточки персонажа (до 6 активных)
| id, title, text, emoji, poster_url, active, sort_order, created_at |

## Team — команда (доступ к панели)
| id, tg_user_id, name, username, role, status, added_at |

- `role`: `owner` / `admin` / `member` / `pending`
- `status`: `active` / `pending` / `banned`

## Inbox — сообщения из соцсетей и от бота
| id, source, from_id, from_name, message, type, received_at |

- `source`: `telegram` / `instagram` / `tiktok` / `threads`
- `type`: `unread` / `starred` / `archived` / `warn`

## Finance — финансовые операции
| id, kind, category, amount, currency, note, ref_kind, ref_id, occurred_at, created_at |

- `kind`: `income` / `expense`
- `ref_kind` / `ref_id`: автосвязь — если запись родилась из активации рекламы, тут будет `ad` + ID

## Habits — привычки
| id, name, icon, frequency, target_per_week, streak, last_done_at, archived, sort_order, created_at |

## HabitsLog — отметки выполнения
| id, habit_id, done_at, note |

Каждая отметка = одна строка. По умолчанию бот считает streak по уникальным датам (YYYY-MM-DD).

## Notifications — нотификации панели
| id, icon, text, detail, channel, read, created_at |

- `channel`: `panel` / `bot` / `both`

## Settings — key-value хранилище для пользовательских настроек
| key, value, updated_at |

## Auth — одноразовые токены входа
| token, kind, tg_user_id, api_key, created_at, used_at, expires_at |

Удаляются автоматически после истечения (hourly trigger).

## Sessions — сессии браузеров/Mini App
| api_key, tg_user_id, label, created_at, last_seen, revoked |

TTL 60 дней (без активности). Можно отозвать вручную, поставив `revoked = TRUE`.

## DriveFiles — индекс файлов в папке Drive
| id, file_id, mime, kind, ref_id, url, owner_tg, created_at |

## ConvState — состояние диалога с ботом
| tg_user_id, state, data, updated_at |

Когда бот ждёт от тебя следующего шага (например, после `/add` → выбрал «расход»),
тут лежит текущая фаза. Очищается `/cancel`.

---

## Можно редактировать руками?

Да — это обычные Google Sheets. Открыл лист, поменял ячейку, сохранил.
Бот и панель при следующем обращении подхватят изменение.

Безопасные правки:
- Любые тексты, числа, даты
- Удалить строку с устаревшей записью

Чего лучше не делать:
- Менять `id` существующих записей (на них могут ссылаться ref_id)
- Переименовывать колонки/листы (схема ломается)
- Удалять листы (на следующем запросе `setup()` пересоздаст пустые, но текущие данные потеряешь)
