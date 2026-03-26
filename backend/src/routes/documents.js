import { authWiddleware } from "../middleware/auth.js";
import { getAppointmentsDocuments } from "../services/onecRouter.js";

export async function documentsRoutes(app) {
    app.get("/api/v1/documents/appointments",
        { preHandler: [authWiddleware] },
        async (req) => {
            const { patient_id, city_id } = req.user;
            const items = await getAppointmentsDocuments({ cityId: city_id, patient_id });

            return {
                items,
            };
        });
}
