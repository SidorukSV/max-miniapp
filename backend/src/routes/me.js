import { authMiddleware } from "../middleware/auth.js";
import { getBonusTransactions, getPatientById, getPatientsByPhone } from "../services/onecRouter.js";
import { sendApiError } from "../utils/apiErrors.js";

export async function meRoutes(app) {
    app.get("/api/v1/me",
        { preHandler: [authMiddleware] },
        async (req, reply) => {
            const { patient_id, city_id, phone, channel } = req.user;
            try {
                const [patient, patientsByPhone] = await Promise.all([
                    getPatientById({ cityId: city_id, patient_id }),
                    getPatientsByPhone({ cityId: city_id, phone }).catch(() => []),
                ]);

                const patientsByPhoneSorted = Array.isArray(patientsByPhone)
                    ? [...patientsByPhone].sort((a, b) => String(a?.fullName || "").toUpperCase()
                        .localeCompare(String(b?.fullName || "").toUpperCase()))
                    : [];

                return {
                    ...patient,
                    city_id: city_id,
                    phone,
                    channel,
                    patients_by_phone: patientsByPhoneSorted,
                };
            } catch (error) {
                req.log.error({
                    endpoint: "/api/v1/me",
                    cityId: city_id,
                    operation: "getPatientById",
                    err: error,
                }, "Failed to load profile");
                return sendApiError(reply, 502, "profile_unavailable");
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
                return sendApiError(reply, 502, "bonus_transactions_unavailable");
            }
        });

}
