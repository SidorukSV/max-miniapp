import { Container, Button, Typography } from "@maxhub/max-ui";
import "../app.css";

export default function AppBottomBar({
    buttonText,
    onButtonClick,
    buttonDisabled = false,
    showButton = true,
    after = null
}) {
    return (
        <footer className="bottomBar">
            <Container className="bottomBarInner">
                {showButton && (
                    <Button className="bottomPrimary" onClick={onButtonClick} disabled={buttonDisabled}>
                        {buttonText}
                    </Button>
                )}
                {after && (
                    <div className="bottomAfter">
                        {after}
                    </div>
                )}
            </Container>
            <div className="bottomNote">
                <Typography.Label>
                    БИТ.Медицина / Омни. С заботой о пациентах
                </Typography.Label>
            </div>
        </footer>
    );
}
