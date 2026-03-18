import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authStart, authSetCity, authPhone, authSelectPatient, storeTokens, getMe } from "../api";
import { Flex, Container, Typography, Button, Spinner } from "@maxhub/max-ui";
import { useMaxWebApp } from "../hooks/useMaxWebApp";
import "../app.css";

export default function AuthScreen() {
    const { setMe } = useAuth();

    const [selectedCity, setSelectedCity] = useState("");
    const [authSessionId, setAuthSessionId] = useState(null);
    const [patients, setPatients] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [contact, setContact] = useState(null);
    const [needCity, setNeedCity] = useState(false);

    async function handleStart() {
        setBusy(true);
        setError("");

        try {
            const start = await authStart();
            setAuthSessionId(start.auth_session_id);
            setNeedCity(start.need_city)
            if (needCity) {
                await authSetCity({
                    auth_session_id: start.auth_session_id,
                    city_id: selectedCity,
                });
            }

            const max = useMaxWebApp();

            setContact(max.contact);

            const phoneResult = await authPhone({
                auth_session_id: start.auth_session_id,
                phone: contact?.phone || "",
                channel: "max",
                proof: contact,
            });

            setPatients(phoneResult.patients || []);
        } catch (err) {
            console.error(err);

            if (err.message === "request_contact_unavailable") {
                setError("Запрос контакта недоступен в данном клиенте");
            } else {
                setError(err);
            }
        } finally {
            setBusy(false);
        }
    }

    async function handleSelectPatient(patientId) {
        if (!authSessionId) return;

        setBusy(true);
        setError("");

        try {
            const result = await authSelectPatient({
                auth_session_id: authSessionId,
                patient_id: patientId,
            });

            storeTokens(result);

            const meData = await getMe(result.access_token);
            setMe(meData);
        } catch (err) {
            console.error(err);
            setError("Не удалось выбрать пациента.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Flex direction="column">
            <Container className="card">
                <Flex direction="column" gap={10}>
                    <Typography.Title level={2}>Вход в личный кабинет</Typography.Title>
                    <Typography.Label className="roleLine">
                        Подтвердите номер телефона, чтобы продолжить.
                    </Typography.Label>

                    {needCity && (
                        <div className="authField">
                            <Typography.Label className="authLabel">Город</Typography.Label>

                            <select
                                className="authSelect"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target)}
                                disabled={busy}
                            >
                                <option value="chita">Чита</option>
                                <option value="krsnk">Красноярск</option>
                            </select>
                        </div>
                    )}
                    {!patients.length && (
                        <Button onClick={handleStart} disabled={busy}>
                            {busy ? "Загрузка..." && (<Spinner appearance="primary" size={20} />) : "Подтвердить номер телефона"}
                        </Button>
                    )}
                    {!!patients.length && (
                        <FLex direction="column" gap={10}>
                            <CellList
                                header={<CellHeader titleStyle="caps">Выберите пациента</CellHeader>}
                                filled
                                mode="island"
                            >
                                {patients.map((patient) => (
                                    <CellSimple
                                        height="normal"
                                        overline=""
                                        subtitle={patient.birthdate}
                                        title={patient.fullname}
                                        showChevron
                                        onClick={() => handleSelectPatient(patient.id)}
                                    />
                                ))}
                            </CellList>
                        </FLex>
                    )}

                    {error && (
                        <div className="authError">
                            <Typography.Label>{error}</Typography.Label>
                        </div>
                    )}
                </Flex>
            </Container>
        </Flex>
    );
}