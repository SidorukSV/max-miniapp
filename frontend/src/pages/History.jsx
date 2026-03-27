import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import "../App.css";

const mockHistory = [
    {
        id: "h1",
        date: "25.02.2026",
        time: "12:00",
        doctor: "Иванова И.А.",
        spec: "Кардиолог",
        clinic: "Филиал на Мира, 5",
        place: "Кабинет 110",
        status: "Завершён",
        note: "Рекомендации выданы",
    },
    {
        id: "h2",
        date: "18.02.2026",
        time: "09:30",
        doctor: "Орлова Е.Е.",
        spec: "Офтальмолог",
        clinic: "Филиал на Центральной, 8",
        place: "Кабинет 410",
        status: "Завершён",
        note: "Проверка зрения",
    },
    {
        id: "h3",
        date: "02.02.2026",
        time: "15:00",
        doctor: "Смирнов С.С.",
        spec: "ЛОР",
        clinic: "Филиал на Победы, 3",
        place: "Кабинет 305",
        status: "Отменён",
        note: "Отменено пациентом",
    },
    {
        id: "h4",
        date: "15.01.2026",
        time: "10:30",
        doctor: "Петров П.П.",
        spec: "Терапевт",
        clinic: "Филиал на Ленина, 10",
        place: "Кабинет 203",
        status: "Завершён",
        note: "Осмотр",
    },
    {
        id: "h5",
        date: "09.01.2026",
        time: "14:30",
        doctor: "Фёдоров Ф.Ф.",
        spec: "Невролог",
        clinic: "Филиал на Центральной, 8",
        place: "Кабинет 502",
        status: "Неявка",
        note: "Неявка",
    },
    {
        id: "h6",
        date: "22.12.2025",
        time: "11:00",
        doctor: "Кузнецов Д.Д.",
        spec: "Кардиолог",
        clinic: "Филиал на Мира, 5",
        place: "Кабинет 112",
        status: "Завершён",
        note: "Контроль давления",
    },
];

function parseDateDDMMYYYY(s) {
    // "25.02.2026" -> Date(2026-02-25)
    const [dd, mm, yyyy] = s.split(".");
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function monthKey(dateStr) {
    const d = parseDateDDMMYYYY(dateStr);
    const monthNames = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function HistoryCard({ item, onRepeat }) {
    const statusClass =
        item.status === "Завершён"
            ? "status--ok"
            : item.status === "Отменён"
                ? "status--danger"
                : "status--muted";

    return (
        <Container className="card">
            <Flex direction="column" gap={10}>
                <Flex align="center" justify="space-between" gap={10}>
                    <Typography.Title level={3}>
                        {item.date} • {item.time}
                    </Typography.Title>

                    <span className={`statusPill ${statusClass}`}>{item.status}</span>
                </Flex>

                <div className="visitLine">
                    <Typography.Label>Врач</Typography.Label>
                    <Typography.Label>
                        {item.spec} • {item.doctor}
                    </Typography.Label>
                </div>

                <div className="visitLine">
                    <Typography.Label>Место</Typography.Label>
                    <Typography.Label>
                        {item.clinic}, {item.place}
                    </Typography.Label>
                </div>

                {item.note ? (
                    <Typography.Label style={{ marginTop: 2 }}>
                        {item.note}
                    </Typography.Label>
                ) : null}

                <Button mode="secondary" onClick={() => onRepeat(item)}>
                    Повторить запись
                </Button>
            </Flex>
        </Container >
    );
}

export default function History() {
    const nav = useNavigate();

    const grouped = useMemo(() => {
        const sorted = [...mockHistory].sort(
            (a, b) => parseDateDDMMYYYY(b.date) - parseDateDDMMYYYY(a.date)
        );

        const map = new Map();
        for (const item of sorted) {
            const key = monthKey(item.date);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        }
        return Array.from(map.entries()); // [ [month, items], ... ]
    }, []);

    function repeat(item) {
        
        const params = new URLSearchParams();
        params.set("doctor", item.doctor);
        params.set("spec", item.spec);
        
        nav(`/book?${params.toString()}`);
    }

    return (
        <PageLayout
            showBottom={true}
            bottomButtonText="Вернуться на главную"
            onBottomButtonClick={() => { nav("/") }}
        >
            <Flex direction="column" gap={12}>
                <Typography.Title level={2}>История приемов</Typography.Title>

                {grouped.map(([month, items]) => (
                    <div key={month} className="historyGroup">
                        <div className="historyGroupHeader">
                            <span className="historyGroupBar" />
                            <Typography.Label className="historyMonth">
                                {month}
                            </Typography.Label>
                        </div>

                        <Flex direction="column" gap={10}>
                            {items.map((it) => (
                                <HistoryCard key={it.id} item={it} onRepeat={repeat} />
                            ))}
                        </Flex>
                    </div>
                ))}

            </Flex>
        </PageLayout>
    );
}