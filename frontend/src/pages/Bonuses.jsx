import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button } from "@maxhub/max-ui";
import { format, isValid, parse, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import PageLayout from "../components/PageLayout";
import { useAuth } from "../context/AuthContext";
import { getBonusTransactions, getStoredAccessToken } from "../api";
import "../app.css";

function formatTransactionDate(dateISO) {
  const parsedDate = parseTransactionDate(dateISO);
  if (!parsedDate) {
    return "Без даты";
  }

  try {
    return format(parsedDate, "d MMMM yyyy", { locale: ru });
  } catch {
    return "Без даты";
  }
}

function parseTransactionDate(dateISO) {
  if (!dateISO) {
    return null;
  }

  try {
    const stringDate = String(dateISO).trim();
    const possibleParsers = [
      () => parseISO(stringDate),
      () => parse(stringDate, "yyyy-MM-dd'T'HH:mm:ss", new Date()),
      () => parse(stringDate, "yyyy-MM-dd HH:mm:ss", new Date()),
      () => parse(stringDate, "dd.MM.yyyy HH:mm:ss", new Date()),
      () => parse(stringDate, "dd.MM.yyyy", new Date()),
      () => new Date(stringDate),
    ];

    for (const parseDate of possibleParsers) {
      const parsedDate = parseDate();
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }

    return null;
  } catch {
    return null;
  }
}

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
  const groupedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const leftDate = parseTransactionDate(b?.date);
      const rightDate = parseTransactionDate(a?.date);

      return (leftDate?.getTime?.() || 0) - (rightDate?.getTime?.() || 0);
    });
    const map = new Map();

    for (const item of sorted) {
      const key = formatTransactionDate(item?.date);
      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(item);
    }

    return Array.from(map.entries());
  }, [items]);

  const skeletonRows = useMemo(() => [1, 2, 3], []);

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
              <div className="bonusesSkeletonList" aria-label="Загружаем историю операций">
                {skeletonRows.map((row) => (
                  <div key={row} className="bonusesSkeletonRow">
                    <div className="bonusesSkeletonLeft">
                      <div className="bonusesSkeletonLine bonusesSkeletonLine--title" />
                      <div className="bonusesSkeletonLine bonusesSkeletonLine--text" />
                    </div>
                    <div className="bonusesSkeletonAmount" />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && error ? <Typography.Label>{error}</Typography.Label> : null}

            {!loading && !error && items.length === 0 ? (
              <Typography.Label>Операций пока нет</Typography.Label>
            ) : null}

            {!loading && !error && items.length > 0
              ? groupedItems.map(([dateLabel, dateItems]) => (
                <div key={dateLabel} className="bonusesDateGroup">
                  <div className="bonusesDateHeader">{dateLabel}</div>

                  {dateItems.map((item, index) => {
                    const isCredit = item.operation === "credit";

                    return (
                      <div key={`${item.operation}-${item.sum}-${index}`} className="bonusesTxRow">
                        <div className="bonusesTxLeft">
                          <Flex direction="column" gap={4}>
                            <Typography.Title level={3}>{isCredit ? "Начисление" : "Списание"}</Typography.Title>
                            <Typography.Label>{item.description || "Без описания"}</Typography.Label>

                            {item.operation_sum !== undefined ? (
                              <Typography.Label>Сумма покупки: {item.operation_sum} ₽</Typography.Label>
                            ) : null}
                          </Flex>
                        </div>

                        <div className={`bonusesTxAmount ${isCredit ? "bonusesTxAmount--credit" : "bonusesTxAmount--debit"}`}>
                          {isCredit ? "+" : "-"}
                          {item.sum} ₽
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
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
