import {
  FragranceRatingHistory,
  FragranceRatingSummary,
  Perfume,
  RatingHistoryFile,
  RatingHistoryPoint,
  RatingHistorySummary,
  RatingHistoryTimelineRow,
  RepoCommit
} from '../types';

const HISTORY_SOURCE_PATH = 'public/constants.csv';

export const getPerfumeHistoryId = (perfume: Pick<Perfume, 'pid' | 'brand' | 'name'>) => {
  const pid = String(perfume.pid || '').trim();
  if (pid && pid !== '0') return pid;
  return `${perfume.brand || ''}|${perfume.name || ''}`;
};

export const formatCommitLabel = (dateIso: string, sha: string, message: string) => {
  const date = new Date(dateIso);
  const dateLabel = Number.isNaN(date.valueOf()) ? dateIso : date.toISOString().slice(0, 10);
  const summary = String(message || '').split('\n')[0].trim();
  const shortSha = String(sha || '').slice(0, 7);
  return summary ? `${dateLabel} - ${shortSha} - ${summary}` : `${dateLabel} - ${shortSha}`;
};

const normalizeCommit = (entry: any): RepoCommit | null => {
  const sha = String(entry?.sha || '').trim();
  const date = String(entry?.date || '').trim();
  if (!sha || !date) return null;

  const message = String(entry?.message || '');
  return {
    sha,
    date,
    message,
    label: String(entry?.label || formatCommitLabel(date, sha, message)),
    rawUrl: String(entry?.rawUrl || '')
  };
};

const normalizePoint = (entry: any): RatingHistoryPoint | null => {
  const rating = Number(entry?.rating);
  const date = String(entry?.date || '').trim();
  const commit = String(entry?.commit || '').trim();
  if (!Number.isFinite(rating) || !date || !commit) return null;

  return {
    rating,
    date,
    commit,
    timeRated: String(entry?.timeRated || ''),
    commitDate: String(entry?.commitDate || '')
  };
};

const normalizeFragrance = (entry: any): FragranceRatingHistory | null => {
  const brand = String(entry?.brand || '').trim();
  const name = String(entry?.name || '').trim();
  if (!brand || !name || !Array.isArray(entry?.ratings)) return null;

  const ratings = entry.ratings
    .map(normalizePoint)
    .filter(Boolean) as RatingHistoryPoint[];
  if (ratings.length === 0) return null;

  const pid = String(entry?.pid || '').trim();
  const id = String(entry?.id || (pid && pid !== '0' ? pid : `${brand}|${name}`)).trim();

  return {
    id,
    pid,
    brand,
    name,
    firstSeenAt: String(entry?.firstSeenAt || ratings[0].date),
    ratings
  };
};

export const normalizeRatingHistoryFile = (data: any): RatingHistoryFile | null => {
  const commits = Array.isArray(data?.commits)
    ? data.commits.map(normalizeCommit).filter(Boolean) as RepoCommit[]
    : [];
  const fragrances = Array.isArray(data?.fragrances)
    ? data.fragrances.map(normalizeFragrance).filter(Boolean) as FragranceRatingHistory[]
    : [];

  if (commits.length === 0 || fragrances.length === 0) return null;

  return {
    generatedAt: String(data?.generatedAt || ''),
    sourcePath: String(data?.sourcePath || HISTORY_SOURCE_PATH),
    pageSize: Number.isFinite(Number(data?.pageSize)) ? Number(data.pageSize) : undefined,
    commits,
    fragrances
  };
};

const sortByDate = <T extends { date: string }>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.date).valueOf();
    const bTime = new Date(b.date).valueOf();
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return aTime - bTime;
  });
};

const buildSummary = (fragrance: FragranceRatingHistory): FragranceRatingSummary => {
  const ratings = sortByDate(fragrance.ratings);
  const first = ratings[0];
  const latest = ratings[ratings.length - 1];

  return {
    id: fragrance.id,
    pid: fragrance.pid,
    brand: fragrance.brand,
    name: fragrance.name,
    firstRating: first.rating,
    latestRating: latest.rating,
    delta: latest.rating - first.rating,
    eventCount: ratings.length,
    firstSeenAt: fragrance.firstSeenAt || first.date,
    lastChangedAt: latest.date,
    ratings
  };
};

const deriveTimeline = (history: RatingHistoryFile, currentIds: Set<string>): RatingHistoryTimelineRow[] => {
  const commits = sortByDate(history.commits);

  const pointsByCommit = new Map<string, Array<{ id: string; rating: number }>>();
  history.fragrances.forEach((fragrance) => {
    if (currentIds.size > 0 && !currentIds.has(fragrance.id)) return;

    fragrance.ratings.forEach((point) => {
      const existing = pointsByCommit.get(point.commit) || [];
      existing.push({ id: fragrance.id, rating: point.rating });
      pointsByCommit.set(point.commit, existing);
    });
  });

  const knownRatings = new Map<string, number>();

  return commits.map((commit) => {
    const points = pointsByCommit.get(commit.sha) || [];
    let newCount = 0;
    let changedCount = 0;

    points.forEach((point) => {
      if (knownRatings.has(point.id)) {
        changedCount += 1;
      } else {
        newCount += 1;
      }
      knownRatings.set(point.id, point.rating);
    });

    const ratings = Array.from(knownRatings.values());
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null;
    const date = new Date(commit.date);
    const label = Number.isNaN(date.valueOf()) ? commit.date : date.toISOString().slice(0, 10);

    return {
      commit: commit.sha,
      shortCommit: commit.sha.slice(0, 7),
      date: commit.date,
      label,
      knownCount: knownRatings.size,
      newCount,
      changedCount,
      averageRating
    };
  });
};

export const deriveRatingHistorySummary = (
  history: RatingHistoryFile | null,
  perfumes: Perfume[]
): RatingHistorySummary | null => {
  if (!history) return null;

  const currentIds = new Set(perfumes.map(getPerfumeHistoryId));
  const summaries = history.fragrances
    .filter((fragrance) => currentIds.size === 0 || currentIds.has(fragrance.id))
    .map(buildSummary);

  const byId = new Map<string, FragranceRatingSummary>();
  summaries.forEach((summary) => byId.set(summary.id, summary));

  const movers = summaries
    .filter((summary) => summary.eventCount > 1)
    .sort((a, b) => {
      const deltaCompare = Math.abs(b.delta) - Math.abs(a.delta);
      if (deltaCompare !== 0) return deltaCompare;
      return b.eventCount - a.eventCount;
    });

  const recentChanges = [...movers].sort((a, b) => {
    const aTime = new Date(a.lastChangedAt).valueOf();
    const bTime = new Date(b.lastChangedAt).valueOf();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });

  const averageDelta = movers.length > 0
    ? movers.reduce((sum, summary) => sum + summary.delta, 0) / movers.length
    : 0;

  return {
    trackedCount: summaries.length,
    changedCount: movers.length,
    averageDelta,
    biggestMover: movers[0] || null,
    timeline: deriveTimeline(history, currentIds),
    movers,
    recentChanges,
    byId
  };
};
