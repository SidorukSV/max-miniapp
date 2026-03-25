import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CellHeader, CellList, CellSimple, Container, Flex, Typography } from "@maxhub/max-ui";
import { ClipboardList } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { getSurveyTitle } from "../data/mockSurveys";
import { getSurveys } from "../modules/surveyStore";

function SurveyStatus({ value }) {
  const isNew = value === "Новая";

  return (
    <span className={`statusPill ${isNew ? "" : "status--ok"}`}>
      {value}
    </span>
  );
}

export default function MySurveys() {
  const nav = useNavigate();
  const [surveys] = useState(() => getSurveys());
  const hasSurveys = useMemo(() => surveys.length > 0, [surveys.length]);

  return (
    <PageLayout
      showBottom
      bottomButtonText="Вернуться на главную"
      onBottomButtonClick={() => nav("/")}
    >
      <Flex direction="column" gap={10}>
        <CellHeader titleStyle="caps">Мои анкеты</CellHeader>

        {!hasSurveys ? (
          <Container className="card">
            <Typography.Label>У вас пока нет доступных анкет.</Typography.Label>
          </Container>
        ) : (
          <Container className="card menuCard">
            <CellList>
              {surveys.map((survey) => (
                <CellSimple
                  key={survey.id}
                  before={<ClipboardList size={24} />}
                  showChevron
                  onClick={() => nav(`/surveys/${survey.id}`)}
                  after={<SurveyStatus value={survey.status} />}
                >
                  {getSurveyTitle(survey)}
                </CellSimple>
              ))}
            </CellList>
          </Container>
        )}
      </Flex>
    </PageLayout>
  );
}
