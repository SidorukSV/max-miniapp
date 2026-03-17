import { authWiddleware } from "../middleware/auth.js";

export async function meRoutes(app) {
    app.get("/api/v1/me",
        { preHandler: [authWiddleware] },
        async (req) => {
            const { patient_id, city_id, phone, channel } = req.user;

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