import test from "node:test";
import assert from "node:assert/strict";

const JWT_SECRET = "VeryStrongJwtSecret!2026-AlphaBeta";

async function createTestApp() {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = "test";

    const { buildApp } = await import("../src/app.js");
    const app = await buildApp();
    return app;
}

test("responses include baseline security headers", async (t) => {
    const app = await createTestApp();
    t.after(async () => {
        await app.close();
    });

    const response = await app.inject({
        method: "GET",
        url: "/__security_headers_probe__",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["referrer-policy"], "strict-origin-when-cross-origin");
    assert.match(response.headers["content-security-policy"] || "", /default-src 'self'/);
});

test("auth refresh errors do not reflect script payloads (xss regression)", async (t) => {
    const app = await createTestApp();
    t.after(async () => {
        await app.close();
    });

    const xssPayload = "<script>alert('xss')</script>";

    const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refresh_token: xssPayload },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, "refresh_token_required");
    assert.doesNotMatch(response.body, /<script>/i);
});
