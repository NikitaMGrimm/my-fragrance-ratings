import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Trash2, FileText, Download, Save, GitBranch, RefreshCw } from 'lucide-react';

type RepoInfo = {
  owner: string;
  repo: string;
};

type RepoCommit = {
  sha: string;
  date: string;
  message: string;
  label: string;
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileContent: string, overwrite: boolean) => void;
  onClearCache: () => void;
  onResetStorage: () => void;
  onExport: () => void;
  repoInfo: RepoInfo | null;
  repoHistory: RepoCommit[];
  repoHistoryError: string;
  isRepoHistoryLoading: boolean;
  repoHistoryHasMore: boolean;
  onLoadRepoHistory: () => void;
  onLoadMoreRepoHistory: () => void;
  onImportRepoVersion: (sha: string, overwrite: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onClearCache,
  onResetStorage,
  onExport,
  repoInfo,
  repoHistory,
  repoHistoryError,
  isRepoHistoryLoading,
  repoHistoryHasMore,
  onLoadRepoHistory,
  onLoadMoreRepoHistory,
  onImportRepoVersion
}) => {
  const [overwrite, setOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState('');
  const [isImportingRepo, setIsImportingRepo] = useState(false);

  useEffect(() => {
    if (!selectedCommit && repoHistory.length > 0) {
      setSelectedCommit(repoHistory[0].sha);
    }
  }, [repoHistory, selectedCommit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImport(event.target.result as string, overwrite);
          onClose();
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportClick = async () => {
      setIsExporting(true);
      await onExport();
      setIsExporting(false);
  }

  const handleRepoImportClick = async () => {
    if (!selectedCommit) return;
    setIsImportingRepo(true);
    await onImportRepoVersion(selectedCommit, overwrite);
    setIsImportingRepo(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-parfumo-card border border-gray-700 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 bg-parfumo-bg border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-parfumo-text">Settings & Import</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-sm uppercase text-parfumo-accent font-semibold tracking-wider flex items-center gap-2">
                <Upload size={16} /> Import CSV
            </h3>

            <div className="bg-[#1a1e24] p-3 rounded border border-gray-700/50 text-xs text-gray-400">
                <div className="flex items-start gap-2">
                    <FileText size={14} className="mt-0.5 text-gray-500 shrink-0"/>
                    <div className="w-full">
                        <p className="font-semibold text-gray-300 mb-1">CSV Format Rules:</p>
                        <p className="leading-relaxed opacity-80 mb-2">
                            <strong>Required:</strong> Brand, Name<br/>
                            <strong>Optional:</strong> PID, Image URL, Page URL, Time Rated, Rating, 
                            <span className="text-parfumo-accent"> Price</span> (any column containing "Price")
                        </p>
                        <p className="leading-relaxed opacity-80 mb-2">
                            <em>Ratings should be 0-10. If PID is missing, Brand + Name is used as the ID.</em>
                        </p>
                        <code className="block p-2 bg-black/30 rounded border border-gray-800 text-parfumo-accent break-words font-mono text-[10px] leading-tight">
                            Brand, Name, PID, Image URL, Page URL, Time Rated, Rating, Price
                        </code>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-between bg-[#252a32] p-3 rounded border border-gray-700">
              <span className="text-sm text-gray-300 font-medium">
                {overwrite ? "Overwrite Collection" : "Merge / Update"}
              </span>
              <button 
                onClick={() => setOverwrite(!overwrite)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${overwrite ? 'bg-red-500' : 'bg-parfumo-accent'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${overwrite ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 px-1">
              {overwrite 
                ? "Replaces your entire collection with the CSV." 
                : "Adds new perfumes and updates existing ones."}
            </p>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 bg-parfumo-highlight hover:bg-gray-600 text-white py-3 rounded transition-colors font-medium text-sm border border-gray-600"
            >
              <Upload size={16} />
              <span>Select CSV File</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileChange} 
            />

            <div className="bg-[#1a1e24] p-3 rounded border border-gray-700/50 text-xs text-gray-400 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-gray-300">
                  <GitBranch size={14} className="text-gray-500" />
                  <span className="font-semibold">Repo history import</span>
                </div>
                <button
                  type="button"
                  onClick={onLoadRepoHistory}
                  disabled={isRepoHistoryLoading}
                  className="inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRepoHistoryLoading ? 'animate-spin' : ''} />
                  {isRepoHistoryLoading ? 'Loading' : 'Fetch history'}
                </button>
              </div>

              <div className="text-[11px] text-gray-500">
                {repoInfo
                  ? `Detected repo: ${repoInfo.owner}/${repoInfo.repo}`
                  : 'Repo not detected. Set VITE_GITHUB_OWNER + VITE_GITHUB_REPO or deploy on GitHub Pages.'}
              </div>
              <div className="text-[11px] text-gray-500">
                History is loaded from public/history.json generated by GitHub Actions on main pushes.
              </div>

              {repoHistoryError && (
                <div className="text-[11px] text-red-400">{repoHistoryError}</div>
              )}

              <div className="space-y-2">
                <select
                  value={selectedCommit}
                  onChange={(e) => setSelectedCommit(e.target.value)}
                  className="w-full bg-parfumo-card text-parfumo-text border border-gray-600 rounded px-3 py-2 text-xs focus:outline-none focus:border-parfumo-accent cursor-pointer"
                  disabled={repoHistory.length === 0}
                >
                  <option value="">Select a commit date</option>
                  {repoHistory.map((commit) => (
                    <option key={commit.sha} value={commit.sha}>
                      {commit.label}
                    </option>
                  ))}
                </select>

                {repoHistoryHasMore && (
                  <button
                    type="button"
                    onClick={onLoadMoreRepoHistory}
                    disabled={isRepoHistoryLoading}
                    className="w-full flex items-center justify-center space-x-2 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 py-2 rounded transition-colors text-[11px] uppercase tracking-wider disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isRepoHistoryLoading ? 'animate-spin' : ''} />
                    <span>{isRepoHistoryLoading ? 'Loading more' : 'Load more history'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRepoImportClick}
                  disabled={!selectedCommit || isImportingRepo}
                  className="w-full flex items-center justify-center space-x-2 border border-parfumo-accent/40 text-parfumo-accent hover:bg-parfumo-accent/10 py-2.5 rounded transition-colors font-medium text-xs disabled:opacity-50"
                >
                  {isImportingRepo ? (
                    <div className="animate-spin h-4 w-4 border-2 border-parfumo-accent border-t-transparent rounded-full"></div>
                  ) : (
                    <Upload size={14} />
                  )}
                  <span>{isImportingRepo ? 'Importing...' : 'Import selected version'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 space-y-6">
            <div>
                <h3 className="text-sm uppercase text-green-400 font-semibold tracking-wider mb-4 flex items-center gap-2">
                    <Download size={16} /> Export
                </h3>
                <button 
                    onClick={handleExportClick}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center space-x-2 border border-green-500/30 text-green-400 hover:bg-green-500/10 py-3 rounded transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? (
                         <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
                    ) : (
                        <Save size={16} />
                    )}
                    <span>{isExporting ? "Zipping..." : "Export Repo ZIP"}</span>
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Downloads a .zip containing <code>constants.csv</code> and an <code>images</code> folder with your cached items, ready for GitHub.
                </p>
            </div>

            <div>
                <h3 className="text-sm uppercase text-red-400 font-semibold tracking-wider mb-4 flex items-center gap-2">
                    <Trash2 size={16} /> Storage
                </h3>
                
                <button 
                onClick={onClearCache}
                className="w-full flex items-center justify-center space-x-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 py-3 rounded transition-colors font-medium text-sm"
                >
                <Trash2 size={16} />
                <span>Clear Unused Images</span>
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                Frees up space by deleting cached images not found in your current list.
                </p>

              <button 
              onClick={onResetStorage}
              className="w-full mt-4 flex items-center justify-center space-x-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 py-3 rounded transition-colors font-medium text-sm"
              >
              <Trash2 size={16} />
              <span>Reset Storage to Default</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
              Clears local changes and cached images, then reloads the default collection.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;