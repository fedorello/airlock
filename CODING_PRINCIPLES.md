# Code Principles & Engineering Rules

> **Этот документ — мой персональный стандарт качества кода.** Применяется ко всем моим проектам без исключений. Каждая строка кода, каждый PR, каждое архитектурное решение сверяется с этим документом. Если правило здесь противоречит «удобному» подходу — выигрывает правило.
>
> **Аудитория:** все разработчики (включая AI-ассистентов), архитекторы, code-reviewers.
>
> **Жанр:** не «good practices в общем», а **enforceable rules для code review**. Каждое правило формулируется так, чтобы его можно было применить как «yes/no» проверку.

---

## 1. Главные ценности

В порядке приоритета:

1. **Корректность.** Код делает то, что заявлено. Полностью. Без скрытых ограничений.
2. **Тестируемость.** Любой участок кода тестируется в изоляции. Без mock-магии. **Цель — ≥ 90% покрытие в ключевых местах.**
3. **Архитектурная чистота.** SOLID соблюдается строго, без послаблений. DI — категорический императив.
4. **Читаемость.** Новый разработчик понимает код за полдня без объяснений.
5. **Расширяемость.** Новая фича добавляется без переписывания существующего.
6. **Производительность.** Только после первых пяти.

Когда возникает конфликт — выбираем тот вариант, который выше по списку.

---

## 2. Clean Code — конкретные правила

### 2.1. Naming

- **Идентификаторы говорящие.** `user_orders` лучше `data`. `calculate_total_cost` лучше `calc`.
- **Без аббревиатур** кроме общепринятых (HTTP, URL, ID, JSON, API, SQL, UUID). `usr` запрещено, `user` обязательно.
- **Глагол для функций, существительное для классов.** `place_order()`, не `order_placement()`. `OrderService`, не `OrderManager`.
- **Никаких `Util`, `Helper`, `Manager`, `Handler`, `Processor`.** Если класс называется так — он плохо специфицирован, разбей на конкретные.
- **Boolean: `is_*`, `has_*`, `should_*`, `can_*`.** `is_available`, не `available`.
- **Константы — UPPER_SNAKE_CASE.** Классы — `PascalCase`. Функции/методы/переменные — `snake_case` (Python) или `camelCase` (TS/JS).
- **Никаких префиксов типа `IFoo` для интерфейсов** — имя самодостаточно: `Clock`, не `IClock`. Если нужно различать с реализацией — суффикс `Protocol`: `ClockProtocol`.

### 2.2. Размеры

- **Функция/метод:** ≤ 30 строк (без декораторов/docstring). Больше — извлеки helper.
- **Класс:** ≤ 200 строк. Больше — у класса несколько ответственностей, разбей.
- **Файл:** ≤ 3000 строк. Больше — модуль слишком общий, разбей по концептам.
- **Параметры функции:** ≤ 4. Больше — собирай в параметрический объект (Pydantic / dataclass / TypeScript interface).
- **Уровень вложенности:** ≤ 3 (if/for/with/try). Больше — извлекай функцию или используй early return.
- **Длина строки:** ≤ 100 символов.

### 2.3. Типы и аннотации

- **Python:** **обязательны** type annotations на все public функции/методы/атрибуты. `mypy --strict` в CI.
- **TypeScript:** `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`. `any` запрещён без явного комментария `// eslint-disable-next-line — reason: ...`.
- **Никаких `Optional[Any]`** без обоснования. Если не знаешь тип — задизайнь.
- **Pydantic v2 (Python) / Zod (TS) для всего user input + structured data.** Никаких `dict[str, Any]` на API boundaries.
- **Domain types:** для важных бизнес-сущностей создавай отдельные типы, не используй сырые `str` / `int` (Value Objects, `NewType`, branded types).

### 2.4. Комментарии

> **⚠️ Категорический императив: ВСЕ комментарии и docstrings в коде — ТОЛЬКО на английском, простым и понятным языком.** Без исключений. Касается всех проектов, всех файлов, всех языков программирования.

- **Код объясняет ЧТО, комментарии — ПОЧЕМУ.** Никаких `# increments counter` рядом с `counter += 1`.
- **Комментарий нужен, если:** скрытый constraint, неочевидный workaround, ссылка на issue, нелогичный business-rule, неинтуитивный алгоритм, объяснение «почему именно так, а не очевидным способом».
- **Удаляй мёртвые комментарии.** `# TODO: fix later` без ссылки на issue = удали или замени корректным TODO с issue (см. §8.2).
- **Docstrings обязательны** для public функций/классов. 1–3 строки. Не пересказ кода — назначение, edge cases, инварианты.
- **В меру.** Хорошо названный код не нуждается в комментариях. Не добавляй комментарии «потому что так положено».
- **Английский — простой и понятный.** Короткие фразы. Без сленга. Без жаргона, который не понимает второй разработчик.

Примеры:

