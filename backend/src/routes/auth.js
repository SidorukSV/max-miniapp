import crypto from "crypto";
import { createSession, updateSession } from "../store/authSessions.js";
import { config } from "../config.js";
import { getPatientsByPhone } from "../services/onecRouter.js";
import { normalizePhoneMiddleware, requireCityMiddleware, sessionMiddleware } from "../middleware/session.js";
import { signAccessToken, signRefreshToken, verifyToken, ACCESS_TOKEN_EXPIRES_SECONDS, REFRESH_TOKEN_EXPIRES_SECONDS } from "../auth/jwt.js";
import {
    saveRefreshToken,
    getRefreshToken,
    deleteRefreshToken,
    revokeUserRefreshTokens,
    revokeUserDeviceRefreshTokens,
} from "../store/refreshTokens.js";
import { verifyMaxInitData } from "../auth/maxInitData.js";
import { sendApiError } from "../utils/apiErrors.js";


function hashUserAgent(userAgent) {
    const normalizedUserAgent = (userAgent || "unknown").trim().toLowerCase();
    return crypto.createHash("sha256").update(normalizedUserAgent).digest("hex");
}

function getDeviceId(req) {
    const fromBody = req.body?.device_id || req.body?.deviceId || null;
    const fromHeader = req.headers["x-device-id"] || null;

    const candidate = typeof fromBody === "string" && fromBody.trim() ? fromBody : fromHeader;

    if (typeof candidate !== "string") {
        return null;
    }

    const value = candidate.trim();
    return value || null;
}

function buildRefreshTokenContext(req, channelFallback = "unknown") {
    const channel = req.body?.channel || channelFallback || "unknown";

    return {
        user_agent_hash: hashUserAgent(req.headers["user-agent"]),
        device_id: getDeviceId(req),
        channel,
        last_used_at: new Date().toISOString(),
    };
}

