import { Panel, Container } from "@maxhub/max-ui";
import AppHeader from "./AppHeader";
import AppBottomBar from "./AppBottomBar";
import "../app.css";

export default function PageLayout({
    children,
    headerTitle = "Моя поликлиника",
    logoSrc = "/logo-clinic.png",
    showBottom = true,
    bottomButtonText,
    onBottomButtonClick,
    showBottomButton = true
}) {
    return (
        <Panel mode="secondary" className="panel">
            <AppHeader title={headerTitle} logoSrc={logoSrc} />
            <Container className="page">{children}</Container>
            {showBottom && (
                <AppBottomBar
                    buttonText={bottomButtonText}
                    onButtonClick={onBottomButtonClick}
                    showButton={showBottomButton}
                />
            )}
        </Panel>
    );
}