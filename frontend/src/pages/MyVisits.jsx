import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button, CellHeader } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import QuestionDialog from "../components/QuestionDialog";
import { getAppointments, getStoredAccessToken } from "../api";
import "../App.css";

function normalizeAppointment(item, index) {
    const sourceDate = item?.datetimeBegin || item?.appointment_date || "";
    const dateObj = sourceDate ? new Date(sourceDate) : null;
    const isValidDate = dateObj instanceof Date && !Number.isNaN(dateObj.valueOf());
    const date = isValidDate ? dateObj.toLocaleDateString("ru-RU") : "Без даты";
    const time = isValidDate ? dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "--:--";

    return {
        id: item?.appointment_id || item?.appointmentId || item?.id || `appointment-${index}`,
        date,
        time,
        doctor: [
            item?.doctorLastname,
            item?.doctorFirstname,
            item?.doctorPatronimic,
        ].filter(Boolean).join(" ") || "Не указан",
        spec: item?.specializationTitle || "Специализация не указана",
        place: item?.cabinetTitle || "Кабинет не указан",
        clinic: item?.branchTitle || "Филиал не указан",
        status: item?.conditionTitle || "Статус не указан",
    };
}

function VisitCard({ v, onConfirm, onCancel, onReschedule }) {
    const isConfirmed = v.status === "Подтверждена";

    return (
        <Container className="card">
            <Flex direction="column" gap={12}>

                <Flex align="center" justify="space-between" gap={10}>
                    <Typography.Title level={3}>
                        {v.date} • {v.time}
                    </Typography.Title>

                    <span className={`statusPill ${isConfirmed ? "status--ok" : ""}`}>
                        {v.status}
                    </span>
                </Flex>

                <div className="visitLine">
                    <Typography.Label>Врач</Typography.Label>
                    <Typography.Label>
                        {v.spec} • {v.doctor}
                    </Typography.Label>
                </div>

                <div className="visitLine">
                    <Typography.Label>Место</Typography.Label>
                    <Typography.Label>
                        {v.clinic}, {v.place}
                    </Typography.Label>
                </div>

                {/* Кнопки */}
                <Flex gap={8} className="visitActions">

                    {!isConfirmed && (
                        <Button onClick={() => onConfirm(v.id)}>
                            Подтвердить
                        </Button>
                    )}

                    <Button
                        mode="secondary"
                        onClick={() => onReschedule(v.id)}
                    >
                        Перенести
                    </Button>

                    <Button
                        mode="secondary"
                        className="dangerBtn"
                        onClick={() => onCancel(v.id)}
                    >
                        Отменить
                    </Button>

                </Flex>

            </Flex>
        </Container>
    );
}

export default function MyVisits() {
    const nav = useNavigate();

    const [visits, setVisits] = useState([]);
    const [cancelDialogVisitId, setCancelDialogVisitId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadAppointments() {
            try {
                setLoading(true);
                setError("");
                const accessToken = getStoredAccessToken();

                if (!accessToken) {
                    setVisits([]);
                    return;
                }

                const response = await getAppointments(accessToken);
                const items = Array.isArray(response?.items) ? response.items : [];
                setVisits(items.map(normalizeAppointment));
            } catch {
                setError("Не удалось загрузить записи");
            } finally {
                setLoading(false);
            }
        }

        loadAppointments();
    }, []);

    const hasVisits = useMemo(() => visits.length > 0, [visits]);

    function confirmVisit(id) {
        setVisits((prev) =>
            prev.map((v) =>
                v.id === id ? { ...v, status: "Подтверждена" } : v
            )
        );
    }

    function cancelVisit(id) {
        setVisits((prev) => prev.filter((v) => v.id !== id));
    }

    function openCancelDialog(id) {
        setCancelDialogVisitId(id);
    }

    function closeCancelDialog() {
        setCancelDialogVisitId(null);
    }

    function confirmCancelVisit() {
        if (!cancelDialogVisitId) {
            return;
        }

        cancelVisit(cancelDialogVisitId);
        closeCancelDialog();
    }

    function rescheduleVisit() {
        alert("Переход на страницу переноса (пока заглушка)");
    }



    return (
        <PageLayout
            showBottom={true}
            bottomButtonText="Вернуться на главную"
            onBottomButtonClick={() => { nav("/") }}
        >
            <Flex direction="column" gap={10}>
                <CellHeader titleStyle="caps">Мои записи</CellHeader>

                {loading ? (
                    <Container className="card">
                        <Typography.Label>Загрузка записей...</Typography.Label>
                    </Container>
                ) : null}

                {!loading && error ? (
                    <Container className="card">
                        <Typography.Label>{error}</Typography.Label>
                    </Container>
                ) : null}

                {!loading && !error && !hasVisits ? (
                    <Container className="card">
                        <Typography.Label>У вас нет предстоящих приёмов</Typography.Label>
                        <Button style={{ marginTop: 12 }} onClick={() => nav("/book")}>
                            Записаться на приём
                        </Button>
                    </Container>
                ) : null}

                {!loading && !error && hasVisits ? (
                    visits.map((v) => (
                        <VisitCard
                            key={v.id}
                            v={v}
                            onConfirm={confirmVisit}
                            onCancel={openCancelDialog}
                            onReschedule={rescheduleVisit}
                        />
                    ))
                ) : null}
            </Flex>

            <QuestionDialog
                open={Boolean(cancelDialogVisitId)}
                question="Вы уверены что хотите отменить запись на прием?"
                onCancel={closeCancelDialog}
                onConfirm={confirmCancelVisit}
                cancelText="Нет"
                confirmText="Да, отменить"
                confirmMode="secondary"
                confirmClassName="dangerBtn"
            />
        </PageLayout>
    );
}
