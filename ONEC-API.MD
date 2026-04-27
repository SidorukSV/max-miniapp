# ONEC API

## Авторизация для 1C

### `POST /api/v1/auth/onec`

Отдельный метод авторизации для интеграции 1C.  
Используется тот же JWT-механизм, что и для остальных каналов (access + refresh token), но канал фиксирован как `channel=1c`.

#### Входной payload

```json
{
  "proof": {
    "cityId": "city-a",
    "totp_code": "123456"
  },
  "device_id": "onec-sync-worker-01"
}
```

- `proof.cityId` — обязательный ID города (из `onec-configs.yml`).
- `proof.totp_code` — обязательный TOTP код.
- применяется анти-брутфорс защита: лимит попыток и временный lockout, при неверном proof возвращается унифицированная ошибка `auth_attempt_failed`, при превышении лимита — `auth_rate_limited` (429 + `Retry-After`).
- TOTP секрет берётся из `onec-configs.yml` у соответствующего города: `onecTotpSecret`.

#### Успешный ответ

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "expires_in": 900,
  "channel": "1c"
}
```

## Загрузка каталога категорий из 1C

### `POST /api/v1/catalogs/categories/`

Метод принимает структуру категории из 1C и сохраняет её в Redis для дальнейшей реализации умного поиска.

Требования:
- `Authorization: Bearer <access_token>` обязателен;
- токен должен быть выпущен через `POST /api/v1/auth/onec` и содержать `channel=1c`.
- `cityId` для Redis-ключа берётся из `city_id` в JWT (из `proof.cityId` при авторизации).

#### Входной payload

```json
{
  "categoryId": "00000000-0000-0000-0000-000000000000",
  "appointment_type": "online",
  "isCartAllow": true,
  "isDateRequired": true,
  "isDoctorRequired": true,
  "employees": [
    {
      "doctorId": "00000000-0000-0000-0000-000000000001",
      "doctorTitle": "Врач",
      "doctorLastname": "Иванов",
      "doctorFirstname": "Иван",
      "doctorPatronymic": "Иванович",
      "doctorDuration": 30,
      "specializations": [
        "00000000-0000-0000-0000-000000000010"
      ]
    }
  ],
  "specializations": [
    {
      "specializationId": "00000000-0000-0000-0000-000000000010",
      "specializationTitle": "Терапия",
      "appointment_type": "phone",
      "appointment_phone": "+79990000000"
    }
  ],
  "services": [
    {
      "serviceId": "00000000-0000-0000-0000-000000000100",
      "serviceTitle": "Первичный приём",
      "servicePrice": 2500,
      "serviceDuration": 30,
      "specializationId": "00000000-0000-0000-0000-000000000010"
    }
  ]
}
```

#### Валидация

- `categoryId`, `doctorId`, `specializationId`, `serviceId` — UUID;
- `appointment_type` — одно из:
  - `online`
  - `phone`
  - `phone_and_chat`
- флаги `isCartAllow`, `isDateRequired`, `isDoctorRequired` — boolean;
- `employees`, `specializations`, `services` — массивы с валидной структурой.

#### Успешный ответ

```json
{
  "ok": true,
  "key": "onec:catalogs:category:<cityId>:<categoryId>"
}
```

## Хранение в Redis

Каждая категория сохраняется по ключу:

`onec:catalogs:category:<cityId>:<categoryId>`

Значение: JSON объекта категории + служебное поле `updatedAt` (ISO timestamp).
