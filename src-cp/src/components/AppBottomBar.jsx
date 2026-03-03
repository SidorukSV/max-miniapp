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
                    Создано в Первом Бите
                </Typography.Label>
            </div>
        </footer>
    );
}

