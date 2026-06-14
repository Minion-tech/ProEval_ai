"use client";

import { RoadmapItem } from "@/lib/feedback-parser";
import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

export function RoadmapTimeline({ items, selectedIndex, onSelect }: RoadmapTimelineProps) {
  if (!items || items.length === 0) return null;

  // Render a horizontal, scrollable timeline suitable for compact bottom placement
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-6 items-start py-4 px-2 min-w-max">
        {items.map((item, index) => {
          const isSelected = selectedIndex === index;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="flex-shrink-0 w-64"
            >
              <button
                type="button"
                onClick={() => onSelect?.(index)}
                className={`w-full text-left rounded-xl border p-4 shadow-sm transition ${isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-300"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">{item.period}</span>
                  {index === 0 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-3 h-3 text-slate-300" />}
                </div>
                <h4 className="text-slate-900 font-semibold text-sm mb-1 leading-snug">{item.title}</h4>
                {item.description && <p className="text-slate-600 text-xs leading-relaxed">{item.description}</p>}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
