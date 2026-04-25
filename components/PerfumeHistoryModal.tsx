import React from 'react';
import { Activity, TrendingDown, TrendingUp, X } from 'lucide-react';
import { FragranceRatingSummary, Perfume } from '../types';
import CachedImage from './CachedImage';
import StarRating from './StarRating';

interface PerfumeHistoryModalProps {
  perfume: Perfume | null;
  history: FragranceRatingSummary | null;
  onClose: () => void;
}

const formatDelta = (value: number) => {
  if (Math.abs(value) < 0.05) return '0.0';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const RatingPath: React.FC<{ history: FragranceRatingSummary }> = ({ history }) => {
  const points = history.ratings.map((point, index) => {
    const x = history.ratings.length === 1 ? 280 : 46 + (index / (history.ratings.length - 1)) * 488;
    const y = 18 + ((10 - point.rating) / 10) * 112;
    return { ...point, x, y, label: formatDate(point.date) };
  });
  const polyline = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');

  return (
    <div className="mt-5 rounded border border-gray-700/50 bg-black/10 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Rating Path</div>
          <div className="text-xs text-gray-400">
            {formatDate(history.ratings[0].date)} to {formatDate(history.ratings[history.ratings.length - 1].date)}
          </div>
        </div>
        <DeltaBadge delta={history.delta} />
      </div>

      <svg viewBox="0 0 560 150" className="h-28 w-full overflow-visible">
        {[0, 5, 10].map((rating) => {
          const y = 18 + ((10 - rating) / 10) * 112;
          return (
            <g key={rating}>
              <line x1="36" y1={y} x2="540" y2={y} stroke="#374151" strokeDasharray="6 8" strokeWidth="1" />
              <text x="8" y={y + 4} fill="#9ca3af" fontSize="12" fontWeight="600">{rating}</text>
            </g>
          );
        })}
        <polyline points={polyline} fill="none" stroke="#56cbf9" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => (
          <g key={`${point.commit}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#56cbf9" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <text x={point.x} y={Math.max(14, point.y - 10)} fill="#c4cdd5" fontSize="12" fontWeight="700" textAnchor="middle">
              {point.rating.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const DeltaBadge: React.FC<{ delta: number }> = ({ delta }) => {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const DeltaIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Activity;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-bold ${
        isPositive
          ? 'border-green-500/30 text-green-300'
          : isNegative
            ? 'border-red-500/30 text-red-300'
            : 'border-gray-600 text-gray-300'
      }`}
    >
      <DeltaIcon size={13} />
      {formatDelta(delta)}
    </span>
  );
};

const PerfumeHistoryModal: React.FC<PerfumeHistoryModalProps> = ({ perfume, history, onClose }) => {
  if (!perfume || !history) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gray-700 bg-parfumo-card shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 bg-parfumo-bg px-5 py-4">
          <h2 className="text-lg font-bold text-parfumo-text">Rating History</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="flex gap-4">
            <div className="h-[112px] w-[112px] shrink-0 rounded bg-white p-2">
              <CachedImage
                src={perfume.imageUrl}
                alt={perfume.name}
                pid={perfume.pid}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold uppercase tracking-wider text-gray-500">{perfume.brand}</div>
              <div className="text-xl font-semibold leading-tight text-parfumo-text">{perfume.name}</div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StarRating rating={history.latestRating} />
                <span className="text-sm font-bold text-parfumo-text">{history.latestRating.toFixed(1)}</span>
                <DeltaBadge delta={history.delta} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="font-bold text-parfumo-text">{history.firstRating.toFixed(1)}</div>
                  <div className="uppercase tracking-wider text-gray-500">First</div>
                </div>
                <div>
                  <div data-testid="history-latest-rating" className="font-bold text-parfumo-text">{history.latestRating.toFixed(1)}</div>
                  <div className="uppercase tracking-wider text-gray-500">Latest</div>
                </div>
                <div>
                  <div className="font-bold text-parfumo-text">{history.eventCount}</div>
                  <div className="uppercase tracking-wider text-gray-500">Entries</div>
                </div>
              </div>
            </div>
          </div>

          <RatingPath history={history} />

          <div className="mt-5 rounded border border-gray-700/50 bg-black/10">
            {history.ratings.map((point, index) => (
              <div
                key={`${point.commit}-${index}`}
                data-testid={`history-entry-${point.commit}`}
                className="flex items-center justify-between gap-3 border-b border-gray-800/80 px-3 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-parfumo-text">{formatDate(point.date)}</div>
                  <div className="truncate text-[11px] text-gray-500">
                    {point.timeRated ? `${point.timeRated} - ` : ''}
                    {point.commit.slice(0, 7)}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-bold text-parfumo-accent">{point.rating.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfumeHistoryModal;
