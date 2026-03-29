import { Container, Typography } from "@maxhub/max-ui";
import Pill from "./Pill.jsx";

export default function SpecializationSection({
    specialties,
    specId,
    onPickSpec,
    isLoading,
    isRescheduleMode,
}) {
    return (
        <Container className="card">
            <Typography.Title level={3}>Специальность</Typography.Title>
            {isLoading ? (
                <div className="bookVisitSkeletonPills">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="skeleton bookVisitSkeleton bookVisitSkeleton--pill" />
                    ))}
                </div>
            ) : (
                <div className="pills">
                    {specialties.map((item) => (
                        <Pill
                            key={item.id}
                            active={specId === item.id}
                            onClick={() => onPickSpec(item.id)}
                            disabled={isRescheduleMode}
                        >
                            {item.title}
                        </Pill>
                    ))}
                </div>
            )}
        </Container>
    );
}
