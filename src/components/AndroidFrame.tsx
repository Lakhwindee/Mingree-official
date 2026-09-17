import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal, Smartphone, Maximize2, Download } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  onOpenApkModal: () => void;
  isDeviceFrame: boolean;
  setIsDeviceFrame: (val: boolean) => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  onOpenApkModal,
  isDeviceFrame,
  setIsDeviceFrame,
}) => {
  const [time, setTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-start p-0 md:py-6 md:px-4">
      {/* Top Banner Toolbar for Desktop Viewers */}
      <header className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mb-3 px-3 py-2 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800/80 shadow-lg text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-zinc-200">Mingree Android OS</span>
          <span className="hidden sm:inline text-zinc-400">| Live APK Mode</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDeviceFrame(!isDeviceFrame)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors cursor-pointer border border-zinc-700/50"
            title="Toggle Device Frame"
          >
            {isDeviceFrame ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Full Screen</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#FF3399]" />
                <span className="hidden sm:inline">Phone Frame</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenApkModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] hover:opacity-95 text-white font-semibold transition-all shadow-sm shadow-[#FF3399]/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>APK Download</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 ${
          isDeviceFrame
            ? 'max-w-[430px] rounded-[44px] ring-12 ring-zinc-800 shadow-[0_25px_70px_rgba(0,0,0,0.8)] border border-zinc-700/60 overflow-hidden bg-[#0A0A0B]'
            : 'max-w-md md:max-w-xl lg:max-w-2xl shadow-2xl rounded-none md:rounded-3xl border border-zinc-800 bg-[#0A0A0B]'
        }`}
      >
        {/* Android Status Bar */}
        <div className="w-full bg-[#0A0A0B] text-zinc-300 px-6 pt-3 pb-2 flex items-center justify-between text-xs select-none border-b border-zinc-800/40 z-50">
          <div className="font-semibold tracking-wider text-[13px] text-zinc-200">
            {time}
          </div>

          {/* Camera Notch on Device Frame */}
          {isDeviceFrame && (
            <div className="w-4 h-4 rounded-full bg-black ring-2 ring-zinc-800/80 mx-auto flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            </div>
          )}

          <div className="flex items-center gap-2 text-zinc-400">
            <Signal className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-[10px] font-bold text-zinc-300">5G</span>
            <Wifi className="w-3.5 h-3.5 text-zinc-300" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-zinc-300">96%</span>
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Screen Viewport */}
        <div className="relative w-full min-h-[750px] max-h-[850px] overflow-y-auto flex flex-col bg-[#0A0A0B] scrollbar-thin scrollbar-thumb-zinc-800">
          {children}
        </div>

        {/* Android Bottom Navigation Gesture Bar */}
        <div className="w-full bg-[#0A0A0B] py-2 flex items-center justify-center border-t border-zinc-900 select-none">
          <div className="w-36 h-1 rounded-full bg-zinc-600/80" />
        </div>
      </div>
    </div>
  );
};