```python
# ✅ Good — explains WHY (a non-obvious constraint).
# Retry only on transient network errors; payload validation errors must surface
# so the caller can fix the request instead of looping forever.
if isinstance(error, TransientNetworkError):
    return self._retry(request)

# ❌ Bad — restates the code.
# Check if error is transient
if isinstance(error, TransientNetworkError):
    return self._retry(request)

# ❌ Bad — Russian / mixed language comment.
# Повторяем только при сетевых ошибках
```

```python
# ✅ Good docstring: purpose + edge cases, not a code retelling.
def place_order(cart: Cart, user: User) -> Order:
    """Create and persist an order from the current cart.

    Raises EmptyCartError if the cart has no items.
    Raises OutOfStockError if any item is no longer available.
    """
```

---

## 3. SOLID — строгое соблюдение

### 3.1. Single Responsibility (SRP)

- Класс — одна причина измениться.
- Метод/функция — одно действие, выраженное глаголом в названии.
- Если в названии есть `and` — точно нарушение SRP.
- Если в классе ≥ 7 публичных методов — проверь, не нарушен ли SRP.

### 3.2. Open/Closed (OCP)

- Расширение через **новые** классы/функции, не через **изменение** существующих.
- Точки расширения — через Protocol-интерфейсы + DI.
- **Никаких `if isinstance(x, ConcreteClass)` в бизнес-логике** — это нарушение OCP. Используй полиморфизм.
- **Никаких `if type_key == "...": ... elif type_key == "...":`** для управления поведением — это switch вместо полиморфизма. Регистрируй варианты через registry/factory.

### 3.3. Liskov Substitution (LSP)

- Подкласс / Protocol-имплементация должна работать вместо базы без сюрпризов.
- Не сужать precondition в наследниках. Не расширять postcondition.
- **`NotImplementedError` в наследнике запрещён** — если метод не нужен, не наследуйся; разбей интерфейс (см. ISP).
- Подкласс не должен бросать новые типы исключений, не объявленные в контракте базы.

### 3.4. Interface Segregation (ISP)

- Один Protocol — один use-case. Не «God-Protocol» на 20 методов.
- Клиент не должен зависеть от методов, которыми не пользуется.
- Если у Protocol-а ≥ 5 методов — почти всегда стоит разбить на два или более.

### 3.5. Dependency Inversion (DIP)

- **Высокоуровневые модули НЕ зависят от низкоуровневых.** Оба зависят от абстракций.
- **Зависимости — через Protocol-интерфейсы.** `PaymentGatewayProtocol`, не `StripeGateway` напрямую.
- **Внедрение — через конструктор.** Никаких `from project.gateways.stripe import gateway` внутри сервиса.
- Конкретные реализации собираются только в DI-контейнере на старте приложения.

---

## 4. DRY — но осторожно

- **Знание дублируется — плохо.** Если одна и та же business-логика в 3 местах — экстракт.
- **Похожий код ≠ дубликат.** Два места случайно похожи, но представляют разные концепты — оставь раздельно.
- **Правило 3-х:** дублирование 2 раза — оставь. С 3-го раза — реши, вытащить ли общее.
- **WET (Write Everything Twice) лучше преждевременной абстракции,** которая через 6 месяцев окажется неверной.
- Прежде чем извлекать общее — спроси: «Они правда об одном и том же концепте?»

---

## 5. KISS

- **Простой работающий код лучше элегантного сложного.**
- **Никаких метаклассов / магических декораторов / hidden imports**, если их можно избежать.
- **Никаких clever oneliner-ов.** Если строка требует 30 секунд, чтобы понять — разбей.
- **Минимум абстракций.** Каждая новая абстракция должна решать конкретную текущую проблему, а не «возможный будущий use-case».
- **YAGNI** — не строй обобщения «на будущее»: добавишь, когда понадобятся.

---

## 6. Dependency Injection — **категорический императив**

DI — фундамент всех проектов. Это **не «опция» и не «стиль» — это требование**. Без DI код не пройдёт review.

### 6.1. Правила DI (без исключений)

1. **Любая зависимость на внешний мир — через Protocol-интерфейс.**
   - БД → `XxxRepositoryProtocol`.
   - HTTP API → `XxxGatewayProtocol`.
   - LLM / AI → `LLMProviderProtocol`.
   - Время → `ClockProtocol` (чтобы тестировать `datetime.now()`).
   - Случайность → `RandomProtocol` (чтобы тесты были детерминированы).
   - UUID-генерация → `IdGeneratorProtocol`.
   - Файловая система → `FileSystemProtocol`.
   - Шина событий / сообщений → `EventBusProtocol`.
   - Логгер (если централизованный) → `LoggerProtocol`.

