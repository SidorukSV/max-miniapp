import { authMiddleware } from "../middleware/auth.js";
import {
    createAppointmentDocument,
    getDoctorSchedule,
    getAppointmentsDocuments,
    getAppointmentsSchedule,
    updateAppointmentDocument,
} from "../services/onecRouter.js";

export async function documentsRoutes(app) {
    app.get("/api/v1/documents/appointments",
        { preHandler: [authMiddleware] },
        async (req) => {
            const { patient_id, city_id } = req.user;
            const items = await getAppointmentsDocuments({ cityId: city_id, patient_id });

            return {
                items,
            };
        });

    app.get("/api/v1/documents/schedule",
        { preHandler: [authMiddleware] },
        async (req) => {
            const { city_id } = req.user;
            const { doctorId, branchId, date, format } = req.query || {};

            if (!doctorId || !branchId) {
                return { items: [] };
            }

            const items = await getDoctorSchedule({
                cityId: city_id,
                doctorId,
                branchId,
                date,
                format,
            });

            return { items };
        });

    app.post("/api/v1/documents/appointments",
        { preHandler: [authMiddleware] },
        async (req) => {
            const { patient_id, city_id } = req.user;
            const payload = {
                ...(JSON.parse(req.body) || {}),
                patient_id,
            };

            const item = await createAppointmentDocument({ cityId: city_id, payload });
            return { item };
        });

    app.put("/api/v1/documents/appointments",
        { preHandler: [authMiddleware] },
        
        async (req) => {
            const { patient_id, city_id } = req.user;
            const payload = {
                ...(JSON.parse(req.body) || {}),
                patient_id,
            };

            const item = await updateAppointmentDocument({ cityId: city_id, payload });
            return { item };
        });
}
