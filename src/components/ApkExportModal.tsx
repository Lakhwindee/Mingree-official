import React, { useState } from "react";
import confetti from "canvas-confetti";
import { generateAndroidApkProjectZip } from "../utils/apkGenerator";

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"studio" | "pwabuilder" | "cli">("studio");

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    try {
      setIsGenerating(true);
      const zipBlob = await generateAndroidApkProjectZip("Mingree Influencer App");
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mingree-Android-Project.zip";
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
      alert("Error creating ZIP. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Android APK Center
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Package, export, and build your APK file</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1"
          >
            Close
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-foreground">
          {/* Main Download Card */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Android Native Project
              </span>
              <h4 className="text-sm font-bold text-foreground mt-0.5">Mingree Android APK Project Bundle</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Complete Android Studio project with AndroidManifest.xml, MainActivity.java, Gradle scripts, and web assets.
              </p>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={isGenerating}
              className="mt-4 w-full py-2.5 px-4 rounded bg-foreground text-background font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-xs"
            >
              {isGenerating ? (
                <span>Generating Android Project...</span>
              ) : downloadSuccess ? (
                <span>Downloaded Successfully</span>
              ) : (
                <span>Download Project (.zip) for APK</span>
              )}
            </button>
          </div>

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded bg-muted/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">Package Name</span>
              <span className="font-mono text-foreground font-semibold">com.mingree.influencer</span>
            </div>
            <div className="p-2.5 rounded bg-muted/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">Target SDK</span>
              <span className="font-mono text-foreground font-semibold">Android 14 (API 34)</span>
            </div>
          </div>

          {/* Step by Step Guide */}
          <div>
            <h5 className="font-semibold text-foreground mb-2">
              APK Build Options:
            </h5>

            {/* Guide Tabs */}
            <div className="flex rounded bg-muted p-1 border border-border mb-3">
              <button
                onClick={() => setActiveGuideTab("studio")}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  activeGuideTab === "studio" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                1. Android Studio
              </button>
              <button
                onClick={() => setActiveGuideTab("pwabuilder")}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  activeGuideTab === "pwabuilder" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                2. No-Code Cloud APK
              </button>
              <button
                onClick={() => setActiveGuideTab("cli")}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  activeGuideTab === "cli" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                3. Terminal / CLI
              </button>
            </div>

            {activeGuideTab === "studio" && (
              <div className="p-3.5 rounded bg-muted/20 border border-border space-y-1.5 text-xs leading-relaxed">
                <p className="font-semibold text-foreground">Android Studio in 2 minutes:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Download and extract <strong className="text-foreground">Mingree-Android-Project.zip</strong>.</li>
                  <li>Open Android Studio, click <strong className="text-foreground">Open</strong>, and select the extracted folder.</li>
                  <li>Select: <strong className="text-foreground">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.</li>
                  <li>In seconds, <code className="bg-muted px-1 py-0.5 rounded font-mono">app-debug.apk</code> is ready.</li>
                </ol>
              </div>
            )}

            {activeGuideTab === "pwabuilder" && (
              <div className="p-3.5 rounded bg-muted/20 border border-border space-y-1.5 text-xs leading-relaxed">
                <p className="font-semibold text-foreground">Microsoft PWABuilder:</p>
                <p className="text-muted-foreground">
                  Download signed APK direct from Microsoft cloud service without installing Android Studio:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Open PWABuilder.com in your browser.</li>
                  <li>Paste your live application URL.</li>
                  <li>Click Package for Android and download your APK.</li>
                </ol>
              </div>
            )}

            {activeGuideTab === "cli" && (
              <div className="p-3.5 rounded bg-muted/20 border border-border space-y-1.5 text-xs leading-relaxed">
                <p className="font-semibold text-foreground">Terminal / Command Line:</p>
                <div className="bg-muted p-2.5 rounded font-mono text-xs border border-border">
                  cd android<br />
                  ./gradlew assembleDebug
                </div>
                <p className="text-muted-foreground">
                  Output path: <code className="font-mono">android/app/build/outputs/apk/debug/app-debug.apk</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Mingree v1.0.0 (Capacitor + Android)</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer border border-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
