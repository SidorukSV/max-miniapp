import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CellHeader, Container, Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { getCatalogSurveyTemplates, getStoredAccessToken, getSurveys } from "../api";

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

function resolveTemplateAnswerTitle(questionTemplate, numberAnswer) {
  const answerItems = Array.isArray(questionTemplate?.questionOptions?.answerItems)
    ? questionTemplate.questionOptions.answerItems
    : [];

  if (!answerItems.length || numberAnswer === null || numberAnswer === undefined || numberAnswer === "") {
    return "";
  }

  const asNumber = Number(numberAnswer);
  if (Number.isFinite(asNumber) && asNumber > 0 && answerItems[asNumber - 1]) {
    return answerItems[asNumber - 1].answerTitle || "";
  }

  return "";
}

function resolveAnswerLabel(item, questionTemplate) {
  if (item?.openAnswer) {
    return item.openAnswer;
  }

  const numberAnswer = item?.numberAnswer;
  const fallbackTemplateAnswer = resolveTemplateAnswerTitle(questionTemplate, numberAnswer);
  const answerTitle = item?.answerTitle || fallbackTemplateAnswer;

  if (answerTitle && numberAnswer !== null && numberAnswer !== undefined && numberAnswer !== "") {
    return `${numberAnswer}. ${answerTitle}`;
  }

  return answerTitle || "Ответ не заполнен";
}

function normalizeSurvey(item, templates) {
  const template = templates.find((row) => row?.surveyTemplateId === item?.surveyTemplateId) || null;
  const templateQuestions = Array.isArray(template?.questionItems) ? template.questionItems : [];

  const questionById = new Map();
  const sectionById = new Map();
  for (const templateItem of templateQuestions) {
    if (templateItem?.isSection) {
      sectionById.set(templateItem?.questionId, templateItem?.questionWording || templateItem?.questionTitle || "Раздел");
      continue;
    }

    questionById.set(templateItem?.questionId, templateItem);
  }

  return {
    id: item?.surveyId || "",
    status: item?.isDone ? "Завершена" : "Новая",
    title: item?.surveyTemplateTitle || template?.surveyTemplateTitle || "Анкета",
    date: toRuDateTime(item?.surveyDate),
    questions: Array.isArray(item?.surveyItems)
      ? [...item.surveyItems]
        .sort((a, b) => Number(a?.numberQuestion || 0) - Number(b?.numberQuestion || 0))
        .map((question, index) => {
          const questionTemplate = questionById.get(question?.questionId);
          const sectionTitle = sectionById.get(questionTemplate?.questionParent) || "";

          return {
            id: question?.questionId || `${index}`,
            number: question?.numberQuestion || index + 1,
            title: questionTemplate?.questionWording || question?.questionTitle || questionTemplate?.questionTitle || "Вопрос без текста",
            answer: resolveAnswerLabel(question, questionTemplate),
            help: questionTemplate?.questionHelpDescription || "",
            isRequired: Boolean(questionTemplate?.isRequired),
            answerType: questionTemplate?.questionOptions?.answerType || "",
            requiresComment: Boolean(questionTemplate?.questionOptions?.requiresComment),
            commentDescription: questionTemplate?.questionOptions?.commentDescription || "",
            sectionTitle,
          };
        })
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

        const [surveyResponse, templatesResponse] = await Promise.all([
          getSurveys(accessToken),
          getCatalogSurveyTemplates(accessToken),
        ]);

        const surveys = Array.isArray(surveyResponse?.items) ? surveyResponse.items : [];
        const templates = Array.isArray(templatesResponse?.items) ? templatesResponse.items : [];

        const found = surveys.find((item) => item?.surveyId === id);
        setSurvey(found ? normalizeSurvey(found, templates) : null);
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

  let previousSection = "";

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
              {survey.questions.map((question) => {
                const shouldShowSection = question.sectionTitle && question.sectionTitle !== previousSection;
                if (shouldShowSection) {
                  previousSection = question.sectionTitle;
                }

                return (
                  <div key={question.id} style={{ width: "100%" }}>
                    {shouldShowSection ? (
                      <Typography.Title level={3} style={{ marginBottom: 8 }}>{question.sectionTitle}</Typography.Title>
                    ) : null}

                    <Typography.Label style={{ display: "block", marginBottom: 8 }}>
                      {question.number}. {question.title}{question.isRequired ? " *" : ""}
                    </Typography.Label>

                    <Typography.Label style={{ color: "var(--tg-theme-hint-color, #7d7d7d)" }}>
                      {question.answer}
                    </Typography.Label>

                    {question.answerType ? (
                      <Typography.Label style={{ display: "block", marginTop: 4, color: "var(--tg-theme-hint-color, #7d7d7d)" }}>
                        Тип ответа: {question.answerType}
                      </Typography.Label>
                    ) : null}

                    {question.help ? (
                      <Typography.Label style={{ display: "block", marginTop: 4, color: "var(--tg-theme-hint-color, #7d7d7d)" }}>
                        Подсказка: {question.help}
                      </Typography.Label>
                    ) : null}

                    {question.requiresComment ? (
                      <Typography.Label style={{ display: "block", marginTop: 4, color: "var(--tg-theme-hint-color, #7d7d7d)" }}>
                        Требуется комментарий: {question.commentDescription || "уточните ответ"}
                      </Typography.Label>
                    ) : null}
                  </div>
                );
              })}
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
