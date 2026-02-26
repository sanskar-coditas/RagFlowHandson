"use client";

import { motion } from "framer-motion";
import { InfoTooltip } from "./ui/Tooltip";

interface ConceptInfo {
  title: string;
  description: string;
  details?: string[];
}

interface GlassPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  conceptInfo?: ConceptInfo;
}

export function GlassPanel({
  title,
  children,
  className = "",
  active,
  conceptInfo,
}: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`intel-panel ${active ? "intel-panel-active" : ""} p-6 ${className}`}
    >
      {title && (
        <div className="mb-5 flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${active ? "bg-cyan-400 animate-pulse" : "bg-gray-600"}`} />
            {title}
          </h3>
          <div className="flex items-center gap-3">
            {conceptInfo && (
              <InfoTooltip
                title={conceptInfo.title}
                description={conceptInfo.description}
                details={conceptInfo.details}
              >
                <span className="text-xs text-cyan-400/70 cursor-help flex items-center gap-1 hover:text-cyan-400 transition-colors">
                  <span>💡</span> Learn
                </span>
              </InfoTooltip>
            )}
            {active && (
              <span className="text-xs text-cyan-500/50 font-mono">ACTIVE</span>
            )}
          </div>
        </div>
      )}
      {children}
    </motion.div>
  );
}
