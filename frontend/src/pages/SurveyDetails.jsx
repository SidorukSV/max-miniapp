import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, CellHeader, Container, Flex, Typography, Textarea } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { getSurveyTitle, SURVEY_STATUSES } from "../data/mockSurveys";
import { completeSurvey, getSurveyById } from "../modules/surveyStore";

export default function SurveyDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [survey, setSurvey] = useState(() => (id ? getSurveyById(id) : null));

  const [answers, setAnswers] = useState(() => {
    if (!survey?.questions?.length) {
      return [];
    }

    return survey.questions.map((_, index) => survey.answers?.[index] || "");
  });

  const isNew = survey?.status === SURVEY_STATUSES.NEW;

  const canSubmit = useMemo(() => {
    if (!isNew) {
      return false;
    }

    return answers.every((value) => value.trim().length > 0);
  }, [answers, isNew]);

  function updateAnswer(index, value) {
    setAnswers((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  }

  function handleSubmit() {
    if (!id || !canSubmit) {
      return;
    }

    const updated = completeSurvey(id, answers);
    setSurvey(updated);
  }

  if (!survey) {
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
            <Typography.Title level={3}>{getSurveyTitle(survey)}</Typography.Title>
            <span className={`statusPill ${isNew ? "" : "status--ok"}`}>{survey.status}</span>
          </Flex>
        </Container>

        <Container className="card">
          <Flex direction="column" gap={14}>
            {survey.questions.map((question, index) => (
              <div key={question} style={{width:"100%"}}>
                <Typography.Label style={{display: "block", marginBottom: 12}}>{index + 1}. {question}</Typography.Label>
                <Textarea
                  mode="secondary"
                  rows={3}
                  value={answers[index]}
                  disabled={!isNew}
                  onChange={(event) => updateAnswer(index, event.target.value)}
                  placeholder={isNew ? "Введите ваш ответ" : "Ответ заполнен"}
                />
              </div>
            ))}

            {isNew ? (
              <Button disabled={!canSubmit} onClick={handleSubmit}>Отправить анкету</Button>
            ) : (
              <Typography.Label>Анкета уже завершена и доступна только для просмотра.</Typography.Label>
            )}
          </Flex>
        </Container>
      </Flex>
    </PageLayout>
  );
}
