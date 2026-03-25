import { getRedisClient } from "./redisClient.js";

const REFRESH_TOKEN_PREFIX = "refresh_token:";

function getRefreshTokenKey(jti) {
    return `${REFRESH_TOKEN_PREFIX}${jti}`;
}

export async function saveRefreshToken(jti, data) {
    const redis = await getRedisClient();
    const ttlSeconds = Math.max(1, Math.ceil((data.expiresAt - Date.now()) / 1000));

    await redis.set(getRefreshTokenKey(jti), JSON.stringify(data), {
        EX: ttlSeconds,
    });
}

export async function getRefreshToken(jti) {
    const redis = await getRedisClient();
    const payload = await redis.get(getRefreshTokenKey(jti));

    if (!payload) return null;

    return JSON.parse(payload);
}

export async function deleteRefreshToken(jti) {
    const redis = await getRedisClient();
    await redis.del(getRefreshTokenKey(jti));
}
