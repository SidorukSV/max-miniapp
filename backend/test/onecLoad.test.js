import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

const FALLBACK_JWT_SECRET = "VeryStrongJwtSecret!2026-AlphaBeta";

function createJsonResponse(status, payload, headers = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get(name) {
                return headers[name.toLowerCase()] ?? null;
            },
        },
        async json() {
            return payload;
        },
        async text() {
            return typeof payload === "string" ? payload : JSON.stringify(payload);
        },
    };
}

async function loadRealOneCContext(t) {
    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = FALLBACK_JWT_SECRET;
    }

    const cacheBust = Date.now() + Math.random();
    const { config } = await import(`../src/config.js?load_test=${cacheBust}`);

    if (!Array.isArray(config.oneCConfigs) || config.oneCConfigs.length === 0) {
        t.skip("ONEC_CONFIGS/onec-configs.yml не настроен: пропускаем нагрузочный тест с реальными настройками");
        return null;
    }

    const oneCConfig = config.oneCConfigs[0];
    const routerModule = await import(`../src/services/onecRouter.js?load_test=${cacheBust}`);

    return {
        oneCConfig,
        getAppointmentsSchedule: routerModule.getAppointmentsSchedule,
    };
}

test("load: burst of backend->1C requests completes without transport errors", async (t) => {
    const ctx = await loadRealOneCContext(t);
    if (!ctx) {
        return;
    }

    const { oneCConfig, getAppointmentsSchedule } = ctx;
    const originalFetch = global.fetch;
    const counters = {
        startSessionCalls: 0,
        scheduleCalls: 0,
    };

    global.fetch = async (url) => {
        if (url === oneCConfig.url.concat("/startIBSession")) {
            counters.startSessionCalls += 1;
            return createJsonResponse(200, {}, { "set-cookie": "ibsession=load-test-cookie; Path=/; HttpOnly" });
        }

        if (url.startsWith(oneCConfig.url.concat("/documents/schedule"))) {
            counters.scheduleCalls += 1;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return createJsonResponse(200, [{ slot: "10:00", doctorId: "doc-1" }]);
        }

        return createJsonResponse(404, { error: "not_found" });
    };

    try {
        const concurrency = 60;
        const startedAt = performance.now();

        const results = await Promise.all(
            Array.from({ length: concurrency }, (_, index) =>
                getAppointmentsSchedule({ cityId: oneCConfig.cityId, specializationId: `spec-${index % 3}` })
            ),
        );

        const durationMs = performance.now() - startedAt;

        assert.equal(results.length, concurrency);
        assert.ok(results.every((item) => Array.isArray(item) && item.length === 1));
        assert.equal(counters.scheduleCalls, concurrency);
        assert.ok(counters.startSessionCalls >= 1);
        assert.ok(durationMs < 2000, `expected burst to finish under 2000ms, got ${durationMs.toFixed(2)}ms`);
    } finally {
        global.fetch = originalFetch;
    }
});

test("load: retry on stale 1C session under parallel traffic", async (t) => {
    const ctx = await loadRealOneCContext(t);
    if (!ctx) {
        return;
    }

    const { oneCConfig, getAppointmentsSchedule } = ctx;
    const originalFetch = global.fetch;
    let startSessionCount = 0;

    global.fetch = async (url, options = {}) => {
        if (url === oneCConfig.url.concat("/startIBSession")) {
            startSessionCount += 1;
            const cookieValue = startSessionCount === 1 ? "retry-cookie-stale" : `retry-cookie-fresh-${startSessionCount}`;
            return createJsonResponse(200, {}, { "set-cookie": `ibsession=${cookieValue}; Path=/; HttpOnly` });
        }

        if (url.startsWith(oneCConfig.url.concat("/documents/schedule"))) {
            const cookie = new Headers(options.headers || {}).get("Cookie") || "";

            if (cookie.includes("retry-cookie-stale")) {
                return createJsonResponse(401, { desc: "session_expired" });
            }

            return createJsonResponse(200, [{ slot: "11:00", doctorId: "doc-2" }]);
        }

        return createJsonResponse(404, { error: "not_found" });
    };

    try {
        const totalRequests = 20;
        const responses = await Promise.all(
            Array.from({ length: totalRequests }, () =>
                getAppointmentsSchedule({ cityId: oneCConfig.cityId, specializationId: "therapist" })
            ),
        );

        assert.equal(responses.length, totalRequests);
        assert.ok(responses.every((item) => Array.isArray(item) && item[0]?.slot === "11:00"));
        assert.ok(startSessionCount >= 2, "expected at least one session refresh during retries");
    } finally {
        global.fetch = originalFetch;
    }
});
