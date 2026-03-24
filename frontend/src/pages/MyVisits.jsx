import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button, CellHeader } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import QuestionDialog from "../components/QuestionDialog";
import "../App.css";

const mockUpcomingInitial = [
    {
        id: "v1",
        date: "04.03.2026",
        time: "09:00",
        doctor: "Петров П.П.",
        spec: "Терапевт",
        place: "Кабинет 203",
        clinic: "Филиал на Ленина, 10",
        status: "Ожидает подтверждения",
    },
    {
        id: "v2",
        date: "04.03.2026",
        time: "11:30",
        doctor: "Сидорова А.А.",
        spec: "Терапевт",
        place: "Кабинет 207",
        clinic: "Филиал на Ленина, 10",
        status: "Подтверждена",
    },
    {
        id: "v3",
        date: "05.03.2026",
        time: "14:00",
        doctor: "Иванова И.А.",
        spec: "Кардиолог",
        place: "Кабинет 110",
        clinic: "Филиал на Мира, 5",
        status: "Подтверждена",
    },
    {
        id: "v4",
        date: "06.03.2026",
        time: "16:30",
        doctor: "Кузнецов Д.Д.",
        spec: "Кардиолог",
        place: "Кабинет 112",
        clinic: "Филиал на Мира, 5",
        status: "Ожидает подтверждения",
    },
    {
        id: "v5",
        date: "07.03.2026",
        time: "10:00",
        doctor: "Смирнов С.С.",
        spec: "ЛОР",
        place: "Кабинет 305",
        clinic: "Филиал на Победы, 3",
        status: "Подтверждена",
    },
    {
        id: "v6",
        date: "10.03.2026",
        time: "13:00",
        doctor: "Орлова Е.Е.",
        spec: "Офтальмолог",
        place: "Кабинет 410",
        clinic: "Филиал на Центральной, 8",
        status: "Подтверждена",
    },
    {
        id: "v7",
        date: "12.03.2026",
        time: "15:30",
        doctor: "Фёдоров Ф.Ф.",
        spec: "Невролог",
        place: "Кабинет 502",
        clinic: "Филиал на Центральной, 8",
        status: "Ожидает подтверждения",
    },
    {
        id: "v8",
        date: "18.03.2026",
        time: "09:30",
        doctor: "Петров П.П.",
        spec: "Терапевт",
        place: "Кабинет 203",
        clinic: "Филиал на Ленина, 10",
        status: "Подтверждена",
    },
    {
        id: "v9",
        date: "22.03.2026",
        time: "12:30",
        doctor: "Иванова И.А.",
        spec: "Кардиолог",
        place: "Кабинет 110",
        clinic: "Филиал на Мира, 5",
        status: "Ожидает подтверждения",
    },
];

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

    const [visits, setVisits] = useState(mockUpcomingInitial);
    const [cancelDialogVisitId, setCancelDialogVisitId] = useState(null);

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

    function rescheduleVisit(id) {
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

                {mockUpcomingInitial.length === 0 ? (
                    <Container className="card">
                        <Typography.Label>У вас нет предстоящих приёмов</Typography.Label>
                        <Button style={{ marginTop: 12 }} onClick={() => nav("/book")}>
                            Записаться на приём
                        </Button>
                    </Container>
                ) : (
                    visits.map((v) => (
                        <VisitCard
                            key={v.id}
                            v={v}
                            onConfirm={confirmVisit}
                            onCancel={openCancelDialog}
                            onReschedule={rescheduleVisit}
                        />
                    ))
                )}
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
