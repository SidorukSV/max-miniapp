import { Container, Button, Typography } from "@maxhub/max-ui";
import "../app.css";

export default function AppBottomBar({
    buttonText,
    onButtonClick,
    showButton = true
}) {
    return (
        <footer className="bottomBar">
            <Container className="bottomBarInner">
                {showButton && (
                    <Button className="bottomPrimary" onClick={onButtonClick}>
                        {buttonText}
                    </Button>
                )}
            </Container>
            <div className="bottomNote">
                <Typography.Label>
                    БИТ.Медицина / Омни.
                    Создана чтобы заботиться о пациентах
                </Typography.Label>
            </div>
        </footer>
    );
}

