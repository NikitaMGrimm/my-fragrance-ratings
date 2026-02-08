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

export enum SortOption {
  RATING_DESC = 'rating_desc',
  RATING_ASC = 'rating_asc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}