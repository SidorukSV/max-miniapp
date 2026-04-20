import { buildApp } from "./app.js";
import { config } from "./config.js";
import { closeRedisClient, getRedisClient } from "./store/redisClient.js";
import { finishOneCSessions, startOneCSessions } from "./services/onecRouter.js";

async function startServer() {
    const app = await buildApp();

    app.get("/", async () => {
        return { status: "ok" };
    });

    await getRedisClient();
    await startOneCSessions();

    app.addHook("onClose", async () => {
        await finishOneCSessions();
        await closeRedisClient();
    });

    const shutdown = async (signal) => {
        app.log.info({ signal }, "graceful shutdown started");
        try {
            await app.close();
        } finally {
            process.exit(0);
        }
    };

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });

    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log("server is running");
}

startServer().catch((err) => {
    console.error("Backend startup failed:", err.message);
    process.exit(1);
});
