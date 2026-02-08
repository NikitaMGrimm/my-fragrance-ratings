import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, FileText, Download, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileContent: string, overwrite: boolean) => void;
  onClearCache: () => void;
  onExport: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onImport, onClearCache, onExport }) => {
  const [overwrite, setOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;