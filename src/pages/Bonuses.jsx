import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import "../app.css";

export default function Bonuses() {
  const nav = useNavigate();

  return (
    <PageLayout headerTitle="Мои бонусы" showBottomButton={false}>
      <Flex direction="column" gap={10}>
        <Container className="card">
          <Flex direction="column" gap={10}>
            <Typography.Title level={2}>615.3 ₽</Typography.Title>
            <Typography.Label>
              Здесь будет история начислений и списаний (пока заглушка).
            </Typography.Label>

            <Button mode="secondary" onClick={() => nav("/")}>
              На главную
            </Button>
          </Flex>
        </Container>
      </Flex>
    </PageLayout>
  );
}
