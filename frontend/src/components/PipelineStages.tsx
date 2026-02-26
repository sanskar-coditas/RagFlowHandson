"use client";

import { motion } from "framer-motion";

const stages = [
  { id: "ingest", label: "Chunking", icon: "📄" },
  { id: "embed", label: "Embeddings", icon: "🔢" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "shortcoming", label: "Trap Demo", icon: "⚠" },
  { id: "hybrid", label: "Hybrid/RRF", icon: "🔀" },
  { id: "answer", label: "Intelligence", icon: "🔐" },
];

interface PipelineStagesProps {
  activeStage: string | null;
  mode: "step" | "flow";
}

export function PipelineStages({ activeStage, mode }: PipelineStagesProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
      {stages.map((stage, i) => {
        const isActive = activeStage === stage.id;
        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all sm:px-3 sm:py-2 ${
              isActive
                ? "intel-panel-active border-cyan-500/50 bg-cyan-900/30"
                : "border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50"
            }`}
          >
            <span className="text-sm sm:text-base">{stage.icon}</span>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold sm:h-6 sm:w-6 sm:text-xs ${
                isActive ? "bg-cyan-500 text-gray-900" : "bg-gray-700/50 text-gray-400"
              }`}
            >
              {i + 1}
            </span>
            <span className={`hidden text-xs sm:inline sm:text-sm ${isActive ? "text-cyan-300" : "text-gray-400"}`}>
              {stage.label}
            </span>
            {i < stages.length - 1 && (
              <motion.span
                className="hidden text-cyan-700 lg:inline"
                aria-hidden
              >
                →
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
