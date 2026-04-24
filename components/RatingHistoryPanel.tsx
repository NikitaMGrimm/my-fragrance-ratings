import React, { useMemo, useState } from 'react';
import { Activity, CalendarDays, ChevronDown, ChevronUp, History, TrendingDown, TrendingUp } from 'lucide-react';
import { FragranceRatingSummary, RatingHistorySummary, RatingHistoryTimelineRow } from '../types';

interface RatingHistoryPanelProps {
  summary: RatingHistorySummary | null;
  isLoading: boolean;
  error: string;
}

const formatDelta = (value: number) => {
  if (Math.abs(value) < 0.05) return '0.0';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const DeltaBadge: React.FC<{ delta: number }> = ({ delta }) => {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Activity;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-bold ${
        isPositive
          ? 'border-green-500/30 text-green-300'
          : isNegative
            ? 'border-red-500/30 text-red-300'
            : 'border-gray-600 text-gray-300'
      }`}
    >
      <Icon size={12} />
      {formatDelta(delta)}
    </span>
  );
};

const StatBlock: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-parfumo-text' }) => (
  <div className="min-w-0 rounded border border-gray-700/40 bg-black/10 px-3 py-2">
    <div className={`truncate text-base font-bold ${tone}`}>{value}</div>
    <div className="truncate text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
  </div>
);

const MoverRow: React.FC<{ item: FragranceRatingSummary }> = ({ item }) => (
  <div className="flex items-center justify-between gap-3 rounded px-2 py-2 transition-colors hover:bg-white/[0.03]">
    <div className="min-w-0">
      <div className="truncate text-[11px] uppercase tracking-wider text-gray-500">{item.brand}</div>
      <div className="truncate text-sm font-medium text-parfumo-text">{item.name}</div>
      <div className="text-[11px] text-gray-500">
        {formatDate(item.lastChangedAt)} - {item.eventCount} ratings
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-gray-400">
        {`${item.firstRating.toFixed(1)} -> ${item.latestRating.toFixed(1)}`}
      </span>
      <DeltaBadge delta={item.delta} />
    </div>
  </div>
);

const ActivityColumn: React.FC<{ row: RatingHistoryTimelineRow; maxEvents: number }> = ({ row, maxEvents }) => {
  const events = row.newCount + row.changedCount;
  const height = events > 0 && maxEvents > 0 ? Math.max(10, Math.round(Math.sqrt(events / maxEvents) * 84)) : 4;
  const changedHeight = events > 0 ? Math.round((row.changedCount / events) * height) : 0;
  const newHeight = Math.max(0, height - changedHeight);

  return (
    <div className="flex min-w-[54px] flex-1 flex-col items-center justify-end gap-2" title={`${row.label}: ${row.newCount} new, ${row.changedCount} changed`}>
      <div className="text-[10px] font-bold text-gray-400">{events}</div>
      <div className="flex h-[92px] w-6 items-end rounded bg-black/20 p-[2px]">
        <div className="flex w-full flex-col justify-end overflow-hidden rounded-sm">
          {row.changedCount > 0 && (
            <div className="w-full bg-amber-400/80" style={{ height: `${changedHeight}px` }} />
          )}
          {row.newCount > 0 && (
            <div className="w-full bg-parfumo-accent/75" style={{ height: `${newHeight}px` }} />
          )}
        </div>
      </div>
      <div className="w-full truncate text-center text-[10px] text-gray-500">{formatDate(row.date)}</div>
    </div>
  );
};

const Sparkline: React.FC<{ rows: RatingHistoryTimelineRow[] }> = ({ rows }) => {
  const points = rows.filter((row) => row.averageRating !== null);
  if (points.length < 2) {
    return <div className="text-xs text-gray-500">Average trend unavailable</div>;
  }

  const values = points.map((row) => row.averageRating as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(0.05, (max - min) * 0.25);
  const low = min - padding;
  const high = max + padding;
  const range = Math.max(0.1, high - low);
  const polyline = points.map((row, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
    const y = 34 - (((row.averageRating as number) - low) / range) * 28;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const first = values[0];
  const latest = values[values.length - 1];

  return (
    <div className="rounded border border-gray-700/50 bg-black/10 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Average Rating</div>
          <div className="text-sm font-bold text-parfumo-text">{latest.toFixed(2)}</div>
        </div>
        <DeltaBadge delta={latest - first} />
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-16 w-full overflow-visible">
        <line x1="0" y1="34" x2="100" y2="34" stroke="#374151" strokeWidth="1" />
        <polyline points={polyline} fill="none" stroke="#22c55e" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

const RatingHistoryPanel: React.FC<RatingHistoryPanelProps> = ({ summary, isLoading, error }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  const listItems = useMemo(() => {
    const source = showRecent ? summary?.recentChanges : summary?.movers;
    return (source || []).slice(0, 6);
  }, [summary, showRecent]);

  const timelineRows = useMemo(() => {
    const rows = summary?.timeline.filter((row) => row.newCount + row.changedCount > 0) || [];
    return rows.length > 0 ? rows : (summary?.timeline || []);
  }, [summary]);

  const timelineStats = useMemo(() => {
    const maxEvents = Math.max(0, ...timelineRows.map((row) => row.newCount + row.changedCount));
    const first = timelineRows[0];
    const latest = timelineRows[timelineRows.length - 1];
    return { maxEvents, first, latest };
  }, [timelineRows]);

  const changeStats = useMemo(() => {
    const movers = summary?.movers || [];
    const improved = movers.filter((item) => item.delta > 0).length;
    const lowered = movers.filter((item) => item.delta < 0).length;
    return { improved, lowered };
  }, [summary]);

  const biggestLabel = summary?.biggestMover
    ? `${summary.biggestMover.name} ${formatDelta(summary.biggestMover.delta)}`
    : 'None';

  return (
    <div className="mb-8 overflow-hidden rounded-lg border border-gray-700/50 bg-parfumo-card/50">
      <button
        type="button"
        aria-label={isExpanded ? 'Collapse rating history dashboard' : 'Expand rating history dashboard'}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-[#252a32] md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-parfumo-accent/30 bg-parfumo-accent/10 text-parfumo-accent">
            <History size={17} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold uppercase tracking-wider text-gray-400">Rating History</h3>
            <div className="truncate text-xs text-gray-500">
              {isLoading
                ? 'Loading history'
                : error
                  ? 'Unavailable'
                  : summary
                    ? `${summary.changedCount} changed of ${summary.trackedCount} tracked`
                    : 'No history data'}
            </div>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:min-w-[560px] md:grid-cols-4">
          <StatBlock label="Tracked" value={summary ? String(summary.trackedCount) : '--'} />
          <StatBlock label="Changed" value={summary ? String(summary.changedCount) : '--'} tone="text-parfumo-accent" />
          <StatBlock label="Avg Delta" value={summary ? formatDelta(summary.averageDelta) : '--'} />
          <StatBlock label="Biggest Move" value={biggestLabel} />
        </div>

        <div className="hidden shrink-0 text-gray-500 md:block">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700/50 p-4">
          {error ? (
            <div className="rounded border border-gray-700 bg-black/10 px-3 py-4 text-center text-xs text-gray-500">
              Rating history unavailable.
            </div>
          ) : isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading rating history...</div>
          ) : summary ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 rounded border border-gray-700/50 bg-black/10 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <CalendarDays size={14} />
                      Collection Activity
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      {timelineStats.first && timelineStats.latest
                        ? `${formatDate(timelineStats.first.date)} to ${formatDate(timelineStats.latest.date)}`
                        : 'No activity dates'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-gray-500">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-parfumo-accent/75" /> New</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400/80" /> Changed</span>
                  </div>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="flex min-w-[620px] items-end gap-2">
                    {timelineRows.map((row) => (
                      <ActivityColumn key={row.commit} row={row} maxEvents={timelineStats.maxEvents} />
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Sparkline rows={timelineRows} />
                  <div className="rounded border border-gray-700/50 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Changed Direction</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-lg font-bold text-green-300">{changeStats.improved}</div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500">Higher</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-300">{changeStats.lowered}</div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500">Lower</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded border border-gray-700/50 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Latest Activity</div>
                    <div className="mt-2 text-lg font-bold text-parfumo-text">
                      {timelineStats.latest ? timelineStats.latest.newCount + timelineStats.latest.changedCount : 0}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {timelineStats.latest
                        ? `${timelineStats.latest.newCount} new, ${timelineStats.latest.changedCount} changed`
                        : 'No events'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded border border-gray-700/50 bg-black/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {showRecent ? 'Recent Changes' : 'Biggest Movers'}
                    </h4>
                    <div className="text-[11px] text-gray-600">
                      {summary.changedCount} fragrances with rating changes
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecent((prev) => !prev)}
                    className="rounded border border-gray-700 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:border-gray-500 hover:text-white"
                  >
                    {showRecent ? 'Movers' : 'Recent'}
                  </button>
                </div>

                {listItems.length > 0 ? (
                  <div>
                    {listItems.map((item) => (
                      <MoverRow key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">No changed ratings yet.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded border border-gray-700 bg-black/10 px-3 py-4 text-center text-xs text-gray-500">
              No rating history data.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingHistoryPanel;
