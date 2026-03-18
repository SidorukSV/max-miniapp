import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";

export async function buildApp() {
    const app = Fastify({
        logger: true,
    });

    await app.register(cors, {
        origin: true,
    });

    app.register(authRoutes);
    app.register(meRoutes);

    return app;
}