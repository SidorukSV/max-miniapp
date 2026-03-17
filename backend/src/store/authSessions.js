import { randomUUID } from "crypto";

const sessions = new Map();

export function createSession() {
    const id = `a_${randomUUID()}`;

    sessions.set(id, {
        id,
        createdAt: Date.now(),
        expriresAt: Date.now() + 5 * 60 * 1000.
    });

    return id;
}

export function getSession(id) {
    return sessions.get(id);
}

export function updateSession(id, data) {
    const session = getSession(id);
    if (!session) return null;

    Object.assign(session, data);

    return session;
}