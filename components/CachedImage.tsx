import React, { useState, useEffect } from 'react';
import { getCachedImageBlob, cacheImageBlob } from '../utils/storage';

interface CachedImageProps {
  src: string;
  alt: string;
  pid?: string;
  className?: string;
}

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const CachedImage: React.FC<CachedImageProps> = ({ src, alt, pid, className }) => {
  const [displaySrc, setDisplaySrc] = useState<string>('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      if (pid && pid !== '0') {
        for (const ext of EXTENSIONS) {
            try {
                const localPath = `./images/${pid}.${ext}`;
                const response = await fetch(localPath);
                
                const contentType = response.headers.get('content-type');
                if (response.ok && contentType && contentType.startsWith('image')) {
                    if (isMounted) {
                        setDisplaySrc(localPath);
                        setHasLoaded(true);
                    }
                  return;
                }
            } catch (e) {
            }
        }
      }

      if (src && src.trim() !== '') {
        const cachedBlob = await getCachedImageBlob(src);
        if (cachedBlob) {
          objectUrl = URL.createObjectURL(cachedBlob);
          if (isMounted) {
            setDisplaySrc(objectUrl);
            setHasLoaded(true);
          }
          return;
        }

        try {
          const response = await fetch(src);
          if (response.ok) {
            const blob = await response.blob();
            await cacheImageBlob(src, blob); 
            objectUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setDisplaySrc(objectUrl);
              setHasLoaded(true);
            }
            return;
          }
        } catch (err) {
        }

        if (isMounted) {
            setDisplaySrc(src);
            setHasLoaded(true);
        }
        return;
      }

      if (isMounted) {
         setDisplaySrc('https://picsum.photos/120/120?blur=2');
         setHasLoaded(true);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, pid]);

  return (
    <img 
      src={displaySrc} 
      alt={alt} 
      className={`${className} ${hasLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      loading="lazy"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        const fallback = 'https://picsum.photos/120/120?blur=2';
        if (target.src !== fallback) {
             target.src = fallback;
             target.classList.remove('opacity-0');
             target.classList.add('opacity-100');
        }
      }}
    />
  );
};

export default CachedImage;