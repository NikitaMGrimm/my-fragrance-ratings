import React, { useState } from 'react';
import { SortOption } from '../types';
import { Search, SlidersHorizontal } from 'lucide-react';

interface FilterBarProps {
  itemCount: number;
  totalCount: number;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  brandOptions: string[];
  segmentOptions: string[];
  selectedBrand: string;
  selectedSegment: string;
  ratingMin: string;
  ratingMax: string;
  priceMin: string;
  priceMax: string;
  onBrandChange: (value: string) => void;
  onSegmentChange: (value: string) => void;
  onRatingMinChange: (value: string) => void;
  onRatingMaxChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onResetFilters: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  itemCount, 
  totalCount, 
  sortOption, 
  onSortChange,
  searchTerm,
  onSearchChange,
  brandOptions,
  segmentOptions,
  selectedBrand,
  selectedSegment,
  ratingMin,
  ratingMax,
  priceMin,
  priceMax,
  onBrandChange,
  onSegmentChange,
  onRatingMinChange,
  onRatingMaxChange,
  onPriceMinChange,
  onPriceMaxChange,
  onResetFilters
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="mb-6 space-y-4">
      <div className="bg-parfumo-highlight/30 p-4 rounded-lg flex flex-col md:flex-row gap-4 justify-between items-center border border-gray-700">
        <div className="relative w-full md:w-1/2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Search your collection..."
                className="w-full bg-parfumo-card text-parfumo-text border border-gray-600 rounded pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent placeholder-gray-500"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>

        <div className="w-full md:w-auto min-w-[200px] flex gap-2">
          <select 
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full bg-parfumo-card text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent cursor-pointer"
          >
            <option value={SortOption.RATING_DESC}>Scent (popular)</option>
            <option value={SortOption.RATING_ASC}>Scent (least popular)</option>
            <option value={SortOption.NAME_ASC}>Name (A - Z)</option>
            <option value={SortOption.NAME_DESC}>Name (Z - A)</option>
          </select>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`px-3 py-2 rounded border text-xs uppercase tracking-wider transition-colors flex items-center gap-2 ${
              showFilters
                ? 'border-parfumo-accent bg-parfumo-highlight/40 text-parfumo-text'
                : 'border-gray-700 bg-black/20 text-gray-400 hover:border-gray-500'
            }`}
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-parfumo-card/60 border border-gray-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Brand</label>
              <select
                value={selectedBrand}
                onChange={(e) => onBrandChange(e.target.value)}
                className="w-full bg-parfumo-card text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent cursor-pointer"
              >
                <option value="">All brands</option>
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Market Segment</label>
              <select
                value={selectedSegment}
                onChange={(e) => onSegmentChange(e.target.value)}
                className="w-full bg-parfumo-card text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent cursor-pointer disabled:opacity-50"
                disabled={segmentOptions.length === 0 || selectedBrand !== ''}
              >
                <option value="">All segments</option>
                {segmentOptions.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </select>
              {selectedBrand !== '' && (
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-2">
                  Clear brand to use segments
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Rating Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={ratingMin}
                  onChange={(e) => onRatingMinChange(e.target.value)}
                  placeholder="Min"
                  className="w-full bg-black/20 text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent"
                />
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={ratingMax}
                  onChange={(e) => onRatingMaxChange(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-black/20 text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceMin}
                  onChange={(e) => onPriceMinChange(e.target.value)}
                  placeholder="Min"
                  className="w-full bg-black/20 text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceMax}
                  onChange={(e) => onPriceMaxChange(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-black/20 text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-xs uppercase tracking-wider"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-2 text-xs text-gray-500 uppercase font-semibold tracking-wider">
        <span>Displaying {itemCount} of {totalCount} perfumes</span>
      </div>
    </div>
  );
};

export default FilterBar;