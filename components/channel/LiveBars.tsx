"use client";

export default function LiveBars({ active }: { active: boolean }) {
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/90"
          style={{
            height: active ? `${10 + ((i * 7) % 18)}px` : "6px",
            animation: active
              ? `channelLiveBar 0.8s ease-in-out ${i * 0.1}s infinite`
              : "none",
          }}
        />
      ))}

      <style jsx>{`
        @keyframes channelLiveBar {
          0%, 100% {
            transform: scaleY(0.45);
            opacity: 0.55;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
