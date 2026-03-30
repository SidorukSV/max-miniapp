import { Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";

const PRIVACY_POLICY_URL = "https://aldenta.ru/confidentiality/";

export default function PrivacyPolicy() {
    return (
        <PageLayout headerTitle="Политика обработки персональных данных" showBottom={false}>
            <Flex direction="column" gap={12} className="card legalCard">
                <Typography.Text>
                    Политика обработки персональных данных размещена на сайте клиники.
                </Typography.Text>
                <a
                    href={PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="legalLink"
                >
                    Открыть политику на сайте aldenta.ru
                </a>
            </Flex>
        </PageLayout>
    );
}