2. **Зависимости передаются ТОЛЬКО через конструктор.**

   ```python
   # ✅ Correct: dependencies are explicit and injectable.
   class OrderService:
       def __init__(
           self,
           orders: OrderRepoProtocol,
           payments: PaymentGatewayProtocol,
           events: EventBusProtocol,
           clock: ClockProtocol,
       ) -> None:
           self._orders = orders
           self._payments = payments
           self._events = events
           self._clock = clock

   # ❌ Forbidden: hidden, non-testable dependencies.
   class OrderService:
       def __init__(self) -> None:
           self._orders = SqlOrderRepository()  # hard-wired
           self._now = datetime.now()            # non-deterministic
   ```

3. **Никаких глобальных синглтонов на модульном уровне.**

   ```python
   # ❌ Forbidden:
   engine = create_async_engine(DATABASE_URL)  # global, non-testable

   # ✅ Correct: engine is provided by the DI container as a Singleton.
   ```

4. **Никаких `import` конкретных реализаций в слое сервисов / use-cases.**
   - `from project.gateways.stripe import StripeGateway` внутри сервиса — нарушение DIP.
   - `from project.gateways.payment.protocol import PaymentGatewayProtocol` — OK (это интерфейс).

5. **DI-контейнер один на приложение.** Работает для API + workers + scripts + tests. Единая точка сборки графа зависимостей.

6. **Тесты используют override, не monkey-patching:**

   ```python
   # ✅ Correct: container override is refactor-safe.
   with container.payment_gateway.override(FakePaymentGateway()):
       await service.place_order(...)

   # ❌ Forbidden: monkey-patching breaks on rename / move.
   monkeypatch.setattr("project.services.order_service.payment", fake)
   ```

7. **In-memory fakes, не моки на каждый метод.** Создавай `FakePaymentGateway`, `InMemoryOrderRepo` — реальные имплементации Protocol-а с in-memory state. Они **в разы устойчивее к рефакторингу**, чем `Mock(spec=...)`. Один fake переиспользуется во всех тестах.

### 6.2. Что инжектить через DI всегда

- Все клиенты внешних API.
- Все Repository (доступ к БД).
- Все источники не-детерминизма (время, случайность, UUID, system load).
- Все источники конфигурации (`Settings`).
- Все шины событий, очереди сообщений.
- Все LLM / AI-провайдеры.
- Логгеры, если централизованные.
- Любые ресурсы с lifecycle (HTTP-сессии, connection pools).

---

## 7. Без хардкода — **категорический императив**

### 7.1. Никаких magic numbers

```python
# ❌ Forbidden:
if order.total > 800:
    fee = order.total * 0.04

# ✅ Correct:
# In a project-level constants module:
FREE_SHIPPING_THRESHOLD = Decimal("800")
PROCESSING_FEE_RATE = Decimal("0.04")

# In service code:
if order.total > FREE_SHIPPING_THRESHOLD:
    fee = order.total * PROCESSING_FEE_RATE
```

### 7.2. Никаких magic strings

```python
# ❌ Forbidden:
if user.role == "admin": ...

# ✅ Correct:
class UserRole(StrEnum):
    USER = "user"
    ADMIN = "admin"

if user.role == UserRole.ADMIN: ...
```

### 7.3. Конфигурация — ТОЛЬКО через ENV / config-файлы

- **Любая настройка** = читается через `Settings` (Pydantic Settings или аналог) из ENV / `.env`.
- **Никаких** `os.getenv()` россыпью по коду. Только через DI-injected `Settings`.
- **Бизнес-параметры** (пороги, лимиты, ставки) — в центральном файле параметров, не разбросаны по коду.
- **LLM-конфиги** (модель, температура, max_tokens) — через config, не захардкожены в коде агентов.
- **Feature flags** — через DI-injected `FeatureFlagsProtocol`, не `if os.getenv(...)`.

### 7.4. Никаких environment-specific branches в production-коде

```python
# ❌ Forbidden:
if os.getenv("ENVIRONMENT") == "production":
    use_real_payment()
else:
    use_fake_payment()

# ✅ Correct:
# DI container injects the right `payment_provider` based on config.
# Service receives PaymentGatewayProtocol and does not know what's inside.
```

### 7.5. Никаких `if testing: ...` в production-коде

- Тесты подменяют поведение через DI override, не через runtime checks.
- Production-код не должен знать, что он работает в тесте.

### 7.6. Никаких warnings, никакого deprecated кода

Любой warning от tooling — это блокер на merge.

- **Python:** `ruff` warnings, `mypy` warnings, `DeprecationWarning` / `PendingDeprecationWarning` при импорте или запуске тестов.
- **TypeScript:** `tsc` любые errors. ESLint warnings = errors (`--max-warnings=0`).
- **Node:** stdlib deprecation warnings от `node` процесса.
- **Package managers:** ошибки и warnings в логах установки.
- **CSS / Tailwind:** PostCSS warnings.
- **Browser:** console warnings/errors на проде = алерт.
- **CI:** жёлтый CI = красный CI, надо чинить.

**Что значит «починить» warning:**

