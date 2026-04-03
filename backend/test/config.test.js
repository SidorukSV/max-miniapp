import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const runConfigImport = (jwtSecret) => {
    const env = { ...process.env };

    delete env.JWT_SECRET;

    if (jwtSecret !== undefined) {
        env.JWT_SECRET = jwtSecret;
    }

    return spawnSync(process.execPath, ["-e", 'import("./src/config.js")'], {
        cwd: process.cwd(),
        env,
        encoding: "utf8",
    });
};

test("backend startup fails when JWT_SECRET is missing or empty", () => {
    const result = runConfigImport("");

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET is required/);
});

test("backend startup fails when JWT_SECRET is too short", () => {
    const result = runConfigImport("short-secret");

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /at least 32 characters long/);
});

test("backend startup succeeds with a strong JWT_SECRET", () => {
    const result = runConfigImport("VeryStrongJwtSecret!2026-AlphaBeta");

    assert.equal(result.status, 0);
});
