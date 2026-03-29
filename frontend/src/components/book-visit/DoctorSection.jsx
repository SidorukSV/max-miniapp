import { Container, Flex, Typography } from "@maxhub/max-ui";
import Pill from "./Pill.jsx";

export default function DoctorSection({
    specId,
    isLoading,
    doctorsByBranch,
    doctorId,
    branchId,
    onPickDoctor,
    isRescheduleMode,
    getDoctorLabel,
}) {
    return (
        <Container className={`card ${specId ? "" : "card--disabled"}`}>
            <Typography.Title level={3}>Врач</Typography.Title>
            {isLoading ? (
                <div className="bookVisitSkeletonDoctors">
                    <div className="skeleton bookVisitSkeleton bookVisitSkeleton--label" />
                    <div className="bookVisitSkeletonPills">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="skeleton bookVisitSkeleton bookVisitSkeleton--pill" />
                        ))}
                    </div>
                    <div className="skeleton bookVisitSkeleton bookVisitSkeleton--label" />
                    <div className="bookVisitSkeletonPills">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="skeleton bookVisitSkeleton bookVisitSkeleton--pill" />
                        ))}
                    </div>
                </div>
            ) : !specId ? (
                <Typography.Label style={{ marginTop: 8 }}>Сначала выберите специальность</Typography.Label>
            ) : (
                <Flex direction="column" gap={10} style={{ marginTop: 12 }}>
                    {doctorsByBranch.map((branch) => (
                        <div key={branch.branchId}>
                            <Typography.Label>{branch.branchTitle}</Typography.Label>
                            <div className="pills">
                                {branch.doctors.map((doc) => (
                                    <Pill
                                        key={`${doc.branchId}:${doc.doctorId}`}
                                        active={doctorId === doc.doctorId && branchId === doc.branchId}
                                        onClick={() => onPickDoctor(doc.doctorId, doc.branchId)}
                                        disabled={isRescheduleMode}
                                    >
                                        {getDoctorLabel(doc)}
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
