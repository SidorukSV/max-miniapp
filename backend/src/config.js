import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const MIN_JWT_SECRET_LENGTH = 32;

function validateJwtSecret(rawSecret) {
    const jwtSecret = typeof rawSecret === "string" ? rawSecret.trim() : "";

    if (!jwtSecret) {
        throw new Error(
            "JWT_SECRET is required. Set a non-empty secret in environment variables before starting the backend."
        );
    }

    if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long.`);
    }

    const hasUppercase = /[A-Z]/.test(jwtSecret);
    const hasLowercase = /[a-z]/.test(jwtSecret);
    const hasDigit = /[0-9]/.test(jwtSecret);
    const hasSpecial = /[^A-Za-z0-9]/.test(jwtSecret);
    const classesMatched = [hasUppercase, hasLowercase, hasDigit, hasSpecial].filter(Boolean).length;

    if (classesMatched < 3) {
        throw new Error("JWT_SECRET must include at least 3 of 4 character classes: uppercase, lowercase, digits, special symbols.");
    }

    return jwtSecret;
}

function normalizeOneCConfigs(parsed, sourceLabel) {
    if (!Array.isArray(parsed)) {
        throw new Error(`${sourceLabel} must contain an array`);
    }

    return parsed.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new Error(`${sourceLabel}[${index}] must be an object`);
        }

        const cityId = typeof item.cityId === "string" ? item.cityId.trim() : "";
        const url = typeof item.url === "string" ? item.url.trim() : "";
        const basicAuth = typeof item.basicAuth === "string" ? item.basicAuth.trim() : "";

        if (!cityId) {
            throw new Error(`${sourceLabel}[${index}].cityId is required`);
        }

        if (!url) {
            throw new Error(`${sourceLabel}[${index}].url is required`);
        }

        if (!basicAuth) {
            throw new Error(`${sourceLabel}[${index}].basicAuth is required`);
        }

        return {
            cityId,
            url,
            basicAuth,
        };
    });
}

function parseOneCConfigsJson(rawOneCConfigs) {
    let parsed;

    try {
        parsed = JSON.parse(rawOneCConfigs);
    } catch {
        throw new Error("ONEC_CONFIGS must be a valid JSON array");
    }

    return normalizeOneCConfigs(parsed, "ONEC_CONFIGS");
}

function parseYamlValue(rawValue) {
    const value = rawValue.trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    return value;
}

function parseOneCConfigsYaml(rawYaml, sourceLabel) {
    const lines = rawYaml.split(/\r?\n/);
    const configs = [];
    let current = null;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        if (trimmed.startsWith("-")) {
            if (current) {
                configs.push(current);
            }

            current = {};
            const inlinePair = trimmed.slice(1).trim();

            if (!inlinePair) {
                continue;
            }

            const match = inlinePair.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
            if (!match) {
                throw new Error(`${sourceLabel} contains invalid YAML line: ${trimmed}`);
            }

            current[match[1]] = parseYamlValue(match[2]);
            continue;
        }

        if (!current) {
            throw new Error(`${sourceLabel} must start each item with '-'`);
        }

        const match = trimmed.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (!match) {
            throw new Error(`${sourceLabel} contains invalid YAML line: ${trimmed}`);
        }

        current[match[1]] = parseYamlValue(match[2]);
    }

    if (current) {
        configs.push(current);
    }

    return normalizeOneCConfigs(configs, sourceLabel);
}

function loadOneCConfigs() {
    const onecConfigPath = process.env.ONEC_CONFIGS_FILE || "onec-configs.yml";
    const resolvedPath = path.resolve(process.cwd(), onecConfigPath);

    if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, "utf-8");
        return parseOneCConfigsYaml(fileContent, `ONEC config file (${onecConfigPath})`);
    }

    if (process.env.ONEC_CONFIGS) {
        return parseOneCConfigsJson(process.env.ONEC_CONFIGS);
    }

    return [];
}

function parsePositiveInteger(rawValue, fallback) {
    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
}

function parseCorsAllowedOrigins(rawValue) {
    if (typeof rawValue !== "string" || !rawValue.trim()) {
        return [];
    }

    return Array.from(
        new Set(
            rawValue
                .split(",")
                .map((origin) => origin.trim())
                .filter(Boolean)
        )
    );
}

export const config = {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || "development",
    jwtSecret: validateJwtSecret(process.env.JWT_SECRET),
    citySelectionEnabled: process.env.CITY_SELECTION_ENABLED === "true",
    defaultCityId: process.env.DEFAULT_CITY_ID || null,
    maxBotToken: process.env.MAX_BOT_TOKEN || "",
    maxInitDataMaxAgeSeconds: Number(process.env.MAX_INIT_DATA_MAX_AGE_SECONDS || 300),
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    redisConnectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
    oneCConfigs: loadOneCConfigs(),
    corsAllowedOrigins: parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
    logsInternalApiKey: process.env.LOGS_INTERNAL_API_KEY || "",
    logsRateLimitPerMinute: parsePositiveInteger(process.env.LOGS_RATE_LIMIT_PER_MINUTE, 30),
};
