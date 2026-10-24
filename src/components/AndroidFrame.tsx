import React, { useState, useEffect } from "react";

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
  const [time, setTime] = useState("09:41");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start p-0 md:py-6 md:px-4">
      {/* Top Banner Toolbar for Desktop Viewers */}
      <header className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mb-3 px-3 py-2 flex items-center justify-between bg-card rounded-lg border border-border shadow-xs text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Mingree Android OS</span>
          <span className="hidden sm:inline text-muted-foreground">| Live APK Mode</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDeviceFrame(!isDeviceFrame)}
            className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors cursor-pointer border border-border text-xs"
            title="Toggle Device Frame"
          >
            {isDeviceFrame ? "Full Screen" : "Phone Frame"}
          </button>

          <button
            onClick={onOpenApkModal}
            className="px-3 py-1 rounded bg-foreground text-background font-semibold transition-all cursor-pointer text-xs"
          >
            APK Download
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 ${
          isDeviceFrame
            ? "max-w-[430px] rounded-3xl border border-border overflow-hidden bg-background shadow-lg"
            : "max-w-md md:max-w-xl lg:max-w-2xl shadow-sm rounded-none md:rounded-xl border border-border bg-background"
        }`}
      >
        {/* Android Status Bar */}
        <div className="w-full bg-muted/40 text-muted-foreground px-6 pt-2 pb-1.5 flex items-center justify-between text-xs select-none border-b border-border z-50">
          <div className="font-medium text-xs text-foreground">
            {time}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>5G</span>
            <span>96%</span>
          </div>
        </div>

        {/* Screen Viewport */}
        <div className="relative w-full min-h-[750px] max-h-[850px] overflow-y-auto flex flex-col bg-background">
          {children}
        </div>

        {/* Android Bottom Navigation Gesture Bar */}
        <div className="w-full bg-muted/40 py-2 flex items-center justify-center border-t border-border select-none">
          <div className="w-32 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    </div>
  );
};
