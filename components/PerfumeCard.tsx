import React from 'react';
import { History } from 'lucide-react';
import { FragranceRatingSummary, Perfume } from '../types';
import StarRating from './StarRating';
import CachedImage from './CachedImage';

interface PerfumeCardProps {
  perfume: Perfume;
  history?: FragranceRatingSummary;
  onHistoryClick?: (history: FragranceRatingSummary) => void;
}

const PerfumeCard: React.FC<PerfumeCardProps> = ({ perfume, history, onHistoryClick }) => {
  const hasLink = !!perfume.pageUrl && perfume.pageUrl.trim() !== '';
  const hasHistory = !!history && history.eventCount > 1;

  const ImageWrapper = hasLink ? 'a' : 'div';
  const imageWrapperProps = hasLink ? {
      href: perfume.pageUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "block w-full h-full cursor-pointer"
  } : {
      className: "block w-full h-full"
  };

  return (
    <div className="relative flex bg-parfumo-card rounded-md shadow-md overflow-hidden hover:bg-[#252a32] transition-colors border border-gray-800/50 h-[100px] group">
      {hasHistory && (
        <button
          type="button"
          title={`Rating history: ${history.eventCount} entries`}
          aria-label={`Open rating history for ${perfume.brand} ${perfume.name}`}
          onClick={() => onHistoryClick?.(history)}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded border border-parfumo-accent/30 bg-parfumo-bg/90 text-parfumo-accent opacity-80 transition-colors hover:border-parfumo-accent hover:bg-parfumo-accent/10 hover:text-white"
        >
          <History size={14} />
        </button>
      )}

      <div className="w-[100px] h-[100px] flex-shrink-0 p-2 bg-white rounded-l-md">
        <ImageWrapper {...imageWrapperProps}>
            <CachedImage 
              src={perfume.imageUrl} 
              alt={perfume.name}
              pid={perfume.pid}
              className="w-full h-full object-contain"
            />
        </ImageWrapper>
      </div>

      <div className={`flex-1 flex flex-col justify-center py-1 pl-4 ${hasHistory ? 'pr-10' : 'pr-4'} space-y-0.5 min-w-0`}>
        <h3 className="text-sm text-parfumo-text/80 uppercase font-semibold tracking-wider text-[10px] truncate">
          {perfume.brand}
        </h3>

        {hasLink ? (
          <a 
            href={perfume.pageUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            title={perfume.name}
            className="text-parfumo-accent hover:underline text-[15px] font-medium leading-tight line-clamp-2"
          >
            {perfume.name}
          </a>
        ) : (
          <span 
            title={perfume.name}
            className="text-parfumo-text text-[15px] font-medium leading-tight line-clamp-2"
          >
            {perfume.name}
          </span>
        )}

        <div className="flex items-center space-x-2 pt-0.5">
            <StarRating rating={perfume.rating} />
            <span className="text-xs text-parfumo-text font-bold">{perfume.rating > 0 ? perfume.rating.toFixed(1) : '0.0'}</span>
        </div>
        
        {perfume.timeRated && perfume.timeRated.trim() !== '' && (
          <div className="text-[10px] text-parfumo-accent/70 mt-0.5 truncate">
              Last edited: {perfume.timeRated}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerfumeCard;
