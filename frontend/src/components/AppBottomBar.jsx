import { Container, Button, Typography } from "@maxhub/max-ui";
import { useEffect, useState } from "react";
import "../app.css";

export default function AppBottomBar({
    buttonText,
    onButtonClick,
    buttonDisabled = false,
    showButton = true,
    after = null
}) {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return undefined;

        const handleViewportResize = () => {
            const keyboardThreshold = 120;
            const heightDiff = window.innerHeight - viewport.height;
            setIsKeyboardOpen(heightDiff > keyboardThreshold);
        };

        handleViewportResize();
        viewport.addEventListener("resize", handleViewportResize);

        return () => {
            viewport.removeEventListener("resize", handleViewportResize);
        };
    }, []);

    return (
        <footer className={`bottomBar ${isKeyboardOpen ? "bottomBar--hidden" : ""}`}>
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
