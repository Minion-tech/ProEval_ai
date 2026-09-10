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
    <div className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3 py-1">
        {items.map((item, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect?.(index)}
              className={[
                "w-56 shrink-0 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-card hover:border-border hover:bg-muted/20 hover:shadow-sm",
              ].join(" ")}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isSelected ? "text-background/60" : "text-muted-foreground"}`}>
                {item.period}
              </p>
              <p className={`mt-2 line-clamp-2 text-[13.5px] font-semibold leading-snug ${isSelected ? "text-background" : "text-foreground"}`}>{item.title}</p>
              {item.description && (
                <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${isSelected ? "text-background/60" : "text-muted-foreground"}`}>
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
