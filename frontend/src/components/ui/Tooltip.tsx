"use client";

import { useState, useRef, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "auto";
  maxWidth?: number;
  delay?: number;
}

export function Tooltip({
  content,
  children,
  position = "auto",
  maxWidth = 400,
  delay = 150,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const useTop = position === "auto" ? spaceAbove > 250 : position === "top";
        
        let top: number;
        if (useTop) {
          top = rect.top - 12;
        } else {
          top = rect.bottom + 12;
        }
        
        let left = rect.left + rect.width / 2;
        if (left + maxWidth / 2 > window.innerWidth - 20) {
          left = window.innerWidth - maxWidth / 2 - 20;
        }
        if (left - maxWidth / 2 < 20) {
          left = maxWidth / 2 + 20;
        }
        
        setTooltipPosition({ top, left });
      }
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const tooltipContent = mounted && isVisible && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[99999] pointer-events-none"
      style={{ 
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        transform: containerRef.current && tooltipPosition.top < (containerRef.current.getBoundingClientRect().top)
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
        maxWidth,
      }}
    >
      <div className="rounded-xl border-2 border-cyan-500/50 bg-gray-900/98 backdrop-blur-xl p-4 shadow-2xl shadow-cyan-500/30">
        <div className="text-sm text-gray-200 leading-relaxed">{content}</div>
      </div>
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {mounted && createPortal(
        <AnimatePresence>{tooltipContent}</AnimatePresence>,
        document.body
      )}
    </div>
  );
}

interface InfoTooltipProps {
  title: string;
  description: string;
  details?: string[];
  children: ReactNode;
}

export function InfoTooltip({ title, description, details, children }: InfoTooltipProps) {
  return (
    <Tooltip
      content={
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
            <span className="text-cyan-400">ℹ️</span>
            <span className="font-bold text-cyan-300">{title}</span>
          </div>
          <p className="text-gray-400">{description}</p>
          {details && details.length > 0 && (
            <ul className="space-y-1 mt-2 pt-2 border-t border-cyan-500/10">
              {details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-400">
                  <span className="text-cyan-500 text-xs mt-0.5">▸</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
      maxWidth={360}
    >
      {children}
    </Tooltip>
  );
}

interface ChunkPreviewTooltipProps {
  content: string;
  index: number;
  wordCount: number;
  charCount: number;
  children: ReactNode;
}

export function ChunkPreviewTooltip({ content, index, wordCount, charCount, children }: ChunkPreviewTooltipProps) {
  return (
    <Tooltip
      content={
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
            <span className="font-mono font-bold text-lg text-cyan-400">Chunk #{index + 1}</span>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} chars</span>
            </div>
          </div>
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            <p className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
          </div>
        </div>
      }
      maxWidth={500}
      position="auto"
    >
      {children}
    </Tooltip>
  );
}
