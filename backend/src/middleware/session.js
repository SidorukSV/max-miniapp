import { getSession } from "../store/authSessions.js";
import { config } from "../config.js";

export async function sessionMiddleware(req, reply) {
    const { auth_session_id } = req.body || {};

    if (!auth_session_id) {
        return reply.code(400).send({ error: "auth_session_id_required" });
    }

    const session = await getSession(auth_session_id);

    if (!session) {
        return reply.code(400).send({ error: "invalid_session" });
    }

    if (session.expiresAt < Date.now()) {
        return reply.code(400).send({ error: "session_expired" });
    }

    req.session = session;
}

export async function requireCityMiddleware(req, reply) {
    if (!config.citySelectionEnabled) return;

    if (!req.session?.city_id) {
        return reply.code(400).send({ error: "city_required", session: req.session });
    }
}

export async function normalizePhoneMiddleware(req, reply) {
    const normalizePhone = String(req.body.phone || "").replace(/[^\d+]/g, "");
    if (!normalizePhone) {
        return reply.code(400).send({ error: "invalid_phone" });
    }

    req.phone = normalizePhone;
}
