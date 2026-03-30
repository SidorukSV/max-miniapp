import { authMiddleware } from "../middleware/auth.js";
import { getCatalogEmployeesBySpec, getCatalogSpecializationsBySchedule } from "../services/onecRouter.js";

export async function catalogsRoutes(app) {
    app.get("/api/v1/catalogs/cities",
        async (req) => {

            return [
                { id: "RU-CXT", name: "Чита", appointment_phone: "+73022222222" },
                { id: "RU-KJA", name: "Красноярск", appointment_phone: "+73912222222" },
            ];
        });

    app.get("/api/v1/catalogs/specializations",
        { preHandler: [authMiddleware] },
        async (req) => {
            const { city_id } = req.user;
            const items = await getCatalogSpecializationsBySchedule({ cityId: city_id });
            return { items };
        });

    app.get("/api/v1/catalogs/employees",
        { preHandler: [authMiddleware] },
        async (req) => {
            const { city_id } = req.user;
            const { specializationId } = req.query || {};
            if (!specializationId) {
                return { items: [] };
            }

            const items = await getCatalogEmployeesBySpec({ cityId: city_id, specializationId });
            return { items };
        });
}
