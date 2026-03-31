import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CellHeader, Container, Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { getStoredAccessToken, getSurveys } from "../api";

function toRuDateTime(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return "Без даты";
  }

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveAnswerLabel(item) {
  if (item?.openAnswer) {
    return item.openAnswer;
  }

  const numberAnswer = item?.numberAnswer;
  const answerTitle = item?.answerTitle;
  if (answerTitle && numberAnswer !== null && numberAnswer !== undefined && numberAnswer !== "") {
    return `${numberAnswer}. ${answerTitle}`;
  }

  return answerTitle || "Ответ не заполнен";
}

function normalizeSurvey(item) {
  return {
    id: item?.surveyId || "",
    status: item?.isDone ? "Завершена" : "Новая",
    title: item?.surveyTemplateTitle || "Анкета",
    date: toRuDateTime(item?.surveyDate),
    questions: Array.isArray(item?.surveyItems)
      ? [...item.surveyItems]
        .sort((a, b) => Number(a?.numberQuestion || 0) - Number(b?.numberQuestion || 0))
        .map((question, index) => ({
          id: question?.questionId || `${index}`,
          number: question?.numberQuestion || index + 1,
          title: question?.questionTitle || "Вопрос без текста",
          answer: resolveAnswerLabel(question),
        }))
      : [],
  };
}

export default function SurveyDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSurvey() {
      const accessToken = getStoredAccessToken();
      if (!id || !accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await getSurveys(accessToken);
        const items = Array.isArray(response?.items) ? response.items : [];
        const found = items.find((item) => item?.surveyId === id);
        setSurvey(found ? normalizeSurvey(found) : null);
      } catch {
        setError("Не удалось загрузить анкету");
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [id]);

  const hasQuestions = useMemo(() => (survey?.questions?.length || 0) > 0, [survey?.questions?.length]);

  if (!loading && !error && !survey) {
    return (
      <PageLayout showBottom bottomButtonText="К списку анкет" onBottomButtonClick={() => nav("/surveys")}>
        <Container className="card">
          <Typography.Title level={3}>Анкета не найдена</Typography.Title>
          <Typography.Label style={{ marginTop: 6 }}>Проверьте ссылку или вернитесь к списку анкет.</Typography.Label>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout showBottom bottomButtonText="К списку анкет" onBottomButtonClick={() => nav("/surveys")}>
      <Flex direction="column" gap={10}>
        <CellHeader titleStyle="caps">Анкета</CellHeader>

        <Container className="card">
          <Flex direction="column" gap={8}>
            <Typography.Title level={3}>{survey?.title || "Анкета"}</Typography.Title>
            <Typography.Label>Дата: {survey?.date || "Без даты"}</Typography.Label>
            <span className={`statusPill ${survey?.status === "Новая" ? "" : "status--ok"}`}>{survey?.status || "—"}</span>
          </Flex>
        </Container>

        <Container className="card">
          {loading ? <Typography.Label>Загрузка анкеты...</Typography.Label> : null}
          {!loading && error ? <Typography.Label>{error}</Typography.Label> : null}

          {!loading && !error && hasQuestions ? (
            <Flex direction="column" gap={14}>
              {survey.questions.map((question) => (
                <div key={question.id} style={{ width: "100%" }}>
                  <Typography.Label style={{ display: "block", marginBottom: 8 }}>
                    {question.number}. {question.title}
                  </Typography.Label>
                  <Typography.Label style={{ color: "var(--tg-theme-hint-color, #7d7d7d)" }}>
                    {question.answer}
                  </Typography.Label>
                </div>
              ))}
            </Flex>
          ) : null}

          {!loading && !error && !hasQuestions ? (
            <Typography.Label>В анкете пока нет вопросов.</Typography.Label>
          ) : null}
        </Container>
      </Flex>
    </PageLayout>
  );
}
