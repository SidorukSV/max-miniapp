# max-miniapp

## Backend: Redis для sessions и refresh tokens

Теперь backend хранит:
- `auth sessions` в Redis с TTL 5 минут;
- `refresh tokens` в Redis с TTL до истечения срока токена.

По умолчанию backend подключается к:
- `REDIS_URL=redis://127.0.0.1:6379`

Дополнительные переменные:
- `REDIS_CONNECT_TIMEOUT_MS=5000`

### Установка Redis

#### Вариант 1 (рекомендуется): Docker
```bash
docker run -d --name max-miniapp-redis -p 6379:6379 redis:7-alpine
```

Проверка:
```bash
docker exec -it max-miniapp-redis redis-cli ping
# ожидаемый ответ: PONG
```

#### Вариант 2: Ubuntu / Debian
```bash
sudo apt update
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping
```

#### Вариант 3: macOS (Homebrew)
```bash
brew install redis
brew services start redis
redis-cli ping
```

### Запуск backend

```bash
cd backend
npm install
# 1) создайте .env на основе примера ниже
# 2) заполните обязательные значения
npm run dev
```

`JWT_SECRET` обязателен. Backend завершит запуск с ошибкой, если:
- переменная отсутствует или пустая;
- длина меньше `32` символов;
- секрет не содержит минимум 3 из 4 классов символов: `A-Z`, `a-z`, `0-9`, спецсимволы.

Рекомендуется генерировать `JWT_SECRET` как случайную строку высокой энтропии (например, через password manager или `openssl rand`).

Если Redis не локальный, укажите URL перед запуском:

```bash
JWT_SECRET='YourStrongRandomSecretAtLeast32Chars!2026' REDIS_URL=redis://<host>:6379 npm run dev
```

### Заполнение `.env` (рекомендуемый способ)

Создайте файл `backend/.env`:

```env
# Обязательные
JWT_SECRET=replace_with_strong_random_secret

# Опциональные (с дефолтами)
PORT=3000
NODE_ENV=development
REDIS_URL=redis://127.0.0.1:6379
REDIS_CONNECT_TIMEOUT_MS=5000
MAX_INIT_DATA_MAX_AGE_SECONDS=300

# Приём клиентских логов
# Альтернативная авторизация для /api/v1/send-log (если нужен сервисный доступ без JWT)
LOGS_INTERNAL_API_KEY=
# Ограничение запросов на /api/v1/send-log в минуту на IP
LOGS_RATE_LIMIT_PER_MINUTE=30

# CORS allowlist (через запятую)
# В production указывайте только реальные домены фронта.
# В development localhost добавляется автоматически в коде.
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# Refresh-cookie (cookie-based auth refresh flow)
# Имя cookie для refresh-токена
REFRESH_COOKIE_NAME=refresh_token
# SameSite: none|lax|strict (по умолчанию none)
REFRESH_COOKIE_SAMESITE=none
# Secure-атрибут cookie (по умолчанию true в production, иначе false)
REFRESH_COOKIE_SECURE=false

# Dev TOTP proof для localhost/web авторизации
# Base32-секрет (например, из 1Password/Google Authenticator)
DEV_TOTP_SECRET=
# Период TOTP в секундах (по умолчанию 30)
DEV_TOTP_PERIOD_SECONDS=30
# Допустимое окно дрейфа по шагам (по умолчанию 1)
DEV_TOTP_WINDOW=1
```

Запуск:

```bash
cd backend
npm run dev
```

> Не коммитьте `.env` в репозиторий. Для команды храните production-секреты в менеджере секретов (например, 1Password Secrets Automation, HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Doppler).

### Переменные refresh-cookie

- `REFRESH_COOKIE_NAME` — имя cookie, в которой backend хранит refresh-токен.
- `REFRESH_COOKIE_SAMESITE` — политика `SameSite` (`none`, `lax`, `strict`).
- `REFRESH_COOKIE_SECURE` — включает атрибут `Secure` для refresh-cookie.
  - если не задано, backend использует `true` при `NODE_ENV=production`, иначе `false`;
  - в production рекомендуется всегда использовать `Secure=true` и HTTPS.

### Где и как генерировать `JWT_SECRET`

Требования backend: минимум 32 символа и минимум 3 из 4 классов (`A-Z`, `a-z`, `0-9`, спецсимволы).

Практичные варианты:

1. **OpenSSL (локально в терминале):**
   ```bash
   openssl rand -base64 48
   ```
2. **Node.js (без сторонних утилит):**
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```
3. **Password manager** — сгенерируйте random password/string длиной 48–64 символа и сохраните в защищённом vault.

Рекомендации по безопасности:
- не отправляйте `JWT_SECRET` в чаты, тикеты и логи;
- не храните в коде/README реальные значения;
- ротируйте секрет при компрометации и по регламенту;
- для production используйте только секреты из secret manager/CI variables.

## Конфиг oneC в отдельном `.yml`

Backend теперь поддерживает загрузку `oneCConfigs` из YAML-файла.

- Путь по умолчанию: `backend/onec-configs.yml` (если запускать из папки `backend`, то просто `onec-configs.yml`).
- Можно указать свой путь через `ONEC_CONFIGS_FILE`.
- Для примера используйте `backend/onec-configs.example.yml`.

Пример запуска с кастомным путем:

```bash
cd backend
ONEC_CONFIGS_FILE=./onec-configs.example.yml npm run dev
```

> `ONEC_CONFIGS` (JSON в env) оставлен как fallback для обратной совместимости.


### Dev TOTP proof для localhost (код из приложения-аутентификатора)

Для `channel=web` в `NODE_ENV!=production` backend теперь требует `proof.totp_code`.
Код берётся разработчиком из приложения-аутентификатора на устройстве (Google Authenticator, 1Password, Aegis и т.д.).

1. Задайте `DEV_TOTP_SECRET` в `backend/.env` (Base32).
2. Добавьте этот же секрет в TOTP-приложение на устройстве разработчика.
3. Перезапустите backend и frontend.
4. На `localhost` при авторизации введите телефон и текущий 6-значный код из приложения.

> В production TOTP-проверка для web-канала отключена этим механизмом (проверка выполняется только в non-production).

## Production Docker + HTTPS (для демо бета-версии)

Добавлена production-схема развёртывания для сценария, где frontend публикуется на уже подготовленном Apache:
- `backend` (Node.js/Fastify) в Docker;
- `redis` в Docker;
- backend поднимается сразу по `https://` (TLS на самом backend);
- frontend собирается Docker-сборкой в папку `frontend-dist` и затем публикуется через ваш Apache.

### 1) Подготовка backend-конфига

```bash
cp backend/.env.production.example backend/.env.production
```

Обязательно задайте:
- сильный `JWT_SECRET`;
- `CORS_ALLOWED_ORIGINS` на ваш HTTPS-домен Apache;
- пути к TLS-сертификатам (`HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`).

### 2) Подготовка TLS-сертификатов для backend

Backend ожидает сертификаты в контейнере по путям из env (по умолчанию `./certs/...`).
С `docker-compose.prod.yml` локальная папка `deploy/certs` монтируется в `/app/certs`.

Минимальный вариант для демо (self-signed):

```bash
mkdir -p deploy/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deploy/certs/privkey.pem \
  -out deploy/certs/fullchain.pem \
  -subj "/CN=api.localhost"
```

### 3) Запуск backend + redis

```bash
docker compose -f docker-compose.prod.yml up -d --build backend redis
```

После запуска backend будет доступен на `https://<host>:3443`.

### 4) Сборка frontend в Docker (для публикации на Apache)

```bash
mkdir -p frontend-dist
docker compose -f docker-compose.prod.yml --profile tools run --rm frontend-build
```

Готовый production-бандл появится в `frontend-dist/` — эту папку публикуйте вашим Apache как DocumentRoot (или копируйте в нужный virtual host).

### 5) Что проксировать в Apache

На Apache оставьте отдачу статики из `frontend-dist` и проксируйте API-запросы `/api/` на backend:
- `https://<backend-host>:3443/api/...`

Важно: frontend должен обращаться к API через HTTPS-адрес Apache/домена (например, `https://app.example.com/api/v1`), чтобы не было mixed content.
