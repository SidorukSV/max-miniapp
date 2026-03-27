import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container, Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout.jsx";
import {
    createAppointment,
    getAppointmentsSchedule,
    getStoredAccessToken,
    updateAppointment,
} from "../api";
import "../App.css";

function Pill({ active, children, onClick, disabled = false }) {
    return (
        <button
            type="button"
            className={`pill ${active ? "pill--active" : ""}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

function SectionTitle({ title, subtitle }) {
    return (
        <div className="pageTitle">
            <Typography.Title level={2}>{title}</Typography.Title>
            {subtitle ? <Typography.Label style={{ marginTop: 6 }}>{subtitle}</Typography.Label> : null}
        </div>
    );
}

function toRuDate(dateISO) {
    const dateObj = new Date(dateISO);
    if (Number.isNaN(dateObj.valueOf())) return "";
    return dateObj.toLocaleDateString("ru-RU");
}

function toRuTime(dateISO) {
    const dateObj = new Date(dateISO);
    if (Number.isNaN(dateObj.valueOf())) return "";
    return dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function buildSlots(startISO, endISO, delimiterMinutes) {
    const slots = [];
    const start = new Date(startISO);
    const end = new Date(endISO);
    const durationMs = Number(delimiterMinutes || 0) * 60 * 1000;

    if (!durationMs || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
        return slots;
    }

    for (let cursor = start.getTime(); cursor + durationMs <= end.getTime(); cursor += durationMs) {
        slots.push(new Date(cursor).toISOString());
    }

    return slots;
}

export default function BookVisit() {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const accessToken = getStoredAccessToken();

    const appointmentId = searchParams.get("appointmentId") || "";
    const rescheduleSpecId = searchParams.get("specializationId") || "";
    const rescheduleDoctorId = searchParams.get("doctorId") || "";
    const isRescheduleMode = Boolean(appointmentId);

    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [specId, setSpecId] = useState("");
    const [doctorId, setDoctorId] = useState("");
    const [date, setDate] = useState("");
    const [timeISO, setTimeISO] = useState("");

    useEffect(() => {
        async function loadSchedule() {
            if (!accessToken) {
                setError("Не найден токен авторизации");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");
                const response = await getAppointmentsSchedule(accessToken);
                const items = Array.isArray(response?.items) ? response.items : [];
                setSchedule(items);
            } catch {
                setError("Не удалось загрузить расписание");
            } finally {
                setLoading(false);
            }
        }

        loadSchedule();
    }, [accessToken]);

    const specialties = useMemo(() => {
        const map = new Map();
        for (const row of schedule) {
            if (!row?.specializationId) continue;
            if (!map.has(row.specializationId)) {
                map.set(row.specializationId, {
                    id: row.specializationId,
                    title: row.specializationTitle || "Без специальности",
                });
            }
        }
        return Array.from(map.values());
    }, [schedule]);

    useEffect(() => {
        if (!schedule.length) return;

        if (isRescheduleMode) {
            setSpecId(rescheduleSpecId);
            setDoctorId(rescheduleDoctorId);
            return;
        }

        if (!specId && specialties.length) {
            setSpecId(specialties[0].id);
        }
    }, [isRescheduleMode, rescheduleDoctorId, rescheduleSpecId, schedule, specId, specialties]);

    const doctorsByBranch = useMemo(() => {
        if (!specId) return [];

        const branchMap = new Map();

        for (const row of schedule.filter((item) => item?.specializationId === specId)) {
            const branchId = row?.branchId || "unknown-branch";
            if (!branchMap.has(branchId)) {
                branchMap.set(branchId, {
                    branchId,
                    branchTitle: row?.branchTitle || "Филиал не указан",
                    doctors: new Map(),
                });
            }

            const branch = branchMap.get(branchId);
            if (!branch.doctors.has(row.doctorId)) {
                branch.doctors.set(row.doctorId, {
                    doctorId: row.doctorId,
                    doctorTitle: row.doctorTitle,
                    doctorName: [row?.doctorLastname, row?.doctorFurstname, row?.doctorPatronimic].filter(Boolean).join(" "),
                });
            }
        }

        return Array.from(branchMap.values()).map((branch) => ({
            ...branch,
            doctors: Array.from(branch.doctors.values()),
        }));
    }, [schedule, specId]);

    useEffect(() => {
        if (!doctorId && doctorsByBranch.length && doctorsByBranch[0].doctors.length) {
            setDoctorId(doctorsByBranch[0].doctors[0].doctorId);
        }
    }, [doctorId, doctorsByBranch]);

    const selectedRows = useMemo(() => {
        if (!specId || !doctorId) return [];
        return schedule.filter((row) => row?.specializationId === specId && row?.doctorId === doctorId);
    }, [doctorId, schedule, specId]);

    const dates = useMemo(() => {
        const map = new Map();
        for (const row of selectedRows) {
            if (!row?.date) continue;
            if (!map.has(row.date)) {
                map.set(row.date, { value: row.date, title: toRuDate(row.date) });
            }
        }
        return Array.from(map.values()).sort((a, b) => new Date(a.value) - new Date(b.value));
    }, [selectedRows]);

    const timeSlots = useMemo(() => {
        if (!date) return [];

        const values = [];
        const rows = selectedRows.filter((row) => row?.date === date);
        for (const row of rows) {
            const slots = buildSlots(row.time_begin, row.time_end, row.time_delimiter);
            for (const slot of slots) {
                values.push({ value: slot, title: toRuTime(slot) });
            }
        }

        const unique = new Map();
        for (const slot of values) {
            unique.set(slot.value, slot);
        }

        return Array.from(unique.values()).sort((a, b) => new Date(a.value) - new Date(b.value));
    }, [date, selectedRows]);

    const selectedSpecialty = specialties.find((item) => item.id === specId);
    const selectedDoctorRow = selectedRows[0] || null;

    const canConfirm = Boolean(specId && doctorId && date && timeISO && !saving);

    function onPickSpec(nextSpecId) {
        setSpecId(nextSpecId);
        setDoctorId("");
        setDate("");
        setTimeISO("");
    }

    function onPickDoctor(nextDoctorId) {
        setDoctorId(nextDoctorId);
        setDate("");
        setTimeISO("");
    }

    function onPickDate(nextDate) {
        setDate(nextDate);
        setTimeISO("");
    }

    async function confirm() {
        if (!accessToken || !canConfirm) return;

        const payload = {
            specializationId: specId,
            doctorId,
            date,
            datetimeBegin: timeISO,
        };

        try {
            setSaving(true);
            setError("");

            const response = isRescheduleMode
                ? await updateAppointment(accessToken, {
                    appointmentId,
                    ...payload,
                })
                : await createAppointment(accessToken, payload);

            nav("/book/summary", {
                state: {
                    mode: isRescheduleMode ? "reschedule" : "create",
                    appointment: response?.item || null,
                    summary: {
                        specialization: selectedSpecialty?.title || "—",
                        doctor: selectedDoctorRow?.doctorName || selectedDoctorRow?.doctorTitle || "—",
                        branch: selectedDoctorRow?.branchTitle || "—",
                        cabinet: selectedDoctorRow?.cabinetTitle || "—",
                        date: toRuDate(date),
                        time: toRuTime(timeISO),
                    },
                },
            });
        } catch {
            setError("Не удалось сохранить запись");
        } finally {
            setSaving(false);
        }
    }

    return (
        <PageLayout
            showBottom={true}
            bottomButtonText={saving ? "Сохраняем..." : isRescheduleMode ? "Перенести запись" : "Подтвердить запись"}
            onBottomButtonClick={canConfirm ? confirm : undefined}
            showBottomButton={true}
        >
            <Flex direction="column" gap={10}>
                <SectionTitle
                    title={isRescheduleMode ? "Перенос записи" : "Запись на приём"}
                    subtitle="Выберите параметры приёма"
                />

                {loading ? (
                    <Container className="card">
                        <Typography.Label>Загрузка расписания...</Typography.Label>
                    </Container>
                ) : null}

                {!loading && error ? (
                    <Container className="card">
                        <Typography.Label>{error}</Typography.Label>
                    </Container>
                ) : null}

                {!loading ? (
                    <>
                        <Container className="card">
                            <Typography.Title level={3}>Специальность</Typography.Title>
                            <div className="pills">
                                {specialties.map((item) => (
                                    <Pill
                                        key={item.id}
                                        active={specId === item.id}
                                        onClick={() => onPickSpec(item.id)}
                                        disabled={isRescheduleMode}
                                    >
                                        {item.title}
                                    </Pill>
                                ))}
                            </div>
                        </Container>

                        <Container className={`card ${specId ? "" : "card--disabled"}`}>
                            <Typography.Title level={3}>Врач (по филиалам)</Typography.Title>
                            {!specId ? (
                                <Typography.Label style={{ marginTop: 8 }}>Сначала выберите специальность</Typography.Label>
                            ) : (
                                <Flex direction="column" gap={10} style={{ marginTop: 12 }}>
                                    {doctorsByBranch.map((branch) => (
                                        <div key={branch.branchId}>
                                            <Typography.Label>{branch.branchTitle}</Typography.Label>
                                            <div className="pills">
                                                {branch.doctors.map((doc) => (
                                                    <Pill
                                                        key={doc.doctorId}
                                                        active={doctorId === doc.doctorId}
                                                        onClick={() => onPickDoctor(doc.doctorId)}
                                                        disabled={isRescheduleMode}
                                                    >
                                                        {doc.doctorName || doc.doctorTitle || "Врач"}
                                                    </Pill>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </Flex>
                            )}
                        </Container>

                        <Container className={`card ${doctorId ? "" : "card--disabled"}`}>
                            <Typography.Title level={3}>Дата</Typography.Title>
                            <div className="pills">
                                {dates.map((item) => (
                                    <Pill key={item.value} active={date === item.value} onClick={() => onPickDate(item.value)}>
                                        {item.title}
                                    </Pill>
                                ))}
                            </div>
                        </Container>

                        <Container className={`card ${date ? "" : "card--disabled"}`}>
                            <Typography.Title level={3}>Время</Typography.Title>
                            <div className="pills">
                                {timeSlots.map((item) => (
                                    <Pill key={item.value} active={timeISO === item.value} onClick={() => setTimeISO(item.value)}>
                                        {item.title}
                                    </Pill>
                                ))}
                            </div>
                        </Container>

                        <Container className="card">
                            <Typography.Title level={3}>Итог</Typography.Title>
                            <div className="summary">
                                <div className="summaryRow">
                                    <Typography.Label>Специальность</Typography.Label>
                                    <Typography.Label>{selectedSpecialty?.title || "—"}</Typography.Label>
                                </div>
                                <div className="summaryRow">
                                    <Typography.Label>Врач</Typography.Label>
                                    <Typography.Label>{selectedDoctorRow?.doctorName || selectedDoctorRow?.doctorTitle || "—"}</Typography.Label>
                                </div>
                                <div className="summaryRow">
                                    <Typography.Label>Дата</Typography.Label>
                                    <Typography.Label>{date ? toRuDate(date) : "—"}</Typography.Label>
                                </div>
                                <div className="summaryRow">
                                    <Typography.Label>Время</Typography.Label>
                                    <Typography.Label>{timeISO ? toRuTime(timeISO) : "—"}</Typography.Label>
                                </div>
                                <div className="summaryRow">
                                    <Typography.Label>Кабинет</Typography.Label>
                                    <Typography.Label>{selectedDoctorRow?.cabinetTitle || "—"}</Typography.Label>
                                </div>
                            </div>
                        </Container>
                    </>
                ) : null}
            </Flex>
        </PageLayout>
    );
}
