import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinish, durationMs = 1300 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) {
        onFinish();
      }
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-zinc-950 text-white select-none px-6 py-12"
          data-testid="splash-screen"
        >
          {/* Top spacer */}
          <div className="w-full flex justify-end">
            <span className="text-[10px] tracking-widest font-mono text-zinc-600 uppercase">v2.4.0</span>
          </div>

          {/* Center Brand Identity (Typographic only, no logo/icon) */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mt-6"
            >
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                Mingree
              </h1>
              <p className="mt-2 text-xs sm:text-sm font-normal tracking-wide text-zinc-400">
                Influencer & Brand Collaboration Platform
              </p>
            </motion.div>
          </div>

          {/* Bottom attribution */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span className="text-[11px] font-medium text-zinc-500 tracking-wider uppercase">
              from
            </span>
            <div className="text-xs font-medium text-zinc-400">
              Mingree Media Network
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
