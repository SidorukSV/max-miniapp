import { Container, Typography } from "@maxhub/max-ui";

const WEEK_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export default function DateSection({
    doctorId,
    isLoading,
    monthTitle,
    goPrevMonth,
    goNextMonth,
    monthGrid,
    monthCursor,
    availableDates,
    date,
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
                <div className="calendar" aria-disabled={!doctorId}>
                    <div className="calendarHeader">
                        <Typography.Label className="calendarTitle">{monthTitle}</Typography.Label>
                        <div className="calendarNav">
                            <button type="button" className="calendarArrow" onClick={goPrevMonth} aria-label="Предыдущий месяц">
                                ‹
                            </button>
                            <button type="button" className="calendarArrow" onClick={goNextMonth} aria-label="Следующий месяц">
                                ›
                            </button>
                        </div>
                    </div>

                    <div className="calendarWeekdays">
                        {WEEK_DAYS.map((dayLabel) => (
                            <span key={dayLabel}>{dayLabel}</span>
                        ))}
                    </div>

                    <div className="calendarGrid">
                        {monthGrid.map((gridDate) => {
                            const isoDay = toISODateOnly(gridDate);
                            const isCurrentMonth = gridDate.getMonth() === monthCursor.getMonth();
                            const isAvailable = availableDates.has(isoDay);
                            const isSelected = date === isoDay;
                            return (
                                <button
                                    key={isoDay}
                                    type="button"
                                    className={`calendarDay ${isCurrentMonth ? "" : "calendarDay--outside"} ${isAvailable ? "calendarDay--available" : ""} ${isSelected ? "calendarDay--selected" : ""}`}
                                    onClick={() => onPickDate(isoDay)}
                                    disabled={!isAvailable}
                                >
                                    {gridDate.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </Container>
    );
}
