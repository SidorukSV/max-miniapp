import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container, Flex, Typography, Button } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout.jsx";
import SectionTitle from "../components/book-visit/SectionTitle.jsx";
import SpecializationSection from "../components/book-visit/SpecializationSection.jsx";
import DoctorSection from "../components/book-visit/DoctorSection.jsx";
import DateSection from "../components/book-visit/DateSection.jsx";
import TimeSection from "../components/book-visit/TimeSection.jsx";
import SummarySection from "../components/book-visit/SummarySection.jsx";
import {
    createAppointment,
    getCatalogEmployeesBySpec,
    getCatalogSpecializationsBySchedule,
    getDoctorSchedule,
    getStoredAccessToken,
    updateAppointment,
} from "../api";
import "../App.css";

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

function getMonthStart(value) {
    const baseDate = value ? new Date(value) : new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
}

function formatMonthLabel(dateValue) {
    return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(dateValue);
}

function buildMonthGrid(monthStart) {
    const monthStartDay = monthStart.getDay();
    const mondayStartOffset = monthStartDay === 0 ? 6 : monthStartDay - 1;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - mondayStartOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        return day;
    });
}

function toISODateOnly(dateValue) {
    return dateValue.toLocaleDateString("sv");
}

export default function BookVisit() {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const accessToken = getStoredAccessToken();

    const appointmentId = searchParams.get("appointmentId") || "";
    const rescheduleSpecId = searchParams.get("specializationId") || "";
    const rescheduleDoctorId = searchParams.get("doctorId") || "";
    const isRescheduleMode = Boolean(appointmentId);

    const [loadingSpecialties, setLoadingSpecialties] = useState(false);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [loadingDates, setLoadingDates] = useState(false);
    const [loadingTimes, setLoadingTimes] = useState(false);
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
    const [monthCursor, setMonthCursor] = useState(() => getMonthStart());
    const [showMissingWarning, setShowMissingWarning] = useState(false);

    useEffect(() => {
        async function loadSpecializations() {
            if (!accessToken) {
                setError("Не найден токен авторизации");
                return;
            }

            try {
                setLoadingSpecialties(true);
                setError("");
                const response = await getCatalogSpecializationsBySchedule(accessToken);
                const items = Array.isArray(response?.items) ? response.items : [];
                const sortedItems = [...items].sort((a, b) => {
                    return a.specializationTitle.toUpperCase().
                        localeCompare(b.specializationTitle.toUpperCase());
                });
                setSpecialties(sortedItems.map((item) => ({
                    id: item.specializationId,
                    title: item.specializationTitle || "Без специальности",
                })));
            } catch {
                setError("Не удалось загрузить специализации");
            } finally {
                setLoadingSpecialties(false);
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
                setLoadingDoctors(true);
                setError("");
                const response = await getCatalogEmployeesBySpec(accessToken, specId);
                const items = Array.isArray(response?.items) ? response.items : [];
                setDoctors(items);
            } catch {
                setError("Не удалось загрузить врачей");
                setDoctors([]);
            } finally {
                setLoadingDoctors(false);
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
                setLoadingDates(true);
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
                    .map((value) => String(value).split("T")[0])
                    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
                    .map((value) => ({ value, title: toRuDate(value) }))
                    .sort((a, b) => new Date(a.value) - new Date(b.value));

                setDates(normalized);
            } catch {
                setError("Не удалось загрузить доступные даты");
                setDates([]);
            } finally {
                setLoadingDates(false);
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
        if (date) {
            setMonthCursor(getMonthStart(date));
            return;
        }

        if (dates.length) {
            setMonthCursor(getMonthStart(dates[0].value));
        }
    }, [date, dates]);

    useEffect(() => {
        async function loadScheduleByDate() {
            if (!accessToken || !doctorId || !branchId || !date) {
                setDaySchedule([]);
                return;
            }

            try {
                setLoadingTimes(true);
                setError("");
                const response = await getDoctorSchedule(accessToken, {
                    doctorId,
                    branchId,
                    date,
                    format: "Full"
                });

                const items = Array.isArray(response?.items) ? response.items : [];
                setDaySchedule(items);
            } catch {
                setError("Не удалось загрузить доступное время");
                setDaySchedule([]);
            } finally {
                setLoadingTimes(false);
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
    const groupedTimeSlots = useMemo(() => {
        const groups = [
            { key: "morning", title: "Утро", slots: [] },
            { key: "day", title: "День", slots: [] },
            { key: "evening", title: "Вечер", slots: [] },
        ];

        for (const slot of timeSlots) {
            const slotMinutes = getTimeMinutes(slot.value);
            if (slotMinutes === null || !slot.title) continue;

            if (slotMinutes <= 12 * 60) {
                groups[0].slots.push(slot);
            } else if (slotMinutes <= 18 * 60) {
                groups[1].slots.push(slot);
            } else {
                groups[2].slots.push(slot);
            }
        }

        return groups.filter((group) => group.slots.length > 0);
    }, [timeSlots]);
    const availableDates = useMemo(() => new Set(dates.map((item) => item.value.split("T")[0])), [dates]);
    const monthTitle = useMemo(() => formatMonthLabel(monthCursor), [monthCursor]);
    const monthGrid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
    const isSpecialtiesLoading = loadingSpecialties;
    const isDoctorsLoading = loadingSpecialties || loadingDoctors;
    const isDatesLoading = loadingSpecialties || loadingDoctors || loadingDates;
    const isTimesLoading = loadingSpecialties || loadingDoctors || loadingDates || loadingTimes;

    const canConfirm = Boolean(specId && doctorId && branchId && date && timeISO && !saving);

    useEffect(() => {
        if (canConfirm && showMissingWarning) {
            setShowMissingWarning(false);
        }
    }, [canConfirm, showMissingWarning]);

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

    function goPrevMonth() {
        setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }

    function goNextMonth() {
        setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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

    function onBottomButtonClick() {
        if (canConfirm) {
            confirm();
            return;
        }

        setShowMissingWarning(true);
    }

    return (
        <PageLayout
            showBottom={true}
            bottomButtonText={saving ? "Сохраняем..." : isRescheduleMode ? "Перенести запись" : "Подтвердить запись"}
            onBottomButtonClick={onBottomButtonClick}
            before={showMissingWarning ? (
                <Typography.Label className="bookVisitWarning">
                    Чтобы продолжить, выберите специальность, врача, дату и время.
                </Typography.Label>
            ) : null}
            bottomButtonDisabled={saving}
            showBottomButton={true}
        >
            <Flex direction="column" gap={10}>
                <SectionTitle
                    title={isRescheduleMode ? "Перенос записи" : "Запись на приём"}
                    subtitle="Выберите параметры приёма"
                />

                {!isTimesLoading && error ? (
                    <Container className="card">
                        <Typography.Label>{error}</Typography.Label>
                    </Container>
                ) : null}

                <SpecializationSection
                    specialties={specialties}
                    specId={specId}
                    onPickSpec={onPickSpec}
                    isLoading={isSpecialtiesLoading}
                    isRescheduleMode={isRescheduleMode}
                />

                <DoctorSection
                    specId={specId}
                    isLoading={isDoctorsLoading}
                    doctorsByBranch={doctorsByBranch}
                    doctorId={doctorId}
                    branchId={branchId}
                    onPickDoctor={onPickDoctor}
                    isRescheduleMode={isRescheduleMode}
                    getDoctorLabel={getDoctorLabel}
                />

                <DateSection
                    doctorId={doctorId}
                    isLoading={isDatesLoading}
                    monthTitle={monthTitle}
                    onPrevMonth={goPrevMonth}
                    onNextMonth={goNextMonth}
                    monthGrid={monthGrid}
                    monthCursor={monthCursor}
                    availableDates={availableDates}
                    selectedDate={date}
                    onPickDate={onPickDate}
                    toISODateOnly={toISODateOnly}
                />

                <TimeSection
                    date={date}
                    isLoading={isTimesLoading}
                    groupedTimeSlots={groupedTimeSlots}
                    timeISO={timeISO}
                    onPickTime={setTimeISO}
                />

                <SummarySection
                    specialization={selectedSpecialty?.title || "—"}
                    doctor={getDoctorLabel(selectedDoctor) || "—"}
                    date={date ? toRuDate(date) : "—"}
                    time={timeISO ? toRuTime(timeISO) : "—"}
                    cabinet={selectedSlot?.cabinetTitle || "—"}
                />
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
