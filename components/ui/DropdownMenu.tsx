"use client";

import { useEffect, useRef, useState } from "react";

export default function DropdownMenu({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("mousedown", handleClick);
    }

    return () => {
      window.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>

      {open && (
        <div
          className="absolute right-0 top-full z-[9999] mt-2 min-w-[200px] rounded-xl border border-white/10 bg-[#0f1720]/95 backdrop-blur-xl shadow-2xl overflow-visible"
        >
          {children}
        </div>
      )}
    </div>
  );
}
