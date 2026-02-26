"use client";

import { motion } from "framer-motion";

type Mode = "step" | "flow";

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
      <button
        onClick={() => onModeChange("step")}
        className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          mode === "step"
            ? "text-coditas-cyan"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        {mode === "step" && (
          <motion.span
            layoutId="mode-toggle"
            className="absolute inset-0 rounded-md bg-coditas-blue/30"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative">Step-by-Step</span>
      </button>
      <button
        onClick={() => onModeChange("flow")}
        className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          mode === "flow"
            ? "text-coditas-cyan"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        {mode === "flow" && (
          <motion.span
            layoutId="mode-toggle"
            className="absolute inset-0 rounded-md bg-coditas-blue/30"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative">Connected Flow</span>
      </button>
    </div>
  );
}
