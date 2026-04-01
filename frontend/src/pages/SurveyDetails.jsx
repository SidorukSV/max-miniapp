import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CellHeader, CellList, CellSimple, Container, Flex, Input, Switch, Textarea, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { getCatalogSurveyTemplateById, getStoredAccessToken, getSurveyById } from "../api";
import Pill from "../components/book-visit/Pill";

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

function getOptionTitle(option) {
  return String(option?.answerTitle ?? option?.answerTItle ?? option?.answertitle ?? "").trim();
}

function normalizeAnswerType(rawType) {
  const type = String(rawType || "").trim();
  if (type === "valueInInfoBase") return "valueInInfobase";
  if (type === "severalValuesFrom") return "severalValueFrom";
  return type || "string";
}

function normalizeSurvey(item, template) {
  const templateQuestions = Array.isArray(template?.questionItems) ? template.questionItems : [];
  const surveyItems = Array.isArray(item?.surveyItems) ? item.surveyItems : [];

  const answersByQuestionId = new Map();
  for (const answer of surveyItems) {
    const key = answer?.questionId;
    if (!key) continue;

    if (!answersByQuestionId.has(key)) {
      answersByQuestionId.set(key, []);
    }

    answersByQuestionId.get(key).push(answer);
  }

  const sectionById = new Map();
  const questions = [];
  let fallbackNumber = 1;

  for (const templateQuestion of templateQuestions) {
    if (templateQuestion?.isSection) {
      sectionById.set(templateQuestion?.questionId, templateQuestion?.questionWording || templateQuestion?.questionTitle || "Раздел");
      continue;
    }

    const answerList = answersByQuestionId.get(templateQuestion?.questionId) || [];
    const firstAnswer = answerList[0] || {};
    const answerItems = Array.isArray(templateQuestion?.questionOptions?.answerItems)
      ? templateQuestion.questionOptions.answerItems
      : [];

    const optionNumberByTitle = new Map(
      answerItems.map((option, index) => [getOptionTitle(option), index + 1]).filter(([title]) => Boolean(title)),
    );

    const selectedNumbers = answerList
      .map((entry) => {
        const direct = Number(entry?.numberAnswer);
        if (Number.isFinite(direct) && direct > 0) return direct;
        const byTitle = optionNumberByTitle.get(String(entry?.answerTitle ?? "").trim());
        return Number.isFinite(byTitle) ? byTitle : null;
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    const openAnswersByNumber = {};
    for (const answer of answerList) {
      const answerNumber = Number(answer?.numberAnswer);
      if (Number.isFinite(answerNumber) && answer?.openAnswer) {
        openAnswersByNumber[answerNumber] = String(answer.openAnswer);
      }
    }

    const initialFromAnswer = firstAnswer?.openAnswer ?? firstAnswer?.answerTitle ?? "";
    const firstAnswerId = firstAnswer?.answerId;
    const firstNumberAnswer = Number(firstAnswer?.numberAnswer);
    const mappedNumberByTitle = optionNumberByTitle.get(String(firstAnswer?.answerTitle ?? "").trim());
    const initialNumberValue = Number.isFinite(firstNumberAnswer) && firstNumberAnswer > 0
      ? firstNumberAnswer
      : (Number.isFinite(mappedNumberByTitle) ? mappedNumberByTitle : "");
    const initialBooleanValue = typeof firstAnswer?.answerTitle === "boolean"
      ? firstAnswer.answerTitle
      : String(initialFromAnswer).toLowerCase() === "true";
    const numericAnswerFromText = Number(firstAnswer?.answerTitle);

    questions.push({
      id: templateQuestion?.questionId || `question-${fallbackNumber}`,
      number: firstAnswer?.numberQuestion || fallbackNumber,
      title: templateQuestion?.questionWording || templateQuestion?.questionTitle || firstAnswer?.questionTitle || "Вопрос",
      sectionTitle: sectionById.get(templateQuestion?.questionParent) || "",
      isRequired: Boolean(templateQuestion?.isRequired),
      help: templateQuestion?.questionHelpDescription || "",
      answerType: normalizeAnswerType(templateQuestion?.questionOptions?.answerType),
      selectorType: templateQuestion?.questionOptions?.selector_type || "selector",
      flagType: templateQuestion?.questionOptions?.flag_type || "input",
      requiresComment: Boolean(templateQuestion?.questionOptions?.requiresComment),
      commentDescription: templateQuestion?.questionOptions?.commentDescription || "Введите комментарий",
      constraints: templateQuestion?.questionOptions?.constraints || {},
      answerItems,
      initialText: String(initialFromAnswer || ""),
      initialNumber: Number.isFinite(numericAnswerFromText) && String(firstAnswer?.answerTitle).trim() !== ""
        ? String(numericAnswerFromText)
        : (firstAnswerId ? String(firstAnswerId) : (initialNumberValue === "" ? "" : String(initialNumberValue))),
      initialBoolean: Boolean(initialBooleanValue),
      initialComment: "",
      initialSelectedNumbers: selectedNumbers,
      initialOpenAnswersByNumber: openAnswersByNumber,
    });

    fallbackNumber += 1;
  }

  return {
    id: item?.surveyId || "",
    isDone: Boolean(item?.isDone),
    status: item?.isDone ? "Завершена" : "Новая",
    title: item?.surveyTemplateTitle || template?.surveyTemplateTitle || "Анкета",
    date: toRuDateTime(item?.surveyDate),
    questions: questions.sort((a, b) => a.number - b.number),
  };
}

function buildInitialState(questions) {
  const state = {};

  for (const question of questions) {
    state[question.id] = {
      text: question.initialText,
      number: question.initialNumber,
      bool: question.initialBoolean,
      comment: question.initialComment,
      selectedNumbers: question.initialSelectedNumbers,
      openAnswersByNumber: question.initialOpenAnswersByNumber,
    };
  }

  return state;
}

export default function SurveyDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answersState, setAnswersState] = useState({});

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

        const surveyResponse = await getSurveyById(accessToken, id);
        const found = surveyResponse?.item || null;

        if (!found?.surveyTemplateId) {
          setSurvey(null);
          setAnswersState({});
          return;
        }

        const templateResponse = await getCatalogSurveyTemplateById(accessToken, found.surveyTemplateId);
        const template = templateResponse?.item || null;
        const normalized = normalizeSurvey(found, template);

        setSurvey(normalized);
        setAnswersState(normalized ? buildInitialState(normalized.questions) : {});
      } catch {
        setError("Не удалось загрузить анкету");
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [id]);

  const hasQuestions = useMemo(() => (survey?.questions?.length || 0) > 0, [survey?.questions?.length]);

  function patchAnswer(questionId, patch) {
    setAnswersState((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        ...patch,
      },
    }));
  }

  function toggleSeveral(questionId, answerNumber, checked) {
    const current = answersState[questionId]?.selectedNumbers || [];
    const next = checked
      ? [...new Set([...current, answerNumber])]
      : current.filter((item) => item !== answerNumber);

    patchAnswer(questionId, { selectedNumbers: next });
  }

  function renderAnswerControl(question) {
    const state = answersState[question.id] || {};
    const constraints = question.constraints || {};
    const isDisabled = Boolean(survey?.isDone);

    if (question.answerType === "boolean") {
      if (question.flagType === "switch") {
        return (
          <Switch
            checked={Boolean(state.bool)}
            disabled={isDisabled}
            onChange={(event) => patchAnswer(question.id, { bool: event.target.checked })}
          />
        );
      }

      return (
        <div className="surveySelectWrap">
          <select
            className="surveyControl surveySelect"
            value={state.bool ? "true" : "false"}
            disabled={isDisabled}
            onChange={(event) => patchAnswer(question.id, { bool: event.target.value === "true" })}
          >
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </select>
        </div>
      );
    }

    if (question.answerType === "string") {
      const maxLength = constraints.length ?? constraints.lenght ?? undefined;
      return (
        <Input
          mode="secondary"
          value={state.text || ""}
          maxLength={maxLength}
          disabled={isDisabled}
          onChange={(event) => patchAnswer(question.id, { text: event.target.value })}
          placeholder="Введите ответ"
        />
      );
    }

    if (question.answerType === "text") {
      return (
        <Textarea
          mode="secondary"
          value={state.text || ""}
          disabled={isDisabled}
          onChange={(event) => patchAnswer(question.id, { text: event.target.value })}
          placeholder="Введите ответ"
        />
      );
    }

    if (question.answerType === "number") {
      const step = constraints.decimal ? 1 / (10 ** Number(constraints.decimal)) : 1;
      const min = constraints.minValue ?? undefined;
      const max = constraints.maxValue ?? undefined;
      const currentNumber = Number(state.number);
      const canMinus = Number.isFinite(currentNumber) ? (min === undefined || currentNumber > min) : false;
      const canPlus = Number.isFinite(currentNumber) ? (max === undefined || currentNumber < max) : true;

      function clamp(value) {
        if (!Number.isFinite(value)) return value;
        if (min !== undefined && value < min) return min;
        if (max !== undefined && value > max) return max;
        return value;
      }

      function applyDelta(delta) {
        const baseValue = Number.isFinite(currentNumber) ? currentNumber : (min ?? 0);
        const next = clamp(baseValue + delta);
        patchAnswer(question.id, { number: String(next) });
      }

      return (
        <div className="surveyNumberControl">
          <button
            type="button"
            className="surveyNumberButton"
            onClick={() => applyDelta(-step)}
            disabled={isDisabled || !canMinus}
          >
            −
          </button>
          <input
            type="number"
            className="surveyControl surveyNumberInput"
            value={state.number || ""}
            min={min}
            max={max}
            step={step}
            disabled={isDisabled}
            onChange={(event) => patchAnswer(question.id, { number: event.target.value })}
          />
          <button
            type="button"
            className="surveyNumberButton"
            onClick={() => applyDelta(step)}
            disabled={isDisabled || !canPlus}
          >
            +
          </button>
        </div>
      );
    }

    if (question.answerType === "valueInInfobase") {
      return (
        <div className="surveySelectWrap">
          <select
            className="surveyControl surveySelect"
            value={state.number || ""}
            disabled={isDisabled}
            onChange={(event) => patchAnswer(question.id, { number: event.target.value })}
          >
            <option value="">Выберите значение</option>
            {question.answerItems.map((item, index) => (
              <option key={item.answerId || index + 1} value={String(item.answerId || index + 1)}>
                {getOptionTitle(item) || String(item.answerId || `Вариант ${index + 1}`)}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (question.answerType === "oneValueFrom") {
      const selectedNumber = Number(state.number || 0);

      return (
        <Flex direction="column" gap={8}>
          {question.selectorType === "toggle" ? (
            <Flex wrap="wrap" gap={8}>
              {question.answerItems.map((answerOption, index) => {
                const answerNumber = index + 1;
                return (
                  <Pill
                    key={answerOption.answerId || answerNumber}
                    active={selectedNumber === answerNumber}
                    disabled={isDisabled}
                    onClick={() => patchAnswer(question.id, { number: answerNumber })}
                  >
                    {getOptionTitle(answerOption) || `Вариант ${answerNumber}`}
                  </Pill>
                );
              })}
            </Flex>
          ) : (
            <CellList className="surveyOptionsList" mode="island" filled>
              {question.answerItems.map((answerOption, index) => {
                const answerNumber = index + 1;
                const isSelected = selectedNumber === answerNumber;
                return (
                  <CellSimple
                    key={answerOption.answerId || answerNumber}
                    title={getOptionTitle(answerOption) || `Вариант ${answerNumber}`}
                    selected={isSelected}
                    onClick={() => {
                      if (!isDisabled) patchAnswer(question.id, { number: answerNumber });
                    }}
                    showChevron={false}
                    after={<span className={`surveyOptionDot ${isSelected ? "surveyOptionDot--active" : ""}`} />}
                  />
                );
              })}
            </CellList>
          )}

          {question.requiresComment ? (
            <Textarea
              mode="secondary"
              value={state.comment || ""}
              disabled={isDisabled}
              placeholder={question.commentDescription}
              onChange={(event) => patchAnswer(question.id, { comment: event.target.value })}
            />
          ) : null}
        </Flex>
      );
    }

    if (question.answerType === "severalValueFrom") {
      const selectedNumbers = state.selectedNumbers || [];
      const openAnswersByNumber = state.openAnswersByNumber || {};

      return (
        <CellList className="surveyOptionsList" mode="island" filled>
          {question.answerItems.map((answerOption, index) => {
            const answerNumber = index + 1;
            const checked = selectedNumbers.includes(answerNumber);

            return (
              <div key={answerOption.answerId || answerNumber}>
                <CellSimple
                  title={getOptionTitle(answerOption) || `Вариант ${answerNumber}`}
                  selected={checked}
                  onClick={() => {
                    if (!isDisabled) toggleSeveral(question.id, answerNumber, !checked);
                  }}
                  showChevron={false}
                  after={<span className={`surveyOptionDot ${checked ? "surveyOptionDot--active" : ""}`} />}
                />

                {answerOption.requiresOpenAnswer ? (
                  <Input
                    mode="secondary"
                    value={openAnswersByNumber[answerNumber] || ""}
                    disabled={isDisabled}
                    placeholder="Введите свой вариант"
                    onChange={(event) => {
                      patchAnswer(question.id, {
                        openAnswersByNumber: {
                          ...openAnswersByNumber,
                          [answerNumber]: event.target.value,
                        },
                      });
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </CellList>
      );
    }

    return (
      <Input
        mode="secondary"
        value={state.text || ""}
        disabled={isDisabled}
        onChange={(event) => patchAnswer(question.id, { text: event.target.value })}
        placeholder="Введите ответ"
      />
    );
  }

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
                    {shouldShowSection ? <Typography.Title level={3}>{question.sectionTitle}</Typography.Title> : null}

                    <Typography.Label style={{ display: "block", marginBottom: 8 }}>
                      {question.number}. {question.title}{question.isRequired ? " *" : ""}
                    </Typography.Label>

                    {renderAnswerControl(question)}

                    {question.help ? (
                      <Typography.Label style={{ display: "block", marginTop: 4, color: "var(--tg-theme-hint-color, #7d7d7d)" }}>
                        {question.help}
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