- Обновить версию пакета до той, что не deprecated.
- Заменить deprecated API на актуальный (`datetime.utcnow()` → `datetime.now(UTC)`).
- Удалить deprecated dependency.
- Если warning безопасен и неизбежен (например, от чужой либы) — `# noqa: WARN_CODE — reason: ...` с явным обоснованием и ссылкой на upstream-issue, по которой видно работу над патчем.

**Запрещено:**

- Игнорировать warnings, надеясь «дойдут руки потом».
- Глушить вывод (`2>/dev/null`, `--silent`) только чтобы не видеть.
- Откладывать обновления пакетов с известными deprecation-notices.

**Why:** warnings — это backlog баг-репортов от tooling. Накопление warnings = снижение signal/noise → реальные проблемы теряются в шуме. Deprecated код = в одной из следующих версий tooling-а проект сломается.

### 7.7. Datetime — timezone-aware UTC everywhere

- ✅ **Только** `datetime.now(UTC)` (Python 3.12+: `from datetime import UTC`).
- ❌ `datetime.now()` без аргумента — запрещено (даёт naive local).
- ❌ `datetime.utcnow()` — deprecated в 3.12+, запрещено.
- ❌ Naive datetimes в моделях/функциях/БД — запрещено.
- ✅ Postgres: все datetime-колонки `TIMESTAMPTZ` (никаких `TIMESTAMP WITHOUT TIME ZONE`).
- ✅ SQLAlchemy / ORM: `DateTime(timezone=True)` обязательно.
- ✅ API JSON: ISO 8601 с offset (`2026-05-14T12:00:00+00:00` или `...Z`). Pydantic v2 делает это автоматически для aware datetimes.
- ✅ Все логи и события — UTC.
- ✅ Текущее время — только через `ClockProtocol`-инжекцию. `FrozenClock` в тестах должен бросать на попытке передать naive datetime.
- ✅ Frontend конвертит UTC → user-local **только при render**, через `Intl.DateTimeFormat` с явным `locale`.
- ✅ В CI: ruff правила `DTZ001`, `DTZ005`, `DTZ007` включены (catches naive datetime usage).

### 7.8. Locale-aware data model с MVP

Даже если проект однокультурный, схема данных и API проектируются под мультилокальность с самого начала:

- ✅ Backend domain errors несут `code` + `message_key` (machine-readable), **не уже-локализованные строки**.
- ✅ Все content-таблицы с системным текстом — поле `locale TEXT NOT NULL` с CHECK whitelist допустимых локалей.
- ✅ `user.preferred_locale TEXT NOT NULL DEFAULT '<base>'` — добавляется с первой версии схемы.
- ✅ Frontend форматирование (даты, числа, валюта) — только через `Intl.*` API с явным `locale` параметром.
- ✅ User-facing строки — в отдельных модулях/константах, не inline в JSX/templates, готовы к экстракту в `messages/<locale>.json`.
- ❌ Не локализуем: brand names, product codes, URL-slugs, machine-readable error codes.

### 7.9. Никаких хардкод секретов / endpoints / model IDs

- API-keys, токены, пароли — только через ENV.
- URL-ы внешних сервисов — через `Settings` (production / staging / dev отличаются).
- Идентификаторы LLM-моделей, embedding-моделей, version-tag-ов — через конфиг.
- Никаких `https://api.production.example.com` инлайн в коде.

### 7.10. Только актуальные стабильные версии пакетов

> **⚠️ Категорический императив.** Перед добавлением **любой** зависимости (или обновлением существующей) обязательно проверить актуальную стабильную версию через web search / официальный сайт / PyPI / npm registry / GitHub releases.

- **Запрещено** копировать `^1.2.3` из старого `pyproject.toml`/`package.json` без проверки актуальности.
- **Запрещено** использовать LTS/legacy версии, если активная стабильная ветка существует и поддерживается (для прод-runtime — да; для библиотек разработчика — последняя стабильная).
- **Запрещено** добавлять зависимости без указания версии (`some-pkg = "*"` или `latest`-тег Docker-образа) — это убивает воспроизводимость билда.
- **Обязательно** фиксировать версии: точные (`==1.2.3`) для приложений, диапазоны (`~=1.2.3` / `^1.2.3`) для библиотек, всегда с lock-файлом (`uv.lock` / `pnpm-lock.yaml` / `package-lock.json`).
- **Обязательно** обновлять lock-файл, когда меняются прямые зависимости.
- **Регулярно** запускать `uv tree --outdated` / `pnpm outdated` / `npm outdated` — outdated >6 месяцев = плановый апдейт.
- **Безопасность:** SCA-скан (Dependabot / `trivy fs`) на каждом PR. Critical/High CVE = блокер merge.
- **Docker base images** — фиксируем по digest (`@sha256:...`), но базу обновляем минимум раз в квартал.
- **Минорные/патч-апдейты** — автоматически через Dependabot/Renovate в отдельный PR с прогоном CI.
- **Мажорные апдейты** — отдельным PR с проверкой changelog, breaking changes, миграционных шагов.

