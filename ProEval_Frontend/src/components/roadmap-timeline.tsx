"use client";

import { RoadmapItem } from "@/lib/feedback-parser";

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

export function RoadmapTimeline({ items, selectedIndex, onSelect }: RoadmapTimelineProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3 py-2">
        {items.map((item, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect?.(index)}
              className={`w-56 shrink-0 rounded-lg border p-4 text-left transition-colors duration-200 ${
                isSelected ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted/20"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-widest ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                {item.period}
              </p>
              <p className={`mt-2 line-clamp-2 text-sm font-medium leading-tight ${isSelected ? "text-background" : "text-foreground"}`}>{item.title}</p>
              {item.description && (
                <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                  {item.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
