import React, { useState, useEffect } from 'react';
import { getCachedImageBlob, cacheImageBlob } from '../utils/storage';

interface CachedImageProps {
  src: string;
  alt: string;
  pid?: string;
  className?: string;
}

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const resolvedImageCache = new Map<string, string>();

const getCacheKey = (src: string, pid?: string) => {
  const cleanPid = String(pid || '').trim();
  if (cleanPid && cleanPid !== '0') return `pid:${cleanPid}`;
  return `src:${src || ''}`;
};

const CachedImage: React.FC<CachedImageProps> = ({ src, alt, pid, className }) => {
  const cacheKey = getCacheKey(src, pid);
  const cachedSrc = resolvedImageCache.get(cacheKey);
  const [displaySrc, setDisplaySrc] = useState<string>(cachedSrc || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  const [hasLoaded, setHasLoaded] = useState(!!cachedSrc);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;
    const currentCacheKey = getCacheKey(src, pid);
    const existing = resolvedImageCache.get(currentCacheKey);
    if (existing) {
      setDisplaySrc(existing);
      setHasLoaded(true);
      return () => {
        isMounted = false;
      };
    }

    const loadImage = async () => {
      if (pid && pid !== '0') {
        for (const ext of EXTENSIONS) {
            try {
            const localPath = `${import.meta.env.BASE_URL}images/${pid}.${ext}`;
                const response = await fetch(localPath);
                
                const contentType = response.headers.get('content-type');
                if (response.ok && contentType && contentType.startsWith('image')) {
                    if (isMounted) {
                        resolvedImageCache.set(currentCacheKey, localPath);
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
            resolvedImageCache.set(currentCacheKey, src);
            setDisplaySrc(src);
            setHasLoaded(true);
        }
        return;
      }

      if (isMounted) {
         const fallback = 'https://picsum.photos/120/120?blur=2';
         resolvedImageCache.set(currentCacheKey, fallback);
         setDisplaySrc(fallback);
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
             resolvedImageCache.set(cacheKey, fallback);
             target.src = fallback;
             target.classList.remove('opacity-0');
             target.classList.add('opacity-100');
        }
      }}
    />
  );
};

export default CachedImage;
