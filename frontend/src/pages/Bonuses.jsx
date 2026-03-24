import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button, Spinner } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { useAuth } from "../context/AuthContext";
import { getBonusTransactions, getStoredAccessToken } from "../api";
import "../app.css";

export default function Bonuses() {
  const nav = useNavigate();
  const { me } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        setError("");

        const accessToken = getStoredAccessToken();

        if (!accessToken) {
          setItems([]);
          return;
        }

        const response = await getBonusTransactions(accessToken);
        setItems(Array.isArray(response?.items) ? response.items : []);
      } catch {
        setError("Не удалось загрузить историю бонусов");
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const balance = useMemo(() => Number(me?.bonus || 0), [me?.bonus]);

  return (
    <PageLayout headerTitle="Мои бонусы" showBottomButton={false}>
      <Flex direction="column" gap={10}>
        <Container className="card">
          <Flex direction="column" gap={10}>
            <Typography.Title level={2}>{balance} ₽</Typography.Title>
            <Typography.Label>Текущий остаток бонусов</Typography.Label>
          </Flex>
        </Container>

        <Container className="card">
          <Flex direction="column" gap={10}>
            <Typography.Title level={3}>История операций</Typography.Title>

            {loading ? (
              <Typography.Label>
                <Spinner appearance="primary" size={20} /> Загружаем операции...
              </Typography.Label>
            ) : null}

            {!loading && error ? <Typography.Label>{error}</Typography.Label> : null}

            {!loading && !error && items.length === 0 ? (
              <Typography.Label>Операций пока нет</Typography.Label>
            ) : null}

            {!loading && !error && items.length > 0
              ? items.map((item, index) => {
                const isCredit = item.operation === "credit";

                return (
                  <Container key={`${item.operation}-${item.sum}-${index}`} className="card card--tight">
                    <Flex direction="column" gap={6}>
                      <Flex align="center" justify="space-between" gap={8}>
                        <Typography.Title level={3}>
                          {isCredit ? "+" : "-"}
                          {item.sum} ₽
                        </Typography.Title>
                        <Typography.Label>
                          {isCredit ? "Начисление" : "Списание"}
                        </Typography.Label>
                      </Flex>

                      <Typography.Label>{item.description || "Без описания"}</Typography.Label>

                      {item.operation_sum !== undefined ? (
                        <Typography.Label>Сумма покупки: {item.operation_sum} ₽</Typography.Label>
                      ) : null}
                    </Flex>
                  </Container>
                );
              })
              : null}

            <Button mode="secondary" onClick={() => nav("/")}>
              На главную
            </Button>
          </Flex>
        </Container>
      </Flex>
    </PageLayout>
  );
}
