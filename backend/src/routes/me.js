import { authWiddleware } from "../middleware/auth.js";
import { getPatientById } from "../services/onecRouter.js";

export async function meRoutes(app) {
    app.get("/api/v1/me",
        { preHandler: [authWiddleware] },
        async (req) => {
            const { patient_id, city_id, phone, channel } = req.user;
            console.log(patient_id);
            const patient = await getPatientById({ cityId: city_id, patient_id });
            return {
                ...patient,
                city_id,
                phone,
                channel
            };

            return {
                id: patient_id,
                city_id,
                phone,
                channel,
                fullname: "Семён Сидорук",
                bonus: 615.3,
            };
        });

}