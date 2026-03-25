import { buildApp } from "./app.js";
import { config } from "./config.js";
import { closeRedisClient, getRedisClient } from "./store/redisClient.js";

const app = await buildApp();

app.get("/", async () => {
    return { status: "ok" };
});

await getRedisClient();

app.addHook("onClose", async () => {
    await closeRedisClient();
});

app.listen({ port: config.port, host: "0.0.0.0" })
    .then(() => {
        console.log("server is running");
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
