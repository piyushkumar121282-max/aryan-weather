import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Copy, Check, X, Share2, PlusSquare, Sparkles } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'iphone' | 'android'>('iphone');

  // App URLs
  const appUrl = 'https://ais-pre-bvubmsk26igrzbfrh37rl6-944907719950.asia-southeast1.run.app';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}&bgcolor=0a0a0a&color=38bdf8&margin=10`;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      onClose();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      // Fallback
      const input = document.createElement('input');
      input.value = appUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl p-6 text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-850 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Install on Mobile</h3>
              <p className="text-xs text-neutral-400">Aryan Weather Mobile PWA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Link & Copy */}
        <div className="mt-4 relative z-10">
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
            Phone Install Link
          </label>
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="w-full bg-transparent px-2.5 text-xs text-cyan-300 font-mono focus:outline-none truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isCopied
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-700'
              }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Scan QR Code */}
        <div className="mt-4 p-3 rounded-2xl bg-neutral-900/80 border border-neutral-850 flex items-center gap-4 relative z-10">
          <div className="p-1.5 bg-black rounded-xl border border-neutral-800 shrink-0">
            <img
              src={qrCodeUrl}
              alt="Scan QR to open app on phone"
              className="w-20 h-20 rounded-lg object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-white flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Instant Scan
            </span>
            <p className="text-neutral-400 mt-1 leading-relaxed">
              Open your phone's camera and point it at this QR code to open the link directly.
            </p>
          </div>
        </div>

        {/* Native 1-Click Install Button (if browser supports beforeinstallprompt) */}
        {deferredPrompt && (
          <div className="mt-4 relative z-10">
            <button
              type="button"
              onClick={handleNativeInstall}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>1-Click Install Application Now</span>
            </button>
          </div>
        )}

        {/* Device Switcher Tabs */}
        <div className="mt-4 flex items-center rounded-xl bg-neutral-900 p-1 border border-neutral-850 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('iphone')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'iphone'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-slate-200'
            }`}
          >
            iPhone (iOS Safari)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'android'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-slate-200'
            }`}
          >
            Android (Chrome)
          </button>
        </div>

        {/* Step-by-step instructions */}
        <div className="mt-3 p-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-850 text-xs text-neutral-300 space-y-2.5 relative z-10">
          {activeTab === 'iphone' ? (
            <>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-neutral-700">
                  1
                </span>
                <span>
                  Open the link in <strong className="text-white">Safari</strong> on your iPhone.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-neutral-700">
                  2
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  Tap the <Share2 className="w-3.5 h-3.5 text-cyan-400 inline" /> <strong className="text-white">Share</strong> icon at the bottom of the screen.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-neutral-700">
                  3
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline" /> <strong className="text-white">"Add to Home Screen"</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-neutral-700">
                  4
                </span>
                <span>
                  Tap <strong className="text-white">Add</strong>. The Aryan Weather app icon will appear right on your home screen!
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-neutral-700">
                  1
                </span>
                <span>
                  Open the link in <strong className="text-white">Chrome</strong> on your Android phone.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-neutral-700">
                  2
                </span>
                <span>
                  Tap the three dots menu <strong className="text-white">(⋮)</strong> in the top right.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-neutral-700">
                  3
                </span>
                <span>
                  Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
