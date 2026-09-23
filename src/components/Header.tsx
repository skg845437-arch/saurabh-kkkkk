import React from 'react';
import { Printer, ShieldCheck, Sparkles, CreditCard, Camera, FileText, LockOpen, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'idcropper' | 'multisheet' | 'passport' | 'panresizer' | 'passbook' | 'unlocker';
  setActiveTab: (tab: 'idcropper' | 'multisheet' | 'passport' | 'panresizer' | 'passbook' | 'unlocker') => void;
  onQuickPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onQuickPrint }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
              SK
            </div>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setActiveTab('idcropper'); }}
              className="text-xl font-bold tracking-tight text-slate-900"
            >
              SK Print Portal
            </a>
          </div>

          {/* Zone 2: 4-6 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => setActiveTab('idcropper')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'idcropper'
                  ? 'bg-slate-100 text-indigo-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Smart PVC Cropper</span>
            </button>

            <button
              onClick={() => setActiveTab('multisheet')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'multisheet'
                  ? 'bg-slate-100 text-indigo-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>A4 5-Card & Tray</span>
            </button>

            <button
              onClick={() => setActiveTab('passport')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'passport'
                  ? 'bg-slate-100 text-indigo-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Passport Photo Maker</span>
            </button>

            <button
              onClick={() => setActiveTab('panresizer')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'panresizer'
                  ? 'bg-slate-100 text-indigo-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PAN Photo & Sign</span>
            </button>

            <button
              onClick={() => setActiveTab('passbook')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'passbook'
                  ? 'bg-slate-100 text-indigo-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Bank Passbook</span>
            </button>

            <button
              onClick={() => setActiveTab('unlocker')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'unlocker'
                  ? 'bg-slate-100 text-indigo-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LockOpen className="w-4 h-4" />
              <span>PDF Unlocker</span>
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Free & Secure</span>
            </div>

            <button
              onClick={onQuickPrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all whitespace-nowrap"
              title="Print Current Sheet"
            >
              <Printer className="w-4 h-4" />
              <span>Print (Ctrl+P)</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Horizontal Sub-Nav */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-200 gap-2 text-xs scrollbar-none">
        <button
          onClick={() => setActiveTab('idcropper')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
            activeTab === 'idcropper' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          PVC Cropper
        </button>
        <button
          onClick={() => setActiveTab('multisheet')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
            activeTab === 'multisheet' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          5-Card A4 Sheet
        </button>
        <button
          onClick={() => setActiveTab('passport')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
            activeTab === 'passport' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          Passport Photo
        </button>
        <button
          onClick={() => setActiveTab('panresizer')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
            activeTab === 'panresizer' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          PAN Photo & Sign
        </button>
        <button
          onClick={() => setActiveTab('passbook')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
            activeTab === 'passbook' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          Bank Passbook
        </button>
        <button
          onClick={() => setActiveTab('unlocker')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
            activeTab === 'unlocker' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          PDF Unlocker
        </button>
      </div>
    </header>
  );
};
