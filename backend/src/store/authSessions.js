import { randomUUID } from "crypto";
import ms from "ms";

const sessions = new Map();

export function createSession() {
    const id = `a_${randomUUID()}`;

    sessions.set(id, {
        id,
        createdAt: Date.now(),
        expriresAt: Date.now() + ms("5m"),
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

export function deleteSession(id) {
    sessions.delete(id);
}

export function cleanupExpiredSessions() {
    const now = Date.now();

    for (const [id, session] of sessions.entries()) {
        if (session.expriresAt <= now){
            deleteSession(id);
        }
    }  
}