"use client";

import { motion } from "framer-motion";

interface FuturisticLoaderProps {
  text?: string;
  progress?: number;
  total?: number;
  current?: number;
  variant?: "spinner" | "pulse" | "matrix" | "circuit";
}

export function FuturisticLoader({
  text,
  progress,
  total,
  current,
  variant = "circuit",
}: FuturisticLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      {variant === "circuit" && <CircuitLoader />}
      {variant === "spinner" && <SpinnerLoader />}
      {variant === "pulse" && <PulseLoader />}
      {variant === "matrix" && <MatrixLoader />}
      
      {text && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-sm font-medium text-cyan-400 neon-text-cyan">
            {text}
          </p>
          {total !== undefined && current !== undefined && (
            <p className="mt-1 text-xs text-gray-500 font-mono">
              Processing {current} of {total}
            </p>
          )}
        </motion.div>
      )}
      
      {progress !== undefined && (
        <div className="w-48">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800 border border-cyan-500/20">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="mt-1 text-center text-xs font-mono text-gray-500">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}

function CircuitLoader() {
  return (
    <div className="relative h-16 w-16">
      <motion.div
        className="absolute inset-0 rounded-lg border-2 border-cyan-500/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-2 rounded-md border border-cyan-400/50"
        animate={{ rotate: -360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="h-3 w-3 rounded-full bg-cyan-400"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
      {[0, 90, 180, 270].map((deg, i) => (
        <motion.div
          key={deg}
          className="absolute h-2 w-0.5 bg-cyan-500"
          style={{
            top: "50%",
            left: "50%",
            transformOrigin: "center 24px",
            transform: `rotate(${deg}deg) translateY(-50%)`,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function SpinnerLoader() {
  return (
    <div className="relative h-12 w-12">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-cyan-500/20"
      />
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="h-2 w-2 rounded-full bg-cyan-400"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

function PulseLoader() {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="h-8 w-1.5 rounded-full bg-cyan-500"
          animate={{
            scaleY: [0.4, 1, 0.4],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

function MatrixLoader() {
  const chars = "01";
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 25 }).map((_, i) => (
        <motion.span
          key={i}
          className="h-4 w-4 flex items-center justify-center text-xs font-mono text-cyan-400"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            delay: Math.random() * 0.5,
          }}
        >
          {chars[Math.floor(Math.random() * chars.length)]}
        </motion.span>
      ))}
    </div>
  );
}

interface ChunkProcessingLoaderProps {
  chunks: string[];
  currentIndex: number;
  stage: "chunking" | "embedding" | "storing" | "complete";
}

export function ChunkProcessingLoader({
  chunks,
  currentIndex,
  stage,
}: ChunkProcessingLoaderProps) {
  const stageLabels = {
    chunking: "Analyzing Document Structure",
    embedding: "Generating Vector Embeddings",
    storing: "Indexing in Vector Database",
    complete: "Processing Complete",
  };

  const stageColors = {
    chunking: "from-purple-500 to-pink-500",
    embedding: "from-cyan-500 to-blue-500",
    storing: "from-amber-500 to-orange-500",
    complete: "from-green-500 to-emerald-500",
  };

  const safeIndex = Math.min(currentIndex, chunks.length - 1);
  const displayIndex = safeIndex + 1;
  const progressPercent = Math.min(100, Math.round((displayIndex / chunks.length) * 100));

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-center gap-3">
        <motion.div
          className={`h-3 w-3 rounded-full bg-gradient-to-r ${stageColors[stage]}`}
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <span className="text-base font-medium text-gray-300">
          {stageLabels[stage]}
        </span>
      </div>

      <div className="relative">
        <div className="h-3 overflow-hidden rounded-full bg-gray-800 border border-gray-700">
          <motion.div
            className={`h-full bg-gradient-to-r ${stageColors[stage]}`}
            initial={{ width: "0%" }}
            animate={{
              width: `${stage === "complete" ? 100 : progressPercent}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm font-mono text-gray-400">
        <span>Chunk {displayIndex} of {chunks.length}</span>
        <span className="font-bold text-cyan-400">{progressPercent}%</span>
      </div>

      {stage !== "complete" && chunks[safeIndex] && (
        <motion.div
          key={safeIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-cyan-400">
              Processing Chunk #{displayIndex}
            </span>
            <motion.span
              className="text-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ●
            </motion.span>
          </div>
          <p className="text-sm text-gray-400 line-clamp-2">
            {chunks[safeIndex].substring(0, 100)}...
          </p>
        </motion.div>
      )}
    </div>
  );
}
