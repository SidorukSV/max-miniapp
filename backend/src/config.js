import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

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

export const config = {
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || "dev-super-secret-jwt-key",
    citySelectionEnabled: process.env.CITY_SELECTION_ENABLED === "true",
    defaultCityId: process.env.DEFAULT_CITY_ID || null,
    maxBotToken: process.env.MAX_BOT_TOKEN || "",
    maxInitDataMaxAgeSeconds: Number(process.env.MAX_INIT_DATA_MAX_AGE_SECONDS || 300),
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    redisConnectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
    oneCConfigs: loadOneCConfigs(),
};
