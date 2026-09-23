/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { IdCardCropper } from './components/IdCardCropper';
import { MultiCardSheet } from './components/MultiCardSheet';
import { PassportPhotoMaker } from './components/PassportPhotoMaker';
import { SignatureResizer } from './components/SignatureResizer';
import { PassbookGenerator } from './components/PassbookGenerator';
import { PdfTools } from './components/PdfTools';
import { Footer } from './components/Footer';
import { CardRecord } from './types';
import { 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Printer, 
  Zap, 
  Award 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'idcropper' | 'multisheet' | 'passport' | 'panresizer' | 'passbook' | 'unlocker'
  >('idcropper');

  // Shared Cards queue for 5-Card A4 Sheet
  const [savedCards, setSavedCards] = useState<CardRecord[]>([]);

  const handleAddCardToSheet = (card: CardRecord) => {
    setSavedCards((prev) => {
      // Check if already in list
      const existing = prev.findIndex((c) => c.id === card.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = card;
        return updated;
      }
      return [...prev, card];
    });
  };

  const handleQuickPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 3-Zone Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickPrint={handleQuickPrint}
      />

      {/* Free & Trust Guarantee Hero Sub-strip */}
      <div className="bg-indigo-900 text-white border-b border-indigo-950 py-2.5 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
              100% Free Forever
            </span>
            <span className="font-medium text-indigo-100">
              Zero Wallet Recharge · No Daily Limits · No Watermark · Instant PVC Card &amp; Photo Printing
            </span>
          </div>

          <div className="flex items-center gap-4 text-indigo-200 text-[11px]">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Epson L805 / Canon PVC Ready
            </span>
            <span className="hidden md:inline" aria-hidden="true">·</span>
            <span className="hidden md:flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              ISO CR80 85.6 × 54 mm Standard
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'idcropper' && (
          <IdCardCropper
            onAddCardToSheet={handleAddCardToSheet}
            savedCardsCount={savedCards.length}
            onGoToSheet={() => setActiveTab('multisheet')}
          />
        )}

        {activeTab === 'multisheet' && (
          <MultiCardSheet
            cards={savedCards}
            setCards={setSavedCards}
            onGoToCropper={() => setActiveTab('idcropper')}
          />
        )}

        {activeTab === 'passport' && (
          <PassportPhotoMaker />
        )}

        {activeTab === 'panresizer' && (
          <SignatureResizer />
        )}

        {activeTab === 'passbook' && (
          <PassbookGenerator />
        )}

        {activeTab === 'unlocker' && (
          <PdfTools
            onSendToCropper={() => setActiveTab('idcropper')}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