**Why:** старые зависимости = backlog уязвимостей + потеря возможностей оптимизации + риск, что следующая мажорная версия отъедет так далеко, что миграция станет очень дорогой.

**Practical rule for AI assistants:** перед генерацией `pyproject.toml` / `package.json` / Dockerfile — **обязательно web search** «<package> latest stable version» либо посмотреть на PyPI/npm/Docker Hub. Никогда не полагаться на знания из training data в части номеров версий — они устаревают за месяцы.

### 7.11. Python — только `uv` как менеджер пакетов

> **⚠️ Категорический императив.** Для всех Python-проектов используется **`uv`** — и только он. Никаких `pip install`, `poetry`, `pipenv`, `conda`, `virtualenv` отдельно.

- **`uv`** — единственный поддерживаемый менеджер для проектов на Python. Один инструмент закрывает: установка интерпретатора (`uv python`), создание venv, разрешение зависимостей, lock-файл (`uv.lock`), запуск команд (`uv run`), синхронизация (`uv sync`).
- `pyproject.toml` — единственный источник конфигурации зависимостей. `requirements.txt` не используется (только если внешний инструмент его требует — генерируем через `uv export`).
- **Никаких** `pip install <pkg>` внутри сценариев и CI — только `uv add <pkg>` или `uv pip install`.
- `uv.lock` коммитится. Без него билд невоспроизводим.
- В Docker: `uv` ставится первым шагом, далее `uv sync --frozen --no-dev` для prod-стадии.
- В CI: `uv sync --frozen` + `uv run <command>` (pytest, ruff, mypy).
- Обновление зависимостей: `uv lock --upgrade-package <pkg>` для точечного, `uv sync --upgrade` для общего bump (всегда в отдельном PR).

**Why:** `uv` в 10–100× быстрее pip, имеет нативный lock-файл, корректно решает граф зависимостей, поддерживает workspaces, кеш — единый. Это де-факто стандарт Python-tooling-а с 2025 года. Использование двух менеджеров одновременно (pip + poetry, например) — главный источник «у меня локально работает, а в CI нет».

### 7.12. Иконки в UI — только SVG, никаких эмодзи

> **⚠️ Категорический императив.** В пользовательском интерфейсе **запрещены эмодзи**
> (👤📍✦🕑💡🎉🗑 и любые другие pictographic-символы). Иконки — **только инлайн-SVG**.

- ✅ Единый компонент-иконка (`Icon.svelte` / `<Icon name="trash" />`) с набором SVG-путей,
  наследующих `currentColor` и принимающих `size`.
- ✅ Иконки масштабируются, перекрашиваются темой, доступны (`aria-hidden` / `aria-label`),
  рендерятся одинаково на всех платформах.
- ❌ Эмодзи рендерятся по-разному в разных ОС/шрифтах, ломают вертикальное выравнивание,
  не управляются цветом/размером и выглядят непрофессионально.
- ❌ Не использовать dingbat-глифы (`✦`, `✎`, `★`) как иконки — у них те же проблемы.
- Текстовые стрелки в CTA (`→`, `←`) допустимы как типографика; иконочные действия
  (удалить, редактировать, статус) — всегда SVG.

**Why:** эмодзи — это шрифтовые глифы вне контроля приложения: разный рендеринг, нет единого
размера/цвета, проблемы с тёмной темой и доступностью. SVG-иконки детерминированы и брендируемы.

---

## 8. Никаких подделок / костылей / халтуры

### 8.1. Если что-то не готово — НЕ симулируй за кулисами

- **Симуляция допустима только если она часть согласованного scope MVP** и **явно** обозначена в UI (например, «Place Order (Demo)»).
- **Скрытая симуляция запрещена.** Если функция объявлена как «считает X», она реально считает. Не возвращает фиксированное значение «потому что потом доделаем».

### 8.2. Никаких TODO без issue tracker

```python
# ❌ Forbidden:
# TODO: handle this case later
return None

# ✅ Correct: link to a real issue with context.
# TODO(#142): handle empty result. For now, return None — see issue for plan.
return None

# Even better — implement it now and remove the TODO.
```

### 8.3. Никаких empty catch-блоков

```python
# ❌ Forbidden:
try:
    do_something()
except Exception:
    pass  # silently swallow the failure

# ✅ Correct:
try:
    do_something()
except SpecificError as exc:
    logger.warning("operation_failed", reason=str(exc))
    # Decide explicitly: retry? default value? propagate?
```

- Никогда не ловим `Exception` без логирования и явного решения.
- Никогда не ловим `BaseException` (это включает `KeyboardInterrupt`, `SystemExit`).
- Каждый `except` — конкретный тип, с осознанной обработкой.

### 8.4. Никаких `Any` без обоснования

`Any` — escape hatch. Если используешь — комментарий рядом, объясняющий «почему именно Any нельзя избежать», и ссылка на issue, если планируется убрать.

