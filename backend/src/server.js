import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();

app.get("/", async () => {
    return { status: "ok" };
});

app.listen({ port: config.port, host: "0.0.0.0"})
    .then(() => {
        console.log("server is running");
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });