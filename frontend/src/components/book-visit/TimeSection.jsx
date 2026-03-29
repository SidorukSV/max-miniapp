import { Container, Flex, Typography } from "@maxhub/max-ui";
import Pill from "./Pill.jsx";

export default function TimeSection({
    date,
    isLoading,
    groupedTimeSlots,
    timeISO,
    onPickTime,
}) {
    return (
        <Container className={`card ${date ? "" : "card--disabled"}`}>
            <Typography.Title level={3}>Время</Typography.Title>
            {isLoading ? (
                <div className="bookVisitSkeletonPills">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="skeleton bookVisitSkeleton bookVisitSkeleton--pill bookVisitSkeleton--time" />
                    ))}
                </div>
            ) : (
                <Flex direction="column" gap={10} style={{ marginTop: 12 }}>
                    {groupedTimeSlots.map((group) => (
                        <div key={group.key}>
                            <Typography.Label>{group.title}</Typography.Label>
                            <div className="pills">
                                {group.slots.map((item) => (
                                    <Pill key={item.value} active={timeISO === item.value} onClick={() => onPickTime(item.value)}>
                                        {item.title}
                                    </Pill>
                                ))}
                            </div>
                        </div>
                    ))}
                </Flex>
            )}
        </Container>
    );
}
