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
npm run dev
```

Если Redis не локальный, укажите URL перед запуском:

```bash
REDIS_URL=redis://<host>:6379 npm run dev
```
