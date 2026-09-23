import React, { useState } from 'react';
import { 
  LockOpen, 
  Upload, 
  Download, 
  Check, 
  AlertCircle, 
  FileText, 
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { loadDocumentPages, LoadedDocumentPage } from '../utils/fileLoader';
import jsPDF from 'jspdf';

interface PdfToolsProps {
  onSendToCropper: () => void;
}

export const PdfTools: React.FC<PdfToolsProps> = ({ onSendToCropper }) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unlockedPages, setUnlockedPages] = useState<LoadedDocumentPage[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUnlockPdf = async () => {
    if (!file) {
      setErrorMessage('Please choose an e-Aadhaar or encrypted PDF file first.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await loadDocumentPages(file, password);
    setLoading(false);

    if (result.error === 'PASSWORD_REQUIRED') {
      setErrorMessage('Incorrect password or password is required. Please check capitalization.');
      return;
    }

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    if (result.pages.length > 0) {
      setUnlockedPages(result.pages);
      showToast(`Successfully unlocked ${result.pages.length} pages! Password permanently removed.`);
    }
  };

  // Build clean unlocked PDF without encryption
  const handleDownloadUnlockedPdf = () => {
    if (unlockedPages.length === 0) return;

    const firstPage = unlockedPages[0];
    const isLandscape = firstPage.width > firstPage.height;

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [firstPage.width, firstPage.height],
    });

    unlockedPages.forEach((p, idx) => {
      if (idx > 0) {
        doc.addPage([p.width, p.height], p.width > p.height ? 'landscape' : 'portrait');
      }
      doc.addImage(p.dataUrl, 'PNG', 0, 0, p.width, p.height);
    });

    const originalName = file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document';
    doc.save(`${originalName}_UNLOCKED.pdf`);
    showToast('Downloaded permanent unlocked PDF!');
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              e-Aadhaar PDF Password Remover & Unlocker
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently decrypt and remove password protection from UIDAI e-Aadhaar PDFs. 100% private & client-side (no data upload).
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted files never leave your computer</span>
          </div>
        </div>

        {/* Aadhaar Format Explainer */}
        <div className="mt-4 bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-lg text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>Official UIDAI Password Rule:</span>
          </p>
          <p>
            The password is the <strong>first 4 letters of the person&apos;s name in CAPITAL letters</strong> followed immediately by the <strong>4-digit year of birth (YYYY)</strong>.
          </p>
          <p className="font-mono text-amber-800 text-[11px]">
            Example 1: Name: <strong>RAMESH KUMAR</strong>, Year: <strong>1988</strong> → Password: <strong>RAME1988</strong>
            <br />
            Example 2: Name: <strong>SIA SEN</strong>, Year: <strong>1995</strong> → Password: <strong>SIAS1995</strong>
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Upload & Password Entry */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Select Encrypted PDF
          </h2>

          <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-5 cursor-pointer transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">
              {file ? file.name : 'Choose Locked PDF File'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Click to browse your computer
            </span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setUnlockedPages([]);
                  setErrorMessage(null);
                }
              }}
            />
          </label>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Enter PDF Password (CAPITAL letters)
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value.toUpperCase())}
              placeholder="e.g. SURE1992"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:border-indigo-600 uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlockPdf();
              }}
            />
          </div>

          <button
            onClick={handleUnlockPdf}
            disabled={loading || !file}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-sm transition-all"
          >
            {loading ? (
              <span className="text-xs">Decrypting Document...</span>
            ) : (
              <>
                <LockOpen className="w-4 h-4" />
                <span>Decrypt & Unlock PDF</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right: Unlocked Document View & Download */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Unlocked Document Output
                </h3>
                <span className="text-xs text-slate-500">
                  {unlockedPages.length > 0 
                    ? `${unlockedPages.length} Pages unlocked successfully without password` 
                    : 'Awaiting decryption'}
                </span>
              </div>

              {unlockedPages.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Password Removed</span>
                </div>
              )}
            </div>

            {unlockedPages.length > 0 ? (
              <div className="space-y-4">
                <div className="w-full aspect-[4/3] bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                  <img
                    src={unlockedPages[0].dataUrl}
                    alt="Unlocked Page 1"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <LockOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Select a PDF and click &ldquo;Decrypt &amp; Unlock PDF&rdquo;.</p>
              </div>
            )}
          </div>

          {unlockedPages.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-3">
              <button
                onClick={handleDownloadUnlockedPdf}
                className="flex items-center justify-center gap-1.5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Unlocked PDF</span>
              </button>

              <button
                onClick={onSendToCropper}
                className="flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
              >
                <span>Open in Smart PVC Cropper</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
