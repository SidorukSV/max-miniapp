import { config } from "../config.js";
import { authMiddleware } from "../middleware/auth.js";
import { getBonusTransactions, getPatientById } from "../services/onecRouter.js";

export async function meRoutes(app) {
    app.get("/api/v1/me",
        { preHandler: [authMiddleware] },
        async (req, reply) => {
            const { patient_id, city_id, phone, channel } = req.user;
            try {
                const patient = await getPatientById({ cityId: city_id, patient_id });
                return {
                    ...patient,
                    city_id: city_id,
                    phone,
                    channel,
                };
            } catch (error) {
                req.log.error({
                    endpoint: "/api/v1/me",
                    cityId: city_id,
                    operation: "getPatientById",
                    err: error,
                }, "Failed to load profile");
                return reply.code(502).send({ error: "profile_unavailable" });
            }
        });

    app.get("/api/v1/me/bonus-transactions",
        { preHandler: [authMiddleware] },
        async (req, reply) => {
            const { patient_id, city_id } = req.user;
            try {
                const transactions = await getBonusTransactions({ cityId: city_id, patient_id });
                return {
                    items: transactions,
                };
            } catch (error) {
                req.log.error({
                    endpoint: "/api/v1/me/bonus-transactions",
                    cityId: city_id,
                    operation: "getBonusTransactions",
                    err: error,
                }, "Failed to load bonus transactions");
                return reply.code(502).send({ error: "bonus_transactions_unavailable" });
            }
        });

}
