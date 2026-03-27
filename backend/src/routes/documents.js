import { authWiddleware } from "../middleware/auth.js";
import {
    createAppointmentDocument,
    getAppointmentsDocuments,
    getAppointmentsSchedule,
    updateAppointmentDocument,
} from "../services/onecRouter.js";

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

    app.get("/api/v1/documents/appointments/schedule",
        { preHandler: [authWiddleware] },
        async (req) => {
            const { city_id } = req.user;
            const { specializationId } = req.query || {};
            const items = await getAppointmentsSchedule({ cityId: city_id, specializationId });

            return { items };
        });

    app.post("/api/v1/documents/appointments",
        { preHandler: [authWiddleware] },
        async (req) => {
            const { patient_id, city_id } = req.user;
            const payload = {
                ...(req.body || {}),
                patient_id,
            };

            const item = await createAppointmentDocument({ cityId: city_id, payload });
            return { item };
        });

    app.put("/api/v1/documents/appointments",
        { preHandler: [authWiddleware] },
        async (req) => {
            const { patient_id, city_id } = req.user;
            const payload = {
                ...(req.body || {}),
                patient_id,
            };

            const item = await updateAppointmentDocument({ cityId: city_id, payload });
            return { item };
        });
}
