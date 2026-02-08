import React from 'react';

interface StarRatingProps {
  rating: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
  const starsValue = rating / 2;
  const totalStars = 5;

  return (
    <div className="flex items-center space-x-1" title={`${rating}/10`}>
      {[...Array(totalStars)].map((_, index) => {
        const fillAmount = Math.max(0, Math.min(1, starsValue - index));
        
        return (
          <div key={index} className="relative w-5 h-5">
            <svg
              className="w-full h-full text-gray-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            
            <div 
              className="absolute top-0 left-0 h-full overflow-hidden" 
              style={{ width: `${fillAmount * 100}%` }}
            >
              <svg
                className="w-5 h-5 text-parfumo-accent"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;