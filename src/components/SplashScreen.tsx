import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import mingreeLogo from "@assets/generated_images/mingree_mg_circular_logo.png";

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
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-zinc-950 via-[#180828] to-zinc-950 text-white select-none px-6 py-12"
          data-testid="splash-screen"
        >
          {/* Top spacer */}
          <div className="w-full flex justify-end">
            <span className="text-[10px] tracking-widest font-mono text-zinc-600 uppercase">v2.4.0</span>
          </div>

          {/* Center Brand Identity */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              {/* Glowing animated halo */}
              <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-pink-500/30 via-purple-600/30 to-amber-500/20 blur-xl animate-pulse" />
              
              <div className="relative rounded-3xl p-1 bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 shadow-2xl">
                <img
                  src={mingreeLogo}
                  alt="Mingree"
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-[22px] object-cover shadow-inner"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              className="mt-6"
            >
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Mingree
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm font-medium tracking-wide text-zinc-400">
                Influencer & Brand Collaboration Platform
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "120px" }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="mt-8 h-1 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400"
            />
          </div>

          {/* Bottom attribution */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span className="text-[11px] font-medium text-zinc-500 tracking-wider uppercase">
              from
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500" />
              <span>Mingree Media Network</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
