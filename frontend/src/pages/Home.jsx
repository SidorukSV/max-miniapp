import { useNavigate } from "react-router-dom";
import { Container, Flex, Avatar, Typography, CellList, CellSimple, EllipsisText, Counter } from "@maxhub/max-ui";
import { Calendar, LibraryBig, Gift, LogOut, ClipboardList } from "lucide-react";
import PageLayout from "../components/PageLayout";
import "../app.css";
import { useAuth } from "../context/AuthContext.jsx";
import AuthScreen from "../components/AuthScreen.jsx";
import { HomeLoadingCard } from "../components/loadingCard.jsx";
import { useState } from "react";
import { clearTokens, authLogout } from "../api.js";

import { getFallbackGradientByInitials } from "../modules/avatarGradient.js";
import { getSurveys } from "../modules/surveyStore.js";
import { SURVEY_STATUSES } from "../data/mockSurveys.js";

export default function Home() {
    const nav = useNavigate();
    const { me, loading, isAuthorized, setMe } = useAuth();

    const [busy, setBusy] = useState(false);
    const username = me?.fullName || "Иван Иванов";
    const phone = me?.phone || "79123456789";
    const parts = username.trim().split(/\s+/, 2);
    const initials = parts.map(p => p[0]?.toUpperCase()).join("");
    const bonus = me?.bonus || 0;
    const newSurveysCount = getSurveys().filter((survey) => survey.status === SURVEY_STATUSES.NEW).length;

    async function handleLogout() {
        setBusy(true);
        try {
            await authLogout();
        } catch (err) {
            console.log(err);
        } finally {
            clearTokens();
            setMe(null);
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <PageLayout showBottomButton={false}>
                <HomeLoadingCard />
            </PageLayout>
        );
    }

    if (!isAuthorized) {
        return (
            <PageLayout showBottomButton={false}>
                <AuthScreen />
            </PageLayout>
        );
    }

    return (
        <PageLayout
            bottomButtonText="Записаться на прием"
            onBottomButtonClick={() => nav("/book")}
        >
            <Flex direction="column" gap={10}>
                {/* Карточка пациента */}
                <Container className="card card--tight">
                    <Flex align="center" justify="space-between" gap={12}>
                        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                            <Avatar.Container style={{ minWidth: 60 }} size={60} form="circle">
                                <Avatar.Image fallback={initials} fallbackGradient={getFallbackGradientByInitials(initials)} />
                            </Avatar.Container>

                            <div className="nameBlock">
                                <Typography.Title level={3} className="nameLine">
                                    <EllipsisText maxLines={3}>
                                        {username}
                                    </EllipsisText>
                                </Typography.Title>

                                {/* "Пациент" отдельно под ФИО */}
                                <Typography.Label className="roleLine">
                                    {phone}
                                </Typography.Label>
                            </div>
                        </Flex>

                        <Flex align="center" gap={10} className="actions">

                            {/* Бонусы */}
                            <button
                                type="button"
                                className="bonusChip bonusChip--clickable"
                                onClick={() => nav("/bonuses")}
                                aria-label="Открыть бонусы"
                            >
                                <div className="bonusIcon">
                                    <Gift size={16} />
                                </div>
                                <Typography.Title level={3} className="bonusValue">
                                    {bonus} ₽
                                </Typography.Title>
                            </button>

                        </Flex>

                    </Flex>
                </Container>

                {/* Меню */}
                <Container className="card menuCard">
                    <CellList>
                        <CellSimple
                            before={<Calendar size={24} />}
                            showChevron
                            onClick={() => nav("/visits")}
                        >
                            Мои записи
                        </CellSimple>

                        <CellSimple
                            before={<LibraryBig size={24} />}
                            showChevron
                            onClick={() => nav("/history")}
                        >
                            История приёмов
                        </CellSimple>

                        <CellSimple
                            before={<ClipboardList size={24} />}
                            showChevron
                            onClick={() => nav("/surveys")}
                            after={newSurveysCount > 0 ? <Counter>{newSurveysCount}</Counter> : null}
                        >
                            Мои анкеты
                        </CellSimple>

                        <CellSimple
                            before={<LogOut size={24} />}
                            showChevron={false}
                            onClick={async () => handleLogout()}
                        >
                            {busy ? "Выходим" : "Выйти"}
                        </CellSimple>
                    </CellList>
                </Container>
            </Flex>
        </PageLayout >
    );
}