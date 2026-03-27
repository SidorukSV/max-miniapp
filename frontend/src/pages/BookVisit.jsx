import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container, Flex, Typography, Button } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout.jsx";
import "../app.css";

const MOCK = {
    specialties: ["Терапевт", "Кардиолог", "ЛОР", "Офтальмолог", "Невролог"],
    doctorsBySpec: {
        "Терапевт": ["Петров П.П.", "Сидорова А.А."],
        "Кардиолог": ["Иванова И.А.", "Кузнецов Д.Д."],
        "ЛОР": ["Смирнов С.С."],
        "Офтальмолог": ["Орлова Е.Е."],
        "Невролог": ["Фёдоров Ф.Ф."],
    },
    dates: ["03.03.2026", "04.03.2026", "05.03.2026", "06.03.2026", "07.03.2026"],
    times: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"],
};

function Pill({ active, children, onClick }) {
    return (
        <button
            type="button"
            className={`pill ${active ? "pill--active" : ""}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function SectionTitle({ title, subtitle }) {
    return (
        <div className="pageTitle">
            <Typography.Title level={2}>{title}</Typography.Title>
            {subtitle ? (
                <Typography.Label style={{ marginTop: 6 }}>
                    {subtitle}
                </Typography.Label>
            ) : null}
        </div>
    );
}

export default function BookVisit() {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();

    const [spec, setSpec] = useState("");
    const [doctor, setDoctor] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    useEffect(() => {
        const qSpec = searchParams.get("spec") || "";
        const qDoctor = searchParams.get("doctor") || "";
        // если пришла спец-ть и она есть в списке — применяем
        if (qSpec && MOCK.specialties.includes(qSpec)) {
            setSpec(qSpec);

            // если пришёл врач и он есть в списке этой спец-ти
            const docs = MOCK.doctorsBySpec[qSpec] || [];
            if (qDoctor && docs.includes(qDoctor)) {
                setDoctor(qDoctor);
            } else {
                setDoctor("");
            }

            // при повторе дату/время сбрасываем — выбирает пользователь
            setDate("");
            setTime("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const doctors = useMemo(() => (spec ? MOCK.doctorsBySpec[spec] || [] : []), [spec]);

    const step = useMemo(() => {
        if (!spec) return 1;
        if (!doctor) return 2;
        if (!date) return 3;
        if (!time) return 4;
        return 5;
    }, [spec, doctor, date, time]);

    const canConfirm = step === 5;

    function resetFrom(level) {
        if (level <= 1) setSpec("");
        if (level <= 2) setDoctor("");
        if (level <= 3) setDate("");
        if (level <= 4) setTime("");
    }

    function onPickSpec(s) {
        setSpec(s);
        setDoctor("");
        setDate("");
        setTime("");
    }

    function onPickDoctor(d) {
        setDoctor(d);
        setDate("");
        setTime("");
    }

    function onPickDate(d) {
        setDate(d);
        setTime("");
    }

    function confirm() {
        // тут потом будет запрос на backend
        alert(`Запись создана:\n${spec}\n${doctor}\n${date} ${time}`);
        nav("/"); // или nav("/my-records")
    }

    return (
        <PageLayout
            showBottom={true}
            bottomButtonText={canConfirm ? "Подтвердить запись" : "Выберите данные"}
            onBottomButtonClick={canConfirm ? confirm : undefined}
            showBottomButton={true}
        >
            <Flex direction="column" gap={10}>
                <SectionTitle
                    title="Запись на приём"
                    subtitle={`Шаг ${Math.min(step, 4)} из 4`}
                />

                {/* 1) Специальность */}
                <Container className="card">
                    <Flex align="center" justify="space-between" gap={12}>
                        <Typography.Title level={3}>Специальность</Typography.Title>
                        {spec ? (
                            <button className="linkBtn" type="button" onClick={() => resetFrom(1)}>
                                изменить
                            </button>
                        ) : null}
                    </Flex>

                    <div className="pills">
                        {MOCK.specialties.map((s) => (
                            <Pill key={s} active={spec === s} onClick={() => onPickSpec(s)}>
                                {s}
                            </Pill>
                        ))}
                    </div>
                </Container>

                {/* 2) Врач */}
                <Container className={`card ${spec ? "" : "card--disabled"}`}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <Typography.Title level={3}>Врач</Typography.Title>
                        {doctor ? (
                            <button className="linkBtn" type="button" onClick={() => resetFrom(2)}>
                                изменить
                            </button>
                        ) : null}
                    </Flex>
                    {!spec ? (
                        <Typography.Label style={{ marginTop: 8 }}>
                            Сначала выберите специальность
                        </Typography.Label>
                    ) : (
                        <div className="pills">
                            {doctors.map((d) => (
                                <Pill key={d} active={doctor === d} onClick={() => onPickDoctor(d)}>
                                    {d}
                                </Pill>
                            ))}
                        </div>
                    )}
                </Container>

                {/* 3) Дата */}
                <Container className={`card ${doctor ? "" : "card--disabled"}`}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <Typography.Title level={3}>Дата</Typography.Title>
                        {date ? (
                            <button className="linkBtn" type="button" onClick={() => resetFrom(3)}>
                                изменить
                            </button>
                        ) : null}
                    </Flex>

                    {!doctor ? (
                        <Typography.Label style={{ marginTop: 8 }}>
                            Сначала выберите врача
                        </Typography.Label>
                    ) : (
                        <div className="pills">
                            {MOCK.dates.map((d) => (
                                <Pill key={d} active={date === d} onClick={() => onPickDate(d)}>
                                    {d}
                                </Pill>
                            ))}
                        </div>
                    )}
                </Container>

                {/* 4) Время */}
                <Container className={`card ${date ? "" : "card--disabled"}`}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <Typography.Title level={3}>Время</Typography.Title>
                        {time ? (
                            <button className="linkBtn" type="button" onClick={() => resetFrom(4)}>
                                изменить
                            </button>
                        ) : null}
                    </Flex>

                    {!date ? (
                        <Typography.Label style={{ marginTop: 8 }}>
                            Сначала выберите дату
                        </Typography.Label>
                    ) : (
                        <div className="pills">
                            {MOCK.times.map((t) => (
                                <Pill key={t} active={time === t} onClick={() => setTime(t)}>
                                    {t}
                                </Pill>
                            ))}
                        </div>
                    )}
                </Container>

                {/* Резюме выбора */}
                <Container className="card">
                    <Typography.Title level={3}>Итог</Typography.Title>

                    <div className="summary">
                        <div className="summaryRow">
                            <Typography.Label>Специальность</Typography.Label>
                            <Typography.Label>{spec || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Врач</Typography.Label>
                            <Typography.Label>{doctor || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Дата</Typography.Label>
                            <Typography.Label>{date || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Время</Typography.Label>
                            <Typography.Label>{time || "—"}</Typography.Label>
                        </div>
                    </div>

                    <Button
                        mode="secondary"
                        style={{ marginTop: 12, width: "100%" }}
                        onClick={() => nav("/")}
                    >
                        Назад на главную
                    </Button>
                </Container>
            </Flex>
        </PageLayout>
    );
}