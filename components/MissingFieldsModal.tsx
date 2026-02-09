import React, { useMemo, useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { Perfume } from '../types';
import CachedImage from './CachedImage';

interface MissingFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  perfumes: Perfume[];
  onSave: (updated: Perfume[]) => void;
}

const STANDARD_FIELD_ORDER = [
  'brand',
  'name',
  'pid',
  'imageUrl',
  'pageUrl',
  'timeRated',
  'rating',
  'price'
];

const FIELD_LABELS: Record<string, string> = {
  brand: 'Brand',
  name: 'Name',
  pid: 'PID',
  imageUrl: 'Image URL',
  pageUrl: 'Page URL',
  timeRated: 'Time Rated',
  rating: 'Rating',
  price: 'Price'
};

const getPerfumeId = (p: Perfume) => {
  if (p.pid && p.pid !== '0' && String(p.pid).trim() !== '') return String(p.pid);
  if (p.brand && p.name) return `${p.brand}|${p.name}`;
  return `${p.brand || 'unknown'}|${p.name || 'unknown'}`;
};

const isMissingValue = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

const normalizeValue = (field: string, raw: string) => {
  const trimmed = raw.trim();
  if (field === 'rating' || field === 'price') {
    if (trimmed === '') return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  }
  return trimmed === '' ? undefined : trimmed;
};

const MISSING_ENTRY_KEY = '__MISSING__';

const toEntryKey = (value: unknown) => {
  if (isMissingValue(value)) return MISSING_ENTRY_KEY;
  return String(value);
};

const toEntryLabel = (value: unknown) => {
  if (isMissingValue(value)) return '(empty)';
  return String(value);
};

const MissingFieldsModal: React.FC<MissingFieldsModalProps> = ({ isOpen, onClose, perfumes, onSave }) => {
  const [selectedField, setSelectedField] = useState<string>('');
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [entryField, setEntryField] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');

  const availableFields = useMemo(() => {
    const allKeys = new Set<string>();
    perfumes.forEach((p) => Object.keys(p).forEach((k) => allKeys.add(k)));

    const ordered: string[] = [];
    STANDARD_FIELD_ORDER.forEach((k) => {
      if (allKeys.has(k)) {
        ordered.push(k);
        allKeys.delete(k);
      }
    });

    const rest = Array.from(allKeys).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...rest];
  }, [perfumes]);

  const getMissingFieldsForPerfume = (perfume: Perfume) => {
    const fields = selectedField ? [selectedField] : availableFields;
    return fields.filter((field) => isMissingValue(perfume[field]));
  };

  const perfumesWithMissing = useMemo(() => {
    return perfumes.filter((p) => getMissingFieldsForPerfume(p).length > 0);
  }, [perfumes, selectedField, availableFields]);

  const entryOptions = useMemo(() => {
    if (!entryField) return [] as Array<{ key: string; label: string; count: number }>;

    const entryMap = new Map<string, { label: string; count: number }>();
    perfumes.forEach((p) => {
      const raw = p[entryField];
      const key = toEntryKey(raw);
      const label = toEntryLabel(raw);
      const existing = entryMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        entryMap.set(key, { label, count: 1 });
      }
    });

    return Array.from(entryMap.entries())
      .map(([key, value]) => ({ key, label: value.label, count: value.count }))
      .sort((a, b) => {
        if (a.key === MISSING_ENTRY_KEY) return -1;
        if (b.key === MISSING_ENTRY_KEY) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [entryField, perfumes]);

  const perfumesForEntry = useMemo(() => {
    if (!entryField || !selectedEntry) return [] as Perfume[];
    return perfumes.filter((p) => toEntryKey(p[entryField]) === selectedEntry);
  }, [entryField, perfumes, selectedEntry]);

  const handleFieldChange = (perfumeId: string, field: string, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [perfumeId]: {
        ...(prev[perfumeId] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    const updated = perfumes.map((perfume) => {
      const perfumeId = getPerfumeId(perfume);
      const perfumeOverrides = overrides[perfumeId];
      if (!perfumeOverrides) return perfume;

      const changes: Record<string, any> = {};
      Object.entries(perfumeOverrides).forEach(([field, value]) => {
        const normalized = normalizeValue(field, value);
        if (normalized !== undefined) {
          changes[field] = normalized;
        }
      });

      if (Object.keys(changes).length === 0) return perfume;
      return { ...perfume, ...changes };
    });

    onSave(updated);
    setOverrides({});
  };

  const handleEntryFieldChange = (value: string) => {
    setEntryField(value);
    setSelectedEntry('');
    setBulkValue('');
  };

  const handleSelectEntry = (entryKey: string) => {
    setSelectedEntry(entryKey);
    setBulkValue('');
  };

  const handleApplyBulk = () => {
    if (!entryField || !selectedEntry) return;
    const trimmed = bulkValue.trim();
    if (trimmed === '') return;

    setOverrides((prev) => {
      const next = { ...prev };
      perfumesForEntry.forEach((perfume) => {
        const perfumeId = getPerfumeId(perfume);
        next[perfumeId] = {
          ...(next[perfumeId] || {}),
          [entryField]: bulkValue
        };
      });
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-parfumo-card border border-gray-700 rounded-lg shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 bg-parfumo-bg border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-parfumo-text flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" /> Missing Fields Checker
            </h2>
            <p className="text-xs text-gray-500">Fill in any missing CSV fields. Perfumes disappear once complete.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="w-full md:w-1/3">
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Filter by Field</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full bg-parfumo-card text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent cursor-pointer"
              >
                <option value="">All Missing Fields</option>
                {availableFields.map((field) => (
                  <option key={field} value={field}>
                    {FIELD_LABELS[field] || field}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
              {perfumesWithMissing.length} perfumes need attention
            </div>
          </div>

          <div className="bg-parfumo-card/60 border border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="w-full md:w-1/2">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Browse Field Entries</label>
                <select
                  value={entryField}
                  onChange={(e) => handleEntryFieldChange(e.target.value)}
                  className="w-full bg-parfumo-card text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent cursor-pointer"
                >
                  <option value="">Select a field</option>
                  {availableFields.map((field) => (
                    <option key={field} value={field}>
                      {FIELD_LABELS[field] || field}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                {entryField ? `${entryOptions.length} entries found` : 'Pick a field to explore'}
              </div>
            </div>

            {entryField && entryOptions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {entryOptions.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => handleSelectEntry(entry.key)}
                    className={`text-left px-3 py-2 rounded border text-sm transition-colors ${
                      selectedEntry === entry.key
                        ? 'border-parfumo-accent bg-parfumo-highlight/40 text-parfumo-text'
                        : 'border-gray-700 bg-black/20 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold truncate">{entry.label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">{entry.count} perfumes</div>
                  </button>
                ))}
              </div>
            )}

            {entryField && selectedEntry && (
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <div className="text-xs uppercase tracking-wider text-gray-500">
                  {perfumesForEntry.length} perfumes with {FIELD_LABELS[entryField] || entryField}: {entryOptions.find((e) => e.key === selectedEntry)?.label}
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                  <input
                    type="text"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    placeholder={`Replace ${FIELD_LABELS[entryField] || entryField} with...`}
                    className="w-full md:flex-1 bg-black/20 text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulk}
                    disabled={bulkValue.trim() === '' || perfumesForEntry.length === 0}
                    className="px-4 py-2 rounded bg-parfumo-accent/90 hover:bg-parfumo-accent text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply to {perfumesForEntry.length} perfumes
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2">
                  {perfumesForEntry.map((perfume) => {
                    const perfumeId = getPerfumeId(perfume);
                    return (
                      <div
                        key={`${perfumeId}-${entryField}`}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm bg-black/20 border border-gray-700 rounded px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-gray-400 text-[10px] uppercase tracking-wider truncate">
                            {perfume.brand || 'Unknown Brand'}
                          </div>
                          <div className="text-parfumo-text truncate">{perfume.name || 'Unknown Name'}</div>
                          <div className="text-[10px] text-gray-500">PID: {perfume.pid || 'n/a'}</div>
                        </div>
                        <input
                          type="text"
                          value={overrides[perfumeId]?.[entryField] ?? String(perfume[entryField] ?? '')}
                          onChange={(e) => handleFieldChange(perfumeId, entryField, e.target.value)}
                          className="w-full md:w-64 bg-black/30 text-parfumo-text border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-parfumo-accent"
                          placeholder={`Edit ${FIELD_LABELS[entryField] || entryField}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {perfumesWithMissing.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No missing fields found for the selected filter.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {perfumesWithMissing.map((perfume) => {
                const perfumeId = getPerfumeId(perfume);
                const missingFields = getMissingFieldsForPerfume(perfume);

                return (
                  <div key={perfumeId} className="bg-parfumo-highlight/30 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="flex gap-4 p-4">
                      <div className="w-[90px] h-[90px] flex-shrink-0 p-2 bg-white rounded-md">
                        <CachedImage
                          src={perfume.imageUrl}
                          alt={perfume.name}
                          pid={perfume.pid}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase text-gray-400 tracking-wider font-semibold truncate">
                          {perfume.brand || 'Unknown Brand'}
                        </div>
                        <div className="text-parfumo-text text-base font-semibold truncate">
                          {perfume.name || 'Unknown Name'}
                        </div>
                        {perfume.pid && (
                          <div className="text-[10px] text-gray-500 mt-1">PID: {perfume.pid}</div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 space-y-3">
                      {missingFields.map((field) => (
                        <div key={`${perfumeId}-${field}`}>
                          <label className="block text-[11px] uppercase tracking-wider text-red-300 mb-1">
                            {FIELD_LABELS[field] || field}
                          </label>
                          <input
                            type="text"
                            value={overrides[perfumeId]?.[field] ?? ''}
                            onChange={(e) => handleFieldChange(perfumeId, field, e.target.value)}
                            placeholder={`Enter ${FIELD_LABELS[field] || field}`}
                            className="w-full bg-black/20 text-red-200 border border-red-500/70 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-400 placeholder-red-400/70"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-parfumo-bg">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-sm"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-red-500/90 hover:bg-red-500 text-white font-semibold text-sm flex items-center gap-2"
          >
            <Save size={16} /> Save Updates
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingFieldsModal;
