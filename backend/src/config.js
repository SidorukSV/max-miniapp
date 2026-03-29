import dotenv from "dotenv";

dotenv.config();

function parseOneCConfigs(rawOneCConfigs) {
    if (!rawOneCConfigs) {
        return [];
    }

    let parsed;
    try {
        parsed = JSON.parse(rawOneCConfigs);
    } catch {
        throw new Error("ONEC_CONFIGS must be a valid JSON array");
    }

    if (!Array.isArray(parsed)) {
        throw new Error("ONEC_CONFIGS must be a JSON array");
    }

    return parsed.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new Error(`ONEC_CONFIGS[${index}] must be an object`);
        }

        const cityId = typeof item.cityId === "string" ? item.cityId.trim() : "";
        const url = typeof item.url === "string" ? item.url.trim() : "";
        const basicAuth = typeof item.basicAuth === "string" ? item.basicAuth.trim() : "";

        if (!cityId) {
            throw new Error(`ONEC_CONFIGS[${index}].cityId is required`);
        }

        if (!url) {
            throw new Error(`ONEC_CONFIGS[${index}].url is required`);
        }

        if (!basicAuth) {
            throw new Error(`ONEC_CONFIGS[${index}].basicAuth is required`);
        }

        return {
            cityId,
            url,
            basicAuth,
        };
    });
}

export const config = {
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || "dev-super-secret-jwt-key",
    citySelectionEnabled: process.env.CITY_SELECTION_ENABLED === "true",
    defaultCityId: process.env.DEFAULT_CITY_ID || null,
    maxBotToken: process.env.MAX_BOT_TOKEN || "",
    maxInitDataMaxAgeSeconds: Number(process.env.MAX_INIT_DATA_MAX_AGE_SECONDS || 300),
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    redisConnectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
    oneCConfigs: parseOneCConfigs(process.env.ONEC_CONFIGS),
};
