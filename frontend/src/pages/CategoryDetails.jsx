import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Container, Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { getCatalogCategoryById, getStoredAccessToken } from "../api";

function formatMoney(value) {
    if (typeof value !== "number") return "";
    return `${value.toLocaleString("ru-RU")} ₽`;
}

function filterByQuery(content, query) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) {
        return content;
    }

    const byTitle = (item) => String(item?.title || "").toLowerCase().includes(normalized);

    const groupedServices = (content?.groupedServices || [])
        .map((group) => ({
            ...group,
            items: (group.items || []).filter(byTitle),
        }))
        .filter((group) => group.items.length > 0);

    return {
        ...content,
        doctorCards: (content?.doctorCards || []).filter(byTitle),
        directionCards: (content?.directionCards || []).filter(byTitle),
        serviceCatalog: (content?.serviceCatalog || []).filter(byTitle),
        groupedServices,
    };
}

export default function CategoryDetails() {
    const nav = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        let alive = true;

        async function loadDetail() {
            setLoading(true);
            setError("");
            try {
                const accessToken = getStoredAccessToken();
                if (!accessToken) {
                    throw new Error("unauthorized");
                }

                const response = await getCatalogCategoryById(accessToken, id);
                if (alive) {
                    setDetail(response?.item || null);
                }
            } catch {
                if (alive) {
                    setError("Не удалось загрузить категорию.");
                }
            } finally {
                if (alive) {
                    setLoading(false);
                }
            }
        }

        loadDetail();
        return () => {
            alive = false;
        };
    }, [id]);

    const category = detail?.category || detail;
    const baseContent = detail?.content || {};
    const content = useMemo(() => filterByQuery(baseContent, query), [baseContent, query]);

    const hasContent = useMemo(() => {
        return Boolean(
            content?.doctorCards?.length
            || content?.directionCards?.length
            || content?.serviceCatalog?.length,
        );
    }, [content]);

    return (
        <PageLayout
            headerTitle={category?.title || "Категория"}
            bottomButtonText="На главную"
            onBottomButtonClick={() => nav("/")}
            showBottomButton={true}
        >
            <Flex direction="column" gap={10}>
                {loading ? (
                    <Container className="card"><Typography.Label>Загрузка категории...</Typography.Label></Container>
                ) : null}

                {!loading && error ? (
                    <Container className="card"><Typography.Label>{error}</Typography.Label></Container>
                ) : null}

                {category ? (
                    <Container className="card">
                        <Flex direction="column" gap={8}>
                            <Typography.Title level={3}>{category.title}</Typography.Title>
                            <Typography.Label>
                                Режим: {category.appointmentMode}. Источник: {category.sourceType}.
                            </Typography.Label>
                            <Typography.Label>
                                Корзина: {category.allowCart ? "включена" : "выключена"}, preorder: {category.allowQueuePreorder ? "включен" : "выключен"}.
                            </Typography.Label>
                            <input
                                className="categorySearchInput"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Поиск по карточкам и услугам"
                            />
                            {id === "online-doctors" ? (
                                <Button stretched={true} onClick={() => nav("/book")}>
                                    Перейти в сценарий онлайн-записи (/book)
                                </Button>
                            ) : null}
                        </Flex>
                    </Container>
                ) : null}

                {!loading && !hasContent ? (
                    <Container className="card"><Typography.Label>В категории пока нет элементов.</Typography.Label></Container>
                ) : null}

                {category?.showDoctorCards ? (
                    <Container className="card">
                        <Typography.Title level={3}>Врачи</Typography.Title>
                        <Flex direction="column" gap={8}>
                            {(content?.doctorCards || []).map((item) => (
                                <Container key={item.id} className="categoryItemCard">
                                    <Typography.Title level={4}>{item.title}</Typography.Title>
                                    <Typography.Label>{item.subtitle}</Typography.Label>
                                    <Typography.Label>{formatMoney(item.price)}</Typography.Label>
                                </Container>
                            ))}
                        </Flex>
                    </Container>
                ) : null}

                {category?.showDirectionCards ? (
                    <Container className="card">
                        <Typography.Title level={3}>Направления</Typography.Title>
                        <Flex direction="column" gap={8}>
                            {(content?.directionCards || []).map((item) => (
                                <Container key={item.id} className="categoryItemCard">
                                    <Typography.Title level={4}>{item.title}</Typography.Title>
                                    <Typography.Label>Режим записи: {item.appointmentMode}</Typography.Label>
                                </Container>
                            ))}
                        </Flex>
                    </Container>
                ) : null}

                {category?.showServiceCatalog ? (
                    <Container className="card">
                        <Typography.Title level={3}>Каталог услуг</Typography.Title>
                        <Flex direction="column" gap={8}>
                            {(content?.groupedServices || []).map((group) => (
                                <Container key={group.id} className="categoryGroupCard">
                                    <Typography.Title level={4}>{group.title}</Typography.Title>
                                    <Flex direction="column" gap={6}>
                                        {group.items.map((item) => (
                                            <Container key={item.id} className="categoryItemCard">
                                                <Typography.Label>{item.title}</Typography.Label>
                                                <Typography.Label>{formatMoney(item.price)}</Typography.Label>
                                            </Container>
                                        ))}
                                    </Flex>
                                </Container>
                            ))}
                        </Flex>
                    </Container>
                ) : null}
            </Flex>
        </PageLayout>
    );
}
