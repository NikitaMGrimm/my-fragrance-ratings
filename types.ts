export interface Perfume {
  brand: string;
  name: string;
  pid: string;
  imageUrl: string;
  pageUrl: string;
  timeRated: string;
  rating: number;
  price?: number;
  [key: string]: any;
}

export interface RepoCommit {
  sha: string;
  date: string;
  message: string;
  label: string;
  rawUrl?: string;
}

export interface RatingHistoryPoint {
  rating: number;
  date: string;
  commit: string;
  timeRated?: string;
  commitDate?: string;
}

export interface FragranceRatingHistory {
  id: string;
  pid: string;
  brand: string;
  name: string;
  firstSeenAt: string;
  ratings: RatingHistoryPoint[];
}

export interface RatingHistoryFile {
  generatedAt: string;
  sourcePath: string;
  pageSize?: number;
  commits: RepoCommit[];
  fragrances: FragranceRatingHistory[];
}

export interface FragranceRatingSummary {
  id: string;
  pid: string;
  brand: string;
  name: string;
  firstRating: number;
  latestRating: number;
  delta: number;
  eventCount: number;
  firstSeenAt: string;
  lastChangedAt: string;
  ratings: RatingHistoryPoint[];
}

export interface RatingHistoryTimelineRow {
  commit: string;
  shortCommit: string;
  date: string;
  label: string;
  knownCount: number;
  newCount: number;
  changedCount: number;
  averageRating: number | null;
}

export interface RatingHistorySummary {
  trackedCount: number;
  changedCount: number;
  averageDelta: number;
  biggestMover: FragranceRatingSummary | null;
  timeline: RatingHistoryTimelineRow[];
  movers: FragranceRatingSummary[];
  recentChanges: FragranceRatingSummary[];
  byId: Map<string, FragranceRatingSummary>;
}

export enum SortOption {
  RATING_DESC = 'rating_desc',
  RATING_ASC = 'rating_asc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}
