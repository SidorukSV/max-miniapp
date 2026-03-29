import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container, Flex, Typography, Button } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout.jsx";
import {
    createAppointment,
    getCatalogEmployeesBySpec,
    getCatalogSpecializationsBySchedule,
    getDoctorSchedule,
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

function getTimeMinutes(dateISO) {
    const match = String(dateISO || "").match(/T(\d{2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    return `${hours}:${mins}`;
}

function buildSlotsByShifts(rows, doctorDuration, selectedDate) {
    const duration = Number(doctorDuration || 0);
    if (!duration || !selectedDate || !Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    const workIntervals = [];
    const blockedIntervals = [];

    for (const row of rows) {
        const start = getTimeMinutes(row?.time_begin);
        const end = getTimeMinutes(row?.time_end);
        if (start === null || end === null || end <= start) {
            continue;
        }

        if (row?.isWorkTime) {
            workIntervals.push({ start, end, cabinetId: row?.cabinetId, cabinetTitle: row?.cabinetTitle });
        } else {
            blockedIntervals.push({ start, end });
        }
    }

    const slots = [];
    for (const work of workIntervals) {
        for (let start = work.start; start + duration <= work.end; start += duration) {
            const slotEnd = start + duration;
            const intersectsBlocked = blockedIntervals.some((blocked) => start < blocked.end && slotEnd > blocked.start);
            if (intersectsBlocked) {
                continue;
            }

            const time = minutesToTime(start);
            const value = `${selectedDate}T${time}:00`;
            slots.push({
                value,
                title: toRuTime(value),
                cabinetId: work.cabinetId,
                cabinetTitle: work.cabinetTitle,
            });
        }
    }

    const unique = new Map();
    for (const slot of slots) {
        unique.set(slot.value, slot);
    }

    return Array.from(unique.values()).sort((a, b) => new Date(a.value) - new Date(b.value));
}

function normalizeDateValue(item) {
    if (typeof item === "string") {
        return item;
    }

    if (item && typeof item === "object") {
        return item.date || item.value || "";
    }

    return "";
}

function getDoctorLabel(doctor) {
    return [doctor?.doctorLastname, doctor?.doctorFirstname, doctor?.doctorPatronymic].filter(Boolean).join(" ") || doctor?.doctorTitle || "Врач";
}

export default function BookVisit() {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const accessToken = getStoredAccessToken();

    const appointmentId = searchParams.get("appointmentId") || "";
    const rescheduleSpecId = searchParams.get("specializationId") || "";
    const rescheduleDoctorId = searchParams.get("doctorId") || "";
    const isRescheduleMode = Boolean(appointmentId);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [specialties, setSpecialties] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [dates, setDates] = useState([]);
    const [daySchedule, setDaySchedule] = useState([]);

    const [specId, setSpecId] = useState("");
    const [doctorId, setDoctorId] = useState("");
    const [branchId, setBranchId] = useState("");
    const [date, setDate] = useState("");
    const [timeISO, setTimeISO] = useState("");

    useEffect(() => {
        async function loadSpecializations() {
            if (!accessToken) {
                setError("Не найден токен авторизации");
                return;
            }

            try {
                setLoading(true);
                setError("");
                const response = await getCatalogSpecializationsBySchedule(accessToken);
                const items = Array.isArray(response?.items) ? response.items : [];
                const sorted_items = items .sort((a, b) => {
                    return a.specializationTitle.toUpperCase().
                        localeCompare(b.specializationTitle.toUpperCase())
                });
                setSpecialties(sorted_items.map((item) => ({
                    id: item.specializationId,
                    title: item.specializationTitle || "Без специальности",
                })));
            } catch {
                setError("Не удалось загрузить специализации");
            } finally {
                setLoading(false);
            }
        }

        loadSpecializations();
    }, [accessToken]);

    useEffect(() => {
        if (!specialties.length) return;

        if (isRescheduleMode && rescheduleSpecId) {
            setSpecId(rescheduleSpecId);
            return;
        }

        if (!specId) {
            setSpecId(specialties[0].id);
        }
    }, [isRescheduleMode, rescheduleSpecId, specialties, specId]);

    useEffect(() => {
        async function loadDoctors() {
            if (!accessToken || !specId) {
                setDoctors([]);
                return;
            }

            try {
                setLoading(true);
                setError("");
                const response = await getCatalogEmployeesBySpec(accessToken, specId);
                const items = Array.isArray(response?.items) ? response.items : [];
                setDoctors(items);
            } catch {
                setError("Не удалось загрузить врачей");
                setDoctors([]);
            } finally {
                setLoading(false);
            }
        }

        setDoctorId("");
        setBranchId("");
        setDate("");
        setTimeISO("");
        setDates([]);
        setDaySchedule([]);
        loadDoctors();
    }, [accessToken, specId]);

    const doctorsByBranch = useMemo(() => {
        const branchMap = new Map();

        for (const row of doctors) {
            if (!row?.doctorId || !row?.branchId) continue;

            if (!branchMap.has(row.branchId)) {
                branchMap.set(row.branchId, {
                    branchId: row.branchId,
                    branchTitle: row.branchTitle || "Филиал не указан",
                    doctors: [],
                });
            }

            branchMap.get(row.branchId).doctors.push(row);
        }

        return Array.from(branchMap.values());
    }, [doctors]);

    useEffect(() => {
        if (!doctors.length) return;

        if (isRescheduleMode && rescheduleDoctorId) {
            const matched = doctors.find((item) => item.doctorId === rescheduleDoctorId);
            if (matched) {
                setDoctorId(matched.doctorId);
                setBranchId(matched.branchId);
                return;
            }
        }

        const first = doctors[0];
        if (!doctorId && first) {
            setDoctorId(first.doctorId);
            setBranchId(first.branchId);
        }
    }, [doctors, doctorId, isRescheduleMode, rescheduleDoctorId]);

    useEffect(() => {
        async function loadDates() {
            if (!accessToken || !doctorId || !branchId) {
                setDates([]);
                return;
            }

            try {
                setLoading(true);
                setError("");
                const response = await getDoctorSchedule(accessToken, {
                    doctorId,
                    branchId,
                    format: "OnlyDate",
                });

                const items = Array.isArray(response?.items) ? response.items : [];
                const normalized = items
                    .map((item) => normalizeDateValue(item))
                    .filter(Boolean)
                    .map((value) => ({ value, title: toRuDate(value) }))
                    .sort((a, b) => new Date(a.value) - new Date(b.value));

                setDates(normalized);
            } catch {
                setError("Не удалось загрузить доступные даты");
                setDates([]);
            } finally {
                setLoading(false);
            }
        }

        setDate("");
        setTimeISO("");
        setDaySchedule([]);
        loadDates();
    }, [accessToken, doctorId, branchId]);

    useEffect(() => {
        if (!dates.length || date) return;
        setDate(dates[0].value);
    }, [dates, date]);

    useEffect(() => {
        async function loadScheduleByDate() {
            if (!accessToken || !doctorId || !branchId || !date) {
                setDaySchedule([]);
                return;
            }

            try {
                setLoading(true);
                setError("");
                const response = await getDoctorSchedule(accessToken, {
                    doctorId,
                    branchId,
                    date,
                });

                const items = Array.isArray(response?.items) ? response.items : [];
                setDaySchedule(items);
            } catch {
                setError("Не удалось загрузить доступное время");
                setDaySchedule([]);
            } finally {
                setLoading(false);
            }
        }

        setTimeISO("");
        loadScheduleByDate();
    }, [accessToken, doctorId, branchId, date]);

    const selectedSpecialty = specialties.find((item) => item.id === specId);
    const selectedDoctor = doctors.find((item) => item.doctorId === doctorId && item.branchId === branchId) || null;

    const timeSlots = useMemo(() => {
        if (!date || !selectedDoctor) {
            return [];
        }

        return buildSlotsByShifts(daySchedule, selectedDoctor?.doctorDuration, date);
    }, [date, daySchedule, selectedDoctor]);

    const selectedSlot = timeSlots.find((item) => item.value === timeISO) || null;

    const canConfirm = Boolean(specId && doctorId && branchId && date && timeISO && !saving);

    function onPickSpec(nextSpecId) {
        setSpecId(nextSpecId);
    }

    function onPickDoctor(nextDoctorId, nextBranchId) {
        setDoctorId(nextDoctorId);
        setBranchId(nextBranchId);
    }

    function onPickDate(nextDate) {
        setDate(nextDate);
    }

    async function confirm() {
        if (!accessToken || !canConfirm) return;

        const payload = {
            specializationId: specId,
            doctorId,
            branchId,
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
                        doctor: getDoctorLabel(selectedDoctor),
                        branch: selectedDoctor?.branchTitle || "—",
                        cabinet: selectedSlot?.cabinetTitle || "—",
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
                        <Typography.Label>Загрузка данных...</Typography.Label>
                    </Container>
                ) : null}

                {!loading && error ? (
                    <Container className="card">
                        <Typography.Label>{error}</Typography.Label>
                    </Container>
                ) : null}

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
                    <Typography.Title level={3}>Врач</Typography.Title>
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
                                                key={`${doc.branchId}:${doc.doctorId}`}
                                                active={doctorId === doc.doctorId && branchId === doc.branchId}
                                                onClick={() => onPickDoctor(doc.doctorId, doc.branchId)}
                                                disabled={isRescheduleMode}
                                            >
                                                {getDoctorLabel(doc)}
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
                            <Typography.Label>{getDoctorLabel(selectedDoctor) || "—"}</Typography.Label>
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
                            <Typography.Label>{selectedSlot?.cabinetTitle || "—"}</Typography.Label>
                        </div>
                    </div>
                </Container>
                <Button
                mode="secondary"
                onClick={() => nav("/")}
                stretched={true}
                >
                    Вернуться на главную
                </Button>
            </Flex>
        </PageLayout>
    );
}
