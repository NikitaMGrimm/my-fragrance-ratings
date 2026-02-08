import React from 'react';
import { SortOption } from '../types';
import { Search } from 'lucide-react';

interface FilterBarProps {
  itemCount: number;
  totalCount: number;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  itemCount, 
  totalCount, 
  sortOption, 
  onSortChange,
  searchTerm,
  onSearchChange
}) => {
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

        <div className="w-full md:w-auto min-w-[200px]">
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
        </div>
      </div>

      <div className="flex justify-between items-center px-2 text-xs text-gray-500 uppercase font-semibold tracking-wider">
        <span>Displaying {itemCount} of {totalCount} perfumes</span>
      </div>
    </div>
  );
};

export default FilterBar;