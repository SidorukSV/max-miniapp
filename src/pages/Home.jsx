import { useNavigate } from "react-router-dom";
import { Panel, Container, Flex, Avatar, Typography, Button, IconButton } from "@maxhub/max-ui";
import { MoreHorizontal, Calendar, History, ChevronRight, Gift } from "lucide-react";
import PageLayout from "../components/PageLayout";
import "../app.css";

export default function Home() {
    const nav = useNavigate();
    const username = "Семён Сидорук";
    const username_chapters = username.split(" ", 2);
    const initials = `${username_chapters.length == 2 ? `${username_chapters[0][0]}${username_chapters[1][0]}` :
        username_chapters.length == 1 ? username_chapters[0][0] : ""}`;

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
                            <Avatar.Container size={60} form="circle">
                                <Avatar.Image fallback={initials} fallbackGradient="green" />
                            </Avatar.Container>

                            <div className="nameBlock">
                                <Typography.Title level={3} className="nameLine">
                                    {username}
                                </Typography.Title>

                                {/* "Пациент" отдельно под ФИО */}
                                <Typography.Label className="roleLine">
                                    Пациент
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
                                    615.3 ₽
                                </Typography.Title>
                            </button>

                            {/* Ещё действия */}
                            <IconButton
                                appearance="themed"
                                aria-label="Ещё"
                                mode="secondary"
                                size="medium"
                                onClick={() => console.log("Меню")}
                            >
                                <MoreHorizontal size={20} />
                            </IconButton>

                        </Flex>
                    </Flex>
                </Container>

                {/* Меню */}
                <Container className="card menuCard">
                    <CellList>
                        <CellSimple
                            before={<Calendar size={20} />}
                            after="chevron"
                            onClick={() => nav("/my-records")}
                        >
                            Мои записи
                        </CellSimple>

                        <CellSimple
                            before={<History size={20} />}
                            after="chevron"
                            onClick={() => nav("/history")}
                        >
                            История приёмов
                        </CellSimple>
                    </CellList>
                </Container>
            </Flex>
        </PageLayout >
    );
}