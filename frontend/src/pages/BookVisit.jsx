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
import {
    buildMonthGrid,
    buildSlotsByShifts,
    formatMonthLabel,
    getDoctorLabel,
    getMonthStart,
    getTimeMinutes,
    normalizeDateValue,
    toRuDate,
    toRuTime,
} from "../modules/bookVisitHelpers";
import "../App.css";

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
