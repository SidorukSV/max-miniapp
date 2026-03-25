import { createSession, updateSession } from "../store/authSessions.js";
import { config } from "../config.js";
import { getPatientsByPhone } from "../services/onecRouter.js";
import { normalizePhoneMiddleware, requireCityMiddleware, sessionMiddleware } from "../middleware/session.js";
import { signAccessToken, signRefreshToken, verifyToken, ACCESS_TOKEN_EXPIRES_SECONDS, REFRESH_TOKEN_EXPIRES_SECONDS } from "../auth/jwt.js";
import { saveRefreshToken, getRefreshToken, deleteRefreshToken } from "../store/refreshTokens.js";
import { verifyMaxInitData } from "../auth/maxInitData.js";

export async function authRoutes(app) {

    app.post("/api/v1/auth/start", async () => {
        const auth_session_id = await createSession();

        return {
            auth_session_id,
            need_city: config.citySelectionEnabled,
            default_city_id: config.citySelectionEnabled ? null : config.defaultCityId,
        };
    });

    app.post("/api/v1/auth/set-city", { preHandler: [sessionMiddleware] },
        async (req, reply) => {
            const { city_id } = req.body || {};

            if (!city_id) {
                return reply.code(400).send({ error: "city_id_required" });
            }

            req.session = await updateSession(req.session.id, { city_id });
            console.log(req.session);
            console.log({ city_id });

            return { ok: true };
        });

    app.post("/api/v1/auth/phone",
        { preHandler: [sessionMiddleware, requireCityMiddleware, normalizePhoneMiddleware] },
        async (req, reply) => {
            const { channel, proof, init_data } = req.body || {};
            const session = req.session;
            const cityId = session.city_id;
            const authChannel = channel || "unknown";

            let verifiedMaxInitData = null;
            if (authChannel === "max") {
                try {
                    const maxInitData = init_data || proof?.init_data || proof?.initData || null;

                    verifiedMaxInitData = verifyMaxInitData(maxInitData, {
                        botToken: config.maxBotToken,
                        maxAgeSeconds: config.maxInitDataMaxAgeSeconds,
                    });
                } catch (err) {
                    return reply.code(401).send({ error: err?.message || "init_data_invalid" });
                }
            }
            req.session = await updateSession(session.id, {
                phone: req.phone,
                channel: authChannel,
                proof: proof || null,
                max_user: verifiedMaxInitData?.user || null,
            });

            const patients = await getPatientsByPhone({
                cityId,
                phone: req.phone,
            });

            req.session = await updateSession(session.id, {
                patients,
            });

            return {
                need_select_patient: true,
                patients,
            };
        });

    app.post("/api/v1/auth/select-patient",
        { preHandler: [sessionMiddleware, requireCityMiddleware] },
        async (req, reply) => {
            const { patient_id } = req.body || {};
            const session = req.session;
            console.log(req.body);
            if (!patient_id) {
                return reply.code(400).send({ error: "patient_id_required" });
            }

            const patients = session.patients;

            if (!patients.length) {
                return reply.code(400).send({ error: "patients_not_loaded" });
            }

            const patient = patients.find((patient) => patient.id === patient_id);

            if (!patient) {
                return reply.code(400).send({ error: "patient_not_found" });
            }

            const cityId = session.city_id;

            const tokenPayload = {
                patient_id: patient.id,
                city_id: cityId,
                phone: session.phone,
                channel: session.channel || "unknown",
            };

            const access_token = signAccessToken(tokenPayload);
            const refresh_token = signRefreshToken(tokenPayload);

            const decodeRefresh = verifyToken(refresh_token);

            await saveRefreshToken(decodeRefresh.jti, {
                ...tokenPayload,
                expiresAt: decodeRefresh.exp * 1000,
            });

            req.session = await updateSession(session.id, {
                selected_patient_id: patient.id,
            });

            return {
                access_token: access_token,
                refresh_token: refresh_token,
                expires_in: ACCESS_TOKEN_EXPIRES_SECONDS,
                refresh_expires_in: REFRESH_TOKEN_EXPIRES_SECONDS,
                patient,
            }

        });

    app.post("/api/v1/auth/refresh", async (req, reply) => {
        const { refresh_token } = req.body || {};

        if (!refresh_token) {
            return reply.code(400).send({ error: "refresh_token_required" });
        }

        let decoded;
        try {
            decoded = verifyToken(refresh_token);
        } catch {
            return reply.code(401).send({ error: "invalid_refresh_token" });
        }

        if (decoded.token_type !== "refresh") {
           return reply.code(401).send({ error: "invalid_token_type" }); 
        }

        const stored = await getRefreshToken(decoded.jti);

        if (!stored) {
            return reply.code(401).send({ error: "refresh_token_revoked" }); 
        }

        await deleteRefreshToken(decoded.jti);

        const tokenPayload = {
            patient_id: stored.patient_id,
            city_id: stored.city_id,
            phone: stored.phone,
            channel: stored.channel,
        };

        const access_token = signAccessToken(tokenPayload);
        const new_refresh_token = signRefreshToken(tokenPayload);
        
        const newDecodedRefresh = verifyToken(new_refresh_token);

        await saveRefreshToken(newDecodedRefresh.jti, {
            ...tokenPayload,
            expiresAt: newDecodedRefresh.exp * 1000,
        });

        return {
            access_token,
            refresh_token: new_refresh_token,
            expires_in: ACCESS_TOKEN_EXPIRES_SECONDS,
            refresh_expires_in: REFRESH_TOKEN_EXPIRES_SECONDS,
        };
    });

    app.post("/api/v1/auth/logout", async (req, reply) => {
        const { refresh_token } = req.body || {};

        if (!refresh_token) {
            return reply.code(400).send({ error: "refresh_token_required" });
        }

        try {
            const decoded = verifyToken(refresh_token);

            if (decoded.token_type === "refresh") {
                await deleteRefreshToken(decoded.jti);
            }
        } catch {
            // no-action: always logout
        }

        return { ok: true };
    })
}