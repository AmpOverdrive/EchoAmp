"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function VirtualList<T>({
  className,
  items,
  maxHeight = 720,
  onEndReached,
  overscan = 8,
  renderItem,
  rowHeight,
  endReachedThreshold = 360,
}: {
  className?: string;
  items: T[];
  maxHeight?: number;
  onEndReached?: () => void;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  rowHeight: number;
  endReachedThreshold?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = Math.min(maxHeight, Math.max(rowHeight, items.length * rowHeight));
  const totalHeight = items.length * rowHeight;

  const windowed = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const end = Math.min(items.length, start + visibleCount);

    return { start, end, items: items.slice(start, end) };
  }, [items, overscan, rowHeight, scrollTop, viewportHeight]);

  if (items.length === 0) return null;

  return (
    <div
      className={cx("app-virtual-list", className)}
      onScroll={(event) => {
        const element = event.currentTarget;
        setScrollTop(element.scrollTop);

        if (
          onEndReached &&
          element.scrollHeight - element.scrollTop - element.clientHeight <= endReachedThreshold
        ) {
          onEndReached();
        }
      }}
      style={{ maxHeight, height: viewportHeight, overflowY: "auto" }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {windowed.items.map((item, offset) => {
          const index = windowed.start + offset;

          return (
            <div
              key={index}
              className="absolute left-0 right-0"
              style={{ height: rowHeight, top: index * rowHeight }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
