import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authStart, authSetCity, authPhone, authSelectPatient, storeTokens, getMe, sendLogs, getCatalogsCities } from "../api";
import { Flex, Container, Typography, Button, Spinner, CellList, CellSimple, CellHeader } from "@maxhub/max-ui";
import "../app.css";
import { useMaxWebApp } from "../hooks/useMaxWebApp";

export default function AuthScreen() {
    const { webApp } = useMaxWebApp();
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
            setNeedCity(start.need_city);
            
            let cities = [];
            if (start.need_city) {
                cities = await getCatalogsCities();
                await authSetCity({
                    auth_session_id: start.auth_session_id,
                    city_id: selectedCity,
                });
            }

            const send_contact = await webApp.requestContact();
            setContact(send_contact);

            const phoneResult = await authPhone({
                auth_session_id: start.auth_session_id,
                phone: send_contact?.phone || "",
                channel: "max",
                proof: send_contact,
            });

            sendLogs(JSON.stringify(phoneResult));
            console.log("patients:", phoneResult.patients);

            setPatients(phoneResult.patients || []);
        } catch (err) {
            console.error(err);
            sendLogs(JSON.stringify(err));

            switch (err.message) {
                case "request_contact_unavailable":
                    setError("Запрос контакта недоступен в данном клиенте");
                    break;
                case "contact_not_send":
                    setError("Контакт не отправлен. Попробуйте ещё раз");
                    break;
                default:
                    setError("Авторизация не пройдена. Попробуйте ещё раз");
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
                        <CellList
                            header={<CellHeader titleStyle="caps">Выберите город</CellHeader>}
                            filled
                            mode="island"
                        >
                            {cities.map((city) => (
                                <CellSimple
                                    key={city.id}
                                    title={city.name}
                                    showChevron
                                    onClick={() => setSelectedCity(city.id)}
                                    selected={selectedCity === city.id}
                                />
                            ))}
                        </CellList>
                    )}

                    {!patients.length && (
                        <Button onClick={handleStart} disabled={busy}>
                            {busy ? (
                                <>
                                    Загрузка <Spinner appearance="primary" size={20} />
                                </>
                            ) : (
                                "Подтвердить номер телефона"
                            )}
                        </Button>
                    )}

                    {!!patients.length && (
                        <CellList
                            header={<CellHeader titleStyle="caps">Выберите пациента</CellHeader>}
                            filled
                            mode="island"
                        >
                            {patients.map((patient) => (
                                <CellSimple
                                    key={patient.id}
                                    height="normal"
                                    title={patient.fullName}
                                    subtitle={patient.birthDate}
                                    showChevron
                                    onClick={() => handleSelectPatient(patient.id)}
                                />
                            ))}
                        </CellList>
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