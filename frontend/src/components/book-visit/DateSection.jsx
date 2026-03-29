import { Container, Typography } from "@maxhub/max-ui";
import DateCalendar from "./DateCalendar.jsx";

export default function DateSection({
    doctorId,
    isLoading,
    monthTitle,
    onPrevMonth,
    onNextMonth,
    monthGrid,
    monthCursor,
    availableDates,
    selectedDate,
    onPickDate,
    toISODateOnly,
}) {
    return (
        <Container className={`card ${doctorId ? "" : "card--disabled"}`}>
            <Typography.Title level={3}>Дата</Typography.Title>
            {isLoading ? (
                <div className="bookVisitSkeletonCalendar">
                    <div className="bookVisitSkeletonCalendarHeader">
                        <div className="skeleton bookVisitSkeleton bookVisitSkeleton--month" />
                        <div className="bookVisitSkeletonNav">
                            <div className="skeleton bookVisitSkeleton bookVisitSkeleton--navBtn" />
                            <div className="skeleton bookVisitSkeleton bookVisitSkeleton--navBtn" />
                        </div>
                    </div>
                    <div className="bookVisitSkeletonCalendarGrid">
                        {Array.from({ length: 14 }).map((_, index) => (
                            <div key={index} className="skeleton bookVisitSkeleton bookVisitSkeleton--day" />
                        ))}
                    </div>
                </div>
            ) : (
                <div aria-disabled={!doctorId}>
                    <DateCalendar
                        monthTitle={monthTitle}
                        monthGrid={monthGrid}
                        monthCursor={monthCursor}
                        onPrevMonth={onPrevMonth}
                        onNextMonth={onNextMonth}
                        selectedDate={selectedDate}
                        availableDates={availableDates}
                        onPickDate={onPickDate}
                        toISODateOnly={toISODateOnly}
                    />
                </div>
            )}
        </Container>
    );
}
