import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";

export function buildApp() {
    const app = Fastify({
        logger: true,
    });

    app.register(authRoutes);
    app.register(meRoutes);

    return app;
}