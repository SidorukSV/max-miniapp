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

# CORS allowlist (через запятую)
# В production указывайте только реальные домены фронта.
# В development localhost добавляется автоматически в коде.
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

Запуск:

```bash
cd backend
npm run dev
```

> Не коммитьте `.env` в репозиторий. Для команды храните production-секреты в менеджере секретов (например, 1Password Secrets Automation, HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Doppler).

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
