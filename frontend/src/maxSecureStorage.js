const REFRESH_TOKEN_KEY = "max_refresh_token";

function getWebApp() {
    return window.WebApp || null;
}

export function isMaxMobilePlatform() {
    const platform = getWebApp()?.platform;
    return platform === "android" || platform === "ios";
}

function getSecureStorageApi() {
    const webApp = getWebApp();
    return webApp?.SecureStorage || window.SecureStorage || null;
}

function callSecureStorage(method, key, value) {
    const api = getSecureStorageApi();
    const fn = api?.[method];

    if (typeof fn !== "function") {
        return Promise.resolve(null);
    }

    try {
        const result = value === undefined ? fn.call(api, key) : fn.call(api, key, value);
        if (typeof result?.then === "function") {
            return Promise.resolve(result).catch(() => null);
        }
        return Promise.resolve(result ?? null).catch(() => null);
    } catch {
        return Promise.resolve(null);
    }
}

export async function saveRefreshToken(token) {
    if (!isMaxMobilePlatform()) {
        return;
    }

    if (!token) {
        await clearRefreshToken();
        return;
    }

    const secureSaved = await callSecureStorage("setItem", REFRESH_TOKEN_KEY, token);
    if (secureSaved !== null) {
        return;
    }

    try {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
        // ignore localStorage failures
    }
}

export async function loadRefreshToken() {
    if (!isMaxMobilePlatform()) {
        return null;
    }

    const secureValue = await callSecureStorage("getItem", REFRESH_TOKEN_KEY);
    if (typeof secureValue === "string" && secureValue.trim()) {
        return secureValue;
    }

    try {
        const localValue = window.localStorage.getItem(REFRESH_TOKEN_KEY);
        return localValue || null;
    } catch {
        return null;
    }
}

export async function clearRefreshToken() {
    if (!isMaxMobilePlatform()) {
        return;
    }

    await callSecureStorage("removeItem", REFRESH_TOKEN_KEY);

    try {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
        // ignore localStorage failures
    }
}