### 8.5. Никаких частичных реализаций

Если фича на 60% работает — она **не закончена**. Edge cases — это **часть фичи**, не nice-to-have. Если edge case явно вынесен в backlog — это OK, но он должен быть **в issue**, не в коде как «потом дойдут руки».

### 8.6. Никаких «timeout = 1 hour» на retry

Чёткие, обоснованные значения timeout / retry / backoff. Никаких «поставил большое значение чтобы точно работало». Обоснование в комментарии или в архитектурном решении.

### 8.7. Никаких silent failures

- Каждая ошибка либо обрабатывается, либо логируется, либо пробрасывается. Никакого «съел и забыл».
- Каждый retry имеет верхний лимит попыток + backoff.
- Каждый async fire-and-forget имеет callback / status / монитор.

---

## 9. Чистая архитектура — слои

### 9.1. Слои бэкенда (стрелки направлены внутрь)

```
api/  →  services/  →  domain/   ← (centre, no outward deps)
                              ↑
              gateways/  ──────┘
              repositories/
              workers/
```

- **Domain** ничего не знает о HTTP-клиентах, ORM, web-фреймворках. Это чистые типы, инварианты, value objects, бизнес-правила.
- **Services / use-cases** работают только с Protocol-интерфейсами из домена. Содержат оркестрацию бизнес-логики.
- **Adapters (api/gateways/repositories/workers)** реализуют Protocol-ы. Здесь живут `httpx`, ORM, framework-specific код.

### 9.2. Запрещённые импорты (enforced через import-linter или аналог)

Domain не имеет права импортировать:

- ORM (`sqlalchemy`, `prisma`, `tortoise`, и т.п.).
- HTTP-клиенты (`httpx`, `requests`, `aiohttp`).
- Web-фреймворки (`fastapi`, `flask`, `django`).
- Кэши, очереди (`redis`, `kafka-python`, `celery`).
- Файловую систему, env, OS.
- Любые `gateways/`, `repositories/`, `api/` модули проекта.

Services не имеют права импортировать конкретные реализации gateway / repository — только их Protocol-ы.

Проверка в CI. Нарушение = красный билд.

### 9.3. Frontend feature-based

- `features/<feature>/` — самодостаточный модуль.
- Никаких cross-feature импортов кроме через `shared/`.
- Один feature ничего не знает про другой, кроме URL-роутинга.
- Состояние feature живёт внутри feature (Zustand store / Redux slice / Pinia store / etc.).

### 9.4. Структура папок (рекомендуемая, но не догма)

```
project/
├── domain/           # pure types, value objects, business rules, protocols
├── services/         # use-cases, orchestration
├── api/              # HTTP routers, request/response models
├── gateways/         # external API clients (each behind a protocol)
├── repositories/     # DB access (each behind a protocol)
├── workers/          # background tasks
├── core/
│   ├── settings.py   # Pydantic Settings
│   ├── container.py  # DI container
│   ├── logging.py    # logger setup
│   └── clock.py      # ClockProtocol + RealClock + FrozenClock
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 10. Testing — **обязательное правило**

> Цель: **≥ 90% покрытие в ключевых местах.** Покрытие — не пожелание, а условие merge.

### 10.1. Цели покрытия

- **Domain layer: ≥ 90%** line + branch coverage. Это чистые функции и invariants — ключевое место, покрываем по максимуму.
- **Services / use-cases: ≥ 90%** включая error paths.
- **Repositories / Gateways: ≥ 90%** (некоторые HTTP edge-cases дорого покрывать, остальное обязательно).
- **API endpoints: ≥ 90%** (через integration tests).
- **Frontend components: ≥ 90%** включая loading / error / empty states.
- **AI agent tools: ≥ 90%**.
- **AI agent loop / parser: ≥ 90%**.

Coverage gate в CI. Падение coverage блокирует merge.

### 10.2. Test pyramid

```
       /\
      /  \   E2E — 5–10 критических сценариев
     /----\
    /      \  Integration — repositories, gateways, events
   /--------\
  /          \ Unit — services, domain, tools — 90% всех тестов
 /____________\