function isRefreshContextMatch(stored, current) {
    const storedChannel = stored?.channel || "unknown";
    const currentChannel = current?.channel || "unknown";

    return stored?.user_agent_hash === current?.user_agent_hash
        && (stored?.device_id || null) === (current?.device_id || null)
        && storedChannel === currentChannel;
}

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
                return sendApiError(reply, 400, "city_id_required");
            }

            req.session = await updateSession(req.session.id, { city_id });
            req.log.info({
                endpoint: "/api/v1/auth/set-city",
                cityId: city_id,
                operation: "updateSessionCity",
            }, "Auth city selected");

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
                    req.log.warn({
                        endpoint: "/api/v1/auth/phone",
                        cityId,
                        operation: "verifyMaxInitData",
                        err,
                    }, "MAX init data verification failed");
                    return sendApiError(reply, 401, "init_data_invalid");
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

            const patients_sorted = [...patients].sort((a, b) => { return a.fullName.toUpperCase().localeCompare(b.fullName.toUpperCase()) }); 

            req.session = await updateSession(session.id, {
                patients: patients_sorted,
            });

            return {
                need_select_patient: true,
                patients: patients_sorted,
            };
        });

    app.post("/api/v1/auth/select-patient",
        { preHandler: [sessionMiddleware, requireCityMiddleware] },
        async (req, reply) => {
            const { patient_id } = req.body || {};
            const session = req.session;
            if (!patient_id) {
                return sendApiError(reply, 400, "patient_id_required");
            }

            const patients = session.patients;

            if (!patients.length) {
                return sendApiError(reply, 400, "patients_not_loaded");
            }

            const patient = patients.find((patient) => patient.id === patient_id);

            if (!patient) {
                return sendApiError(reply, 400, "patient_not_found");
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

            const refreshContext = buildRefreshTokenContext(req, tokenPayload.channel);

            await saveRefreshToken(decodeRefresh.jti, {
                ...tokenPayload,
                ...refreshContext,
                expiresAt: decodeRefresh.exp * 1000,
            });

            req.log.info({
                event: "auth_refresh_issued",
                endpoint: "/api/v1/auth/select-patient",
                patientId: patient.id,
                cityId,
                channel: refreshContext.channel,
                hasDeviceId: Boolean(refreshContext.device_id),
            }, "Refresh token issued");

            req.session = await updateSession(session.id, {
                selected_patient_id: patient.id,
            });
            req.log.info({
                endpoint: "/api/v1/auth/select-patient",
                cityId,
                operation: "selectPatient",
            }, "Patient selected for auth session");

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
            return sendApiError(reply, 400, "refresh_token_required");
        }

        let decoded;
        try {
            decoded = verifyToken(refresh_token);
        } catch {
            return sendApiError(reply, 401, "invalid_refresh_token");
        }

        if (decoded.token_type !== "refresh") {
           return sendApiError(reply, 401, "invalid_token_type");
        }

        const stored = await getRefreshToken(decoded.jti);

        if (!stored) {
            return sendApiError(reply, 401, "refresh_token_revoked");
        }

        const currentContext = buildRefreshTokenContext(req, stored.channel);

        if (!isRefreshContextMatch(stored, currentContext)) {
            await deleteRefreshToken(decoded.jti);

            req.log.warn({
                event: "auth_refresh_rejected_context_mismatch",
                endpoint: "/api/v1/auth/refresh",
                patientId: stored.patient_id,
                cityId: stored.city_id,
                tokenJti: decoded.jti,
                storedContext: {
                    userAgentHash: stored.user_agent_hash,
                    deviceId: stored.device_id || null,
                    channel: stored.channel || "unknown",
                },
                currentContext: {
                    userAgentHash: currentContext.user_agent_hash,
                    deviceId: currentContext.device_id || null,
                    channel: currentContext.channel,
                },
            }, "Refresh token rejected due to context mismatch");

            return sendApiError(reply, 401, "refresh_context_mismatch");
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
            ...currentContext,
            expiresAt: newDecodedRefresh.exp * 1000,
        });

        req.log.info({
            event: "auth_refresh_success",
            endpoint: "/api/v1/auth/refresh",
            patientId: stored.patient_id,
            cityId: stored.city_id,
            oldTokenJti: decoded.jti,
            newTokenJti: newDecodedRefresh.jti,
            channel: currentContext.channel,
            hasDeviceId: Boolean(currentContext.device_id),
        }, "Refresh token rotated");

        return {
            access_token,
            refresh_token: new_refresh_token,
            expires_in: ACCESS_TOKEN_EXPIRES_SECONDS,
            refresh_expires_in: REFRESH_TOKEN_EXPIRES_SECONDS,
        };
    });

    app.post("/api/v1/auth/logout", async (req, reply) => {
        const { refresh_token, revoke_scope } = req.body || {};

        if (!refresh_token) {
            return sendApiError(reply, 400, "refresh_token_required");
        }

        let revokedCount = 0;

        try {
            const decoded = verifyToken(refresh_token);

            if (decoded.token_type === "refresh") {
                const stored = await getRefreshToken(decoded.jti);

                if (stored?.patient_id) {
                    const scope = revoke_scope || (stored.device_id ? "device" : "token");

                    if (scope === "user") {
                        revokedCount = await revokeUserRefreshTokens(stored.patient_id);
                    } else if (scope === "device" && stored.device_id) {
                        revokedCount = await revokeUserDeviceRefreshTokens(stored.patient_id, stored.device_id);
                    } else {
                        await deleteRefreshToken(decoded.jti);
                        revokedCount = 1;
                    }

                    req.log.info({
                        event: "auth_logout",
                        endpoint: "/api/v1/auth/logout",
                        patientId: stored.patient_id,
                        cityId: stored.city_id,
                        revokeScope: scope,
                        revokedCount,
                        channel: stored.channel || "unknown",
                        hasDeviceId: Boolean(stored.device_id),
                    }, "Logout completed with refresh revocation");
                } else {
                    await deleteRefreshToken(decoded.jti);
                    revokedCount = 1;
                }
            }
        } catch {
            // no-action: always logout
        }

        return { ok: true, revoked_count: revokedCount };
    })
}
