import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { logsRoutes } from "./routes/logs.js";
import { catalogsRoutes } from "./routes/catalogs.js";
import { documentsRoutes } from "./routes/documents.js";

export async function buildApp() {
    const app = Fastify({
        logger: true,
    });

    await app.register(cors, {
        origin: true,
    });

    app.register(authRoutes);
    app.register(meRoutes);
    app.register(logsRoutes);
    app.register(catalogsRoutes);
    app.register(documentsRoutes);

    return app;
}