```

### 10.3. Unit tests — правила

- **Изоляция** — никаких реальных БД, HTTP, файловой системы.
- **In-memory fakes** реализующие Protocol. **Не моки на каждый метод.**
- **Один концепт на тест.** Один assert или group из связанных.
- **Naming:** `test_<method>_<scenario>_<expected>`. Пример: `test_place_order_with_empty_cart_raises_error`.
- **Arrange-Act-Assert structure** — визуально разделено пустыми строками.
- **Deterministic.** Никаких `datetime.now()` или `random.randint()` — через `ClockProtocol` / `RandomProtocol`.
- **Fast.** Unit-suite целиком должен проходить за < 30 секунд.
- **Independent.** Тесты не зависят от порядка выполнения и не делят состояние.

### 10.4. Integration tests — правила

- **Реальная БД через Testcontainers (или аналог).** Не моки.
- **Каждый тест — изолированная БД** (через transactions rollback или per-test schema).
- **Тестируют слой adapter ⇄ infrastructure.** Не бизнес-логику (это unit).
- **Тестируют миграции** — `migrate up` от чистой БД проходит без ошибок.
- **Тестируют contracts с внешними API** через записанные HTTP-ответы (VCR-фикстуры или аналог).

### 10.5. E2E tests — правила

- **Real-browser automation** (Playwright или аналог) для всего frontend e2e.
- **Полный стек** через docker-compose (или аналог).
- **5–10 critical user journeys** в MVP. Не 100. Качество > количество.
- **Внешние сервисы мокируются** в e2e (детерминизм). Реальные — только в отдельной eval-suite.
- **Visual regression** для ключевых экранов.
- **Accessibility checks** через `axe` — fail на critical violations.

### 10.6. AI eval (если в проекте есть AI-агенты)

- **Каждый агент имеет golden-датасет** ≥ 30 кейсов.
- **Прогон при изменении prompts или конфигурации моделей.**
- **Metrics:** tool sequence correctness, final answer relevance, constraint adherence, no hallucination.
- **Pass rate ≥ 90%** для production-агента.
- **Regression блокирует merge** в agent-relevant PR.

### 10.7. Что **НЕ покрываем** тестами (smart exclusions)

- Сгенерированный код (например, OpenAPI client).
- Type definitions без логики.
- `main.py` точка входа (тестируется e2e).
- Pure config dictionaries (если они не computed).
- Migration scripts (тестируются integration-ом «upgrade works»).

### 10.8. Принципы тестов в одной строке

- **Test behavior, not implementation.** Тест должен пережить рефакторинг внутренностей.
- **Fakes > Mocks.** In-memory implementation Protocol-а лучше, чем `Mock(spec=...)`.
- **Reset state between tests.** Никакого global state, leaking между тестами.
- **No flaky tests.** Flaky тест = либо чинится сразу, либо удаляется.

---

## 11. Code Review Checklist

Перед merge каждый PR проверяется на:

### Архитектура

- [ ] Все зависимости через Protocol + DI?
- [ ] Domain не импортирует infrastructure?
- [ ] Сервис не импортирует concrete gateway / repository?
- [ ] Magic numbers / strings вынесены в named constants / enums?
- [ ] Конфигурация через Settings / config, а не `os.getenv` россыпью?

### Чистый код

- [ ] Naming говорящий, без аббревиатур?
- [ ] Функции ≤ 30 строк? Классы ≤ 200? Файлы ≤ 3000?
- [ ] Type annotations на всех public функциях?
- [ ] Комментарии на английском? Объясняют ПОЧЕМУ, не ЧТО?
- [ ] Нет лишних / мёртвых комментариев?

### Тесты

- [ ] Coverage не упал?
- [ ] Unit tests на новую логику ≥ требуемый %?
- [ ] Integration tests если задеты adapters?
- [ ] E2E если новый user-facing функционал?
- [ ] Deterministic? (нет `datetime.now`, `random`, network calls)?
- [ ] Используются in-memory fakes, не Mock?

### Безопасность

- [ ] Pydantic / Zod validation на input?
- [ ] PII / секреты не логируются?
- [ ] Secrets не в коде / коммитах?
- [ ] Rate limiting на новых mutating endpoints?

### Документация

- [ ] OpenAPI обновлён (для FastAPI / NestJS — автоматически)?
- [ ] Architectural decision (ADR) записан, если решение системное?
- [ ] README / changelog обновлён, если breaking change?
- [ ] Сообщения коммитов соответствуют Conventional Commits (§13)? Breaking change помечен `!` / `BREAKING CHANGE`?

---

## 12. Anti-patterns — категорически запрещено

Сводный список (детали в каждой секции выше):

- ❌ Глобальные синглтоны на module-level (`db = create_engine(...)` в импорте).
- ❌ Прямой импорт реализаций в `services/`.
- ❌ Прямые SQL-запросы / ORM-вызовы в API-роутерах.
- ❌ Прямые `httpx.get()` / `fetch()` в сервисах.
- ❌ Magic numbers / magic strings.
- ❌ `if os.getenv("TESTING")` в production-коде.
- ❌ `Any` без обоснования.
- ❌ Empty `except Exception: pass`.
- ❌ Захардкоженные LLM-модели / API-ключи / endpoints.
- ❌ Моки на каждый метод (вместо in-memory fakes).
- ❌ Логика в миграциях БД (только schema changes).
- ❌ God-services / God-functions / God-Protocols.
- ❌ Custom auth (используем готовые проверенные библиотеки).
- ❌ Преждевременное микросервис-разделение.
- ❌ Optimistic UI без verification ответа сервера.
- ❌ TODOs без issue tracker.
- ❌ Naming через аббревиатуры (`usr`, `mgr`, `util`, `obj`).
- ❌ Эмодзи в UI (см. §7.12) — только SVG-иконки.
- ❌ Комментарии и docstrings не на английском.
- ❌ Naive datetime (без timezone).
- ❌ `NotImplementedError` в концевом наследнике.
- ❌ Глушение warnings / deprecation notices.
- ❌ Коммиты не по Conventional Commits / бессмысленные сообщения (`wip`, `fix`, `update`) (§13).

---

## 13. Git и сообщения коммитов — **Conventional Commits обязательны**

> Сообщения коммитов — это машинно-читаемая история проекта. Они питают автогенерацию changelog,
> semantic-versioning и навигацию по истории. Свободная форма ломает всё это, поэтому формат —
> **категорический императив**, проверяемый как «yes/no» (через commitlint в CI / git-хук).

### 13.1. Формат — Conventional Commits 1.0.0

```
<type>(<scope>)<!>: <description>

[optional body]

[optional footer(s)]
```

- **type** (обязателен, нижний регистр) — один из:
  `feat` (новая функциональность), `fix` (исправление бага), `docs` (только документация),
  `test` (только тесты), `refactor` (без изменения поведения), `perf` (производительность),
  `build` (сборка/зависимости), `ci` (CI-конфигурация), `chore` (рутина без прод-кода),
  `style` (форматирование), `revert` (откат коммита).
- **scope** (опционален, в скобках) — затронутая область: имя крейта/модуля/фичи
  (`feat(genome): ...`, `fix(sim): ...`, `docs(gdd): ...`).
- **description** — краткое, в **повелительном наклонении на английском**, со строчной буквы, без
  точки в конце, ≤ 72 символа в заголовке. («add splice validation», не «added/adds/Added.»).
- **body** (опционален) — ПОЧЕМУ и контекст; перенос строки после заголовка обязателен.
- **footer** — `Refs #123` / `Closes #123` для связи с issue; `Co-Authored-By:` при необходимости.

### 13.2. Breaking changes

- Маркер `!` перед `:` (`feat(protocol)!: change wire format`) **и/или** футер
  `BREAKING CHANGE: <описание>`.
- Breaking change в публичном контракте (API, формат событий, wire-протокол) — всегда помечается;
  это влияет на semver-major.

### 13.3. Правила

- **Один коммит — одно логическое изменение.** Не смешивать `feat` и несвязанный `refactor`.
- **Заголовок ≤ 72 символа**, тело — по строкам ≤ 100 символов.
- **Язык — английский** (как и все комментарии, §2.4).
- **Запрещены бессмысленные сообщения:** `wip`, `fix`, `update`, `stuff`, `.`, `asdf` — merge-блокер.
- **Тип соответствует содержимому:** коммит, меняющий только тесты, — `test`, не `feat`.
- **Enforcement:** `commitlint` (config `@commitlint/config-conventional`) + git-хук (`husky`/
  `lefthook` / `pre-commit`) локально, и проверка в CI на каждый PR. Жёлтый CI = красный (§7.6).

```
# ✅ Good
feat(genome): surface recessive thermal gene on crossbreed
fix(sim): clamp expressed traits to [0,100] to prevent overflow
docs(gdd): add 09-SHIPS hull/module stat tables
refactor(net)!: switch wire format from JSON to postcard

BREAKING CHANGE: clients older than v0.3 can no longer decode snapshots.

# ❌ Bad
update stuff
fixed bug
WIP
Добавил новую механику        # not English, no type
```

---

## 14. Когда правило можно нарушить

**Никогда без публичного обоснования.**

Если есть веская причина — фиксируется architectural decision record (ADR) с объяснением:

- Какое правило нарушаем.
- Почему альтернативы хуже (с конкретными trade-offs).
- Какие последствия (technical debt, риски).
- Когда планируется вернуться к правилу (если применимо) + триггер пересмотра.

«Я знаю как лучше» — не аргумент. Аргумент — конкретное измеримое преимущество, согласованное с командой.

---

## 15. Применение этого документа

- **В onboarding:** новый разработчик читает этот документ первым делом.
- **В code review:** reviewer цитирует конкретный пункт при отклонении PR.
- **В CI:** automated checks (formatter, linter, type-checker, import-linter, coverage gate) форсируют то, что можно форсировать машинно.
- **В AI memory:** этот документ сохранён — все AI-assisted PR соответствуют правилам автоматически.
- **В новых проектах:** копируется в репозиторий первым коммитом, до любого кода.

Документ — живой. Каждое уточнение/правило, выявленное в работе, добавляется PR-ом сюда (с обоснованием в commit message). Изменения, противоречащие духу документа, требуют ADR.

---

## 16. TL;DR

> **Чистый код, чистая архитектура, строгое SOLID, никакого хардкода, никаких костылей, всё честно через DI, всё на ≥ 90% покрыто тестами с in-memory fakes, ВСЕ комментарии и docstrings — на английском, коммиты по Conventional Commits. Любое исключение требует ADR.**
