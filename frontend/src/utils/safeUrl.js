const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export function getSafeExternalUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value) return null;

    if (/^[\u0000-\u001F\u007F]/.test(value)) return null;

    try {
        const parsed = new URL(value, window.location.origin);
        if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

export function openExternalLink(rawUrl) {
    const safeUrl = getSafeExternalUrl(rawUrl);
    if (!safeUrl) return false;

    const webApp = window.WebApp;
    if (webApp?.openLink) {
        webApp.openLink(safeUrl);
        return true;
    }

    window.location.href = safeUrl;
    return true;
}
