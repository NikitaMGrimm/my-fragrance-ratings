import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parseCSV } from './utils/csvParser';
import { Perfume, SortOption } from './types';
import PerfumeCard from './components/PerfumeCard';
import FilterBar from './components/FilterBar';
import SettingsModal from './components/SettingsModal';
import MissingFieldsModal from './components/MissingFieldsModal';
import RatingChart from './components/RatingChart';
import PriceScatterChart from './components/PriceScatterChart';
import { loadPerfumesFromStorage, fetchDefaultCSV, savePerfumes, clearUnusedImages } from './utils/storage';
import { Settings } from 'lucide-react';
import { exportCollection } from './utils/exporter';

const App: React.FC = () => {
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.RATING_DESC);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [ratingMin, setRatingMin] = useState<string>('');
  const [ratingMax, setRatingMax] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMissingFieldsOpen, setIsMissingFieldsOpen] = useState(false);
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

  const handleMissingFieldsSave = (updated: Perfume[]) => {
    setPerfumes(updated);
    savePerfumes(updated);
  };

  const segmentFieldKey = useMemo(() => {
    const allKeys = new Set<string>();
    perfumes.forEach((p) => Object.keys(p).forEach((k) => allKeys.add(k)));

    for (const key of allKeys) {
      const normalized = key.toLowerCase().replace(/\s+/g, ' ').trim();
      if (normalized === 'market segment') return key;
    }

    return '';
  }, [perfumes]);

  const brandOptions = useMemo(() => {
    const brands = new Set<string>();
    perfumes.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort((a, b) => a.localeCompare(b));
  }, [perfumes]);

  const segmentOptions = useMemo(() => {
    if (!segmentFieldKey) return [] as string[];
    const segments = new Set<string>();
    perfumes.forEach((p) => {
      const value = p[segmentFieldKey];
      if (value) segments.add(String(value));
    });
    return Array.from(segments).sort((a, b) => a.localeCompare(b));
  }, [perfumes, segmentFieldKey]);

  const handleResetFilters = () => {
    setSelectedBrand('');
    setSelectedSegment('');
    setRatingMin('');
    setRatingMax('');
    setPriceMin('');
    setPriceMax('');
  };

  const processedPerfumes = useMemo(() => {
    let result = [...perfumes];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter((p) => {
        const segmentValue = segmentFieldKey ? String(p[segmentFieldKey] ?? '') : '';
        return (
          (p.name && p.name.toLowerCase().includes(lowerTerm)) ||
          (p.brand && p.brand.toLowerCase().includes(lowerTerm)) ||
          (p.pid && String(p.pid).toLowerCase().includes(lowerTerm)) ||
          (segmentValue && segmentValue.toLowerCase().includes(lowerTerm))
        );
      });
    }

    if (selectedBrand) {
      result = result.filter((p) => p.brand === selectedBrand);
    }

    if (selectedSegment && segmentFieldKey && selectedBrand === '') {
      result = result.filter((p) => String(p[segmentFieldKey] ?? '') === selectedSegment);
    }

    const minRating = ratingMin.trim() === '' ? undefined : Number(ratingMin);
    const maxRating = ratingMax.trim() === '' ? undefined : Number(ratingMax);
    if (Number.isFinite(minRating)) {
      result = result.filter((p) => (p.rating ?? 0) >= (minRating as number));
    }
    if (Number.isFinite(maxRating)) {
      result = result.filter((p) => (p.rating ?? 0) <= (maxRating as number));
    }

    const minPrice = priceMin.trim() === '' ? undefined : Number(priceMin);
    const maxPrice = priceMax.trim() === '' ? undefined : Number(priceMax);
    if (Number.isFinite(minPrice)) {
      result = result.filter((p) => typeof p.price === 'number' && p.price >= (minPrice as number));
    }
    if (Number.isFinite(maxPrice)) {
      result = result.filter((p) => typeof p.price === 'number' && p.price <= (maxPrice as number));
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
  }, [
    perfumes,
    sortOption,
    searchTerm,
    selectedBrand,
    selectedSegment,
    ratingMin,
    ratingMax,
    priceMin,
    priceMax,
    segmentFieldKey
  ]);

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
        <header className="mb-6 border-b border-gray-700 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-3">
            <div>
              <h1 className="text-3xl font-bold text-parfumo-text mb-2">My Ratings</h1>
              <p className="text-gray-500 text-sm">Collection Overview</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsMissingFieldsOpen(true)}
                className="flex items-center space-x-2 text-red-300 hover:text-white transition-colors text-sm font-medium px-4 py-2 bg-parfumo-card rounded border border-red-500/40 hover:border-red-400"
              >
                <span>Field Fixer</span>
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center space-x-2 text-parfumo-accent hover:text-white transition-colors text-sm font-medium px-4 py-2 bg-parfumo-card rounded border border-gray-700 hover:border-parfumo-accent"
              >
                <Settings size={16} />
                <span>Import / Settings</span>
              </button>
            </div>
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
          brandOptions={brandOptions}
          segmentOptions={segmentOptions}
          selectedBrand={selectedBrand}
          selectedSegment={selectedSegment}
          ratingMin={ratingMin}
          ratingMax={ratingMax}
          priceMin={priceMin}
          priceMax={priceMax}
          onBrandChange={setSelectedBrand}
          onSegmentChange={setSelectedSegment}
          onRatingMinChange={setRatingMin}
          onRatingMaxChange={setRatingMax}
          onPriceMinChange={setPriceMin}
          onPriceMaxChange={setPriceMax}
          onResetFilters={handleResetFilters}
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

        <MissingFieldsModal
          isOpen={isMissingFieldsOpen}
          onClose={() => setIsMissingFieldsOpen(false)}
          perfumes={perfumes}
          onSave={handleMissingFieldsSave}
        />
      </div>
    </div>
  );
};

export default App;