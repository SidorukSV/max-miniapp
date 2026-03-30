import { Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";

const CONSENT_URL = "https://aldenta.ru/personal-data-consent/";

export default function PersonalDataConsent() {
    return (
        <PageLayout headerTitle="Согласие на обработку персональных данных" showBottom={false}>
            <Flex direction="column" gap={12} className="card legalCard">
                <Typography.Text>
                    Согласие на обработку персональных данных опубликовано на сайте клиники.
                </Typography.Text>
                <a
                    href={CONSENT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="legalLink"
                >
                    Открыть согласие на сайте aldenta.ru
                </a>
            </Flex>
        </PageLayout>
    );
}
