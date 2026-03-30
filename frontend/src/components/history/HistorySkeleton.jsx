import { Container } from "@maxhub/max-ui";

function HistorySkeletonCard() {
    return (
        <Container className="card loadingCard historySkeletonCard" aria-hidden="true">
            <div className="skeleton historySkeletonTitle" />
            <div className="skeleton historySkeletonLine" />
            <div className="skeleton historySkeletonLine historySkeletonLine--short" />
            <div className="skeleton historySkeletonService" />
            <div className="skeleton historySkeletonButton" />
        </Container>
    );
}

export default function HistorySkeleton() {
    return (
        <div className="historySkeletonList" aria-label="Загрузка истории приемов">
            <div className="skeleton historySkeletonMonth" />
            <HistorySkeletonCard />
            <HistorySkeletonCard />
        </div>
    );
}
