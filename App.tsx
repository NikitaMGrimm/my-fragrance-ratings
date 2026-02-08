import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parseCSV } from './utils/csvParser';
import { Perfume, SortOption } from './types';
import PerfumeCard from './components/PerfumeCard';
import FilterBar from './components/FilterBar';
import SettingsModal from './components/SettingsModal';
import RatingChart from './components/RatingChart';
import PriceScatterChart from './components/PriceScatterChart';
import { loadPerfumesFromStorage, fetchDefaultCSV, savePerfumes, clearUnusedImages } from './utils/storage';
import { Settings } from 'lucide-react';
import { exportCollection } from './utils/exporter';

const App: React.FC = () => {
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.RATING_DESC);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const stored = loadPerfumesFromStorage();
      if (stored && stored.length > 0) {
        setPerfumes(stored);
      } else {
        const defaultData = await fetchDefaultCSV();
        setPerfumes(defaultData);
      }
      setIsLoading(false);
    };
    initData();
  }, []);

  const handleImport = (csvContent: string, overwrite: boolean) => {
    const parsedData = parseCSV(csvContent);

    if (overwrite) {
      const validPerfumes = parsedData.filter((p: any) => p.brand && p.name) as Perfume[];
      
      setPerfumes(validPerfumes);
      savePerfumes(validPerfumes);
      alert(`Imported ${validPerfumes.length} perfumes (Overwritten).`);
    } else {
      const perfumeMap = new Map<string, Perfume>();
      
      const getId = (p: any) => {
          if (p.pid && p.pid !== "0" && String(p.pid).trim() !== "") return String(p.pid);
          if (p.brand && p.name) return `${p.brand}|${p.name}`;
          return null;
      };

      perfumes.forEach(p => {
        const id = getId(p);
        if (id) perfumeMap.set(id, p);
      });

      let added = 0;
      let updated = 0;

      parsedData.forEach((row: any) => {
        const id = getId(row);
        
        if (id && perfumeMap.has(id)) {
          const existing = perfumeMap.get(id)!;
          const merged = { ...existing, ...row };
          perfumeMap.set(id, merged);
          updated++;
        } else {
          if (row.brand && row.name) {
             const newId = getId(row);
             if (newId) {
                perfumeMap.set(newId, row as Perfume);
                added++;
             }
          }
        }
      });

      const mergedList = Array.from(perfumeMap.values());
      setPerfumes(mergedList);
      savePerfumes(mergedList);
      alert(`Import success: ${added} added, ${updated} updated.`);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm("Are you sure? This will delete cached images for perfumes not currently in your list.")) {
      const activeUrls = perfumes.map(p => p.imageUrl).filter(Boolean);
      const count = await clearUnusedImages(activeUrls);
      alert(`Cache cleared! ${count} unused images removed.`);
    }
  };
  
  const handleExport = async () => {
      await exportCollection(perfumes);
  };

  const processedPerfumes = useMemo(() => {
    let result = [...perfumes];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.name && p.name.toLowerCase().includes(lowerTerm)) || 
        (p.brand && p.brand.toLowerCase().includes(lowerTerm))
      );
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case SortOption.RATING_DESC:
          return (b.rating || 0) - (a.rating || 0);
        case SortOption.RATING_ASC:
          return (a.rating || 0) - (b.rating || 0);
        case SortOption.NAME_ASC:
          return (a.name || '').localeCompare(b.name || '');
        case SortOption.NAME_DESC:
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [perfumes, sortOption, searchTerm]);

  useEffect(() => {
    setVisibleCount(50);
  }, [processedPerfumes]);

  const visiblePerfumes = useMemo(() => {
    return processedPerfumes.slice(0, visibleCount);
  }, [processedPerfumes, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 50, processedPerfumes.length));
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [visiblePerfumes, processedPerfumes.length]);

  return (
    <div className="min-h-screen bg-parfumo-bg p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 border-b border-gray-700 pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-parfumo-text mb-2">My Ratings</h1>
              <p className="text-gray-500 text-sm">Collection Overview</p>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center space-x-2 text-parfumo-accent hover:text-white transition-colors text-sm font-medium px-4 py-2 bg-parfumo-card rounded border border-gray-700 hover:border-parfumo-accent"
            >
              <Settings size={16} />
              <span>Import / Settings</span>
            </button>
        </header>

        {!isLoading && perfumes.length > 0 && (
          <>
            <RatingChart perfumes={perfumes} />
            <PriceScatterChart perfumes={perfumes} />
          </>
        )}

        <FilterBar 
          itemCount={processedPerfumes.length} 
          totalCount={perfumes.length}
          sortOption={sortOption}
          onSortChange={setSortOption}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {isLoading ? (
            <div className="text-center py-20 text-gray-400 animate-pulse">Loading collection...</div>
        ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {visiblePerfumes.map((perfume) => (
                  <PerfumeCard key={perfume.pid || `${perfume.brand}-${perfume.name}`} perfume={perfume} />
              ))}
              </div>

              {visibleCount < processedPerfumes.length && (
                <div ref={loadMoreRef} className="py-8 text-center text-gray-500 text-sm flex justify-center items-center">
                   <div className="animate-pulse">Loading more perfumes...</div>
                </div>
              )}
            </>
        )}

        {!isLoading && processedPerfumes.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p>No perfumes found matching your search.</p>
          </div>
        )}

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onImport={handleImport}
          onClearCache={handleClearCache}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};

export default App;