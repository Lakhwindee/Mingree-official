import React, { useState } from 'react';
import { X, Download, CheckCircle2, Terminal, Smartphone, Sparkles, FileCode, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateAndroidApkProjectZip } from '../utils/apkGenerator';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'studio' | 'pwabuilder' | 'cli'>('studio');

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    try {
      setIsGenerating(true);
      const zipBlob = await generateAndroidApkProjectZip('Mingree Influencer App');
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mingree-Android-Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsGenerating(false);
      setDownloadSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      alert('Error creating ZIP. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111114] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3399] to-[#FF6B6B] flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Android APK Center
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  Ready
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Package, Export & Build your APK file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm text-zinc-300">
          {/* Main Download Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 via-zinc-900 to-purple-500/10 border border-[#FF3399]/30">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#FF3399] uppercase tracking-wider">
                  Android Native Project
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">Mingree Android APK Project Bundle</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Complete Android Studio project with AndroidManifest.xml, MainActivity.java, Gradle scripts, and web assets.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={isGenerating}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] hover:opacity-95 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#FF3399]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Android Project...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Downloaded Successfully! 🎉</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Project (.zip) for APK</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">Package Name</span>
              <span className="font-mono text-zinc-200 font-semibold">com.mingree.influencer</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">Target SDK</span>
              <span className="font-mono text-zinc-200 font-semibold">Android 14 (API 34)</span>
            </div>
          </div>

          {/* Step by Step Guide */}
          <div>
            <h5 className="font-semibold text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FF3399]" />
              APK Kaise Banayein (3 Easy Options):
            </h5>

            {/* Guide Tabs */}
            <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 mb-3">
              <button
                onClick={() => setActiveGuideTab('studio')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeGuideTab === 'studio' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                1. Android Studio
              </button>
              <button
                onClick={() => setActiveGuideTab('pwabuilder')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeGuideTab === 'pwabuilder' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                2. No-Code Cloud APK
              </button>
              <button
                onClick={() => setActiveGuideTab('cli')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeGuideTab === 'cli' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                3. Terminal / CLI
              </button>
            </div>

            {activeGuideTab === 'studio' && (
              <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2 text-xs leading-relaxed">
                <p className="font-semibold text-zinc-200">Android Studio mein 2 minute me APK:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                  <li>Upar diye gaye button se <strong className="text-zinc-200">Mingree-Android-Project.zip</strong> download karein aur extract karein.</li>
                  <li>Android Studio open karke <strong className="text-zinc-200">"Open"</strong> dabayein aur extract kiya hua folder select karein.</li>
                  <li>Top menu me jayein: <strong className="text-zinc-200">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.</li>
                  <li>Kuch seconds me <code className="bg-zinc-800 text-[#FF3399] px-1 py-0.5 rounded font-mono">app-debug.apk</code> bankar ready ho jayegi!</li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'pwabuilder' && (
              <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2 text-xs leading-relaxed">
                <p className="font-semibold text-zinc-200">Microsoft PWABuilder (Bina kisi software ke):</p>
                <p className="text-zinc-400">
                  Aap bina Android Studio install kiye direct Microsoft ke cloud service se signed APK download kar sakte hain:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                  <li>Browser mein <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-[#FF3399] underline inline-flex items-center gap-0.5">PWABuilder.com <ExternalLink className="w-3 h-3" /></a> kholein.</li>
                  <li>Apna live app URL paste karein.</li>
                  <li><strong>"Package for Android"</strong> par click karein aur direct APK/AAB download karein!</li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'cli' && (
              <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2 text-xs leading-relaxed">
                <p className="font-semibold text-zinc-200">Terminal ya Command Line:</p>
                <div className="bg-black/60 p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 border border-zinc-800">
                  cd android<br />
                  ./gradlew assembleDebug
                </div>
                <p className="text-zinc-400">
                  Output path: <code className="text-zinc-300 font-mono">android/app/build/outputs/apk/debug/app-debug.apk</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Mingree v1.0.0 (Capacitor + Android)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
