import ms from "ms";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { cleanupExpiredSessions } from "./store/authSessions.js";
import { cleanupExpiredRefreshTokens } from "./store/refreshTokens.js";

const app = buildApp();

app.get("/", async () => {
    return { status: "ok" };
});

setInterval(() => {
    cleanupExpiredSessions();
    cleanupExpiredRefreshTokens();
}, ms("1m"));

app.listen({ port: config.port, host: "0.0.0.0"})
    .then(() => {
        console.log("server is running");
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });