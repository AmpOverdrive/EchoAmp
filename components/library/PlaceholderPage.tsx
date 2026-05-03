import type { ComponentType } from "react";

type PlaceholderPageProps = {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

export default function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: PlaceholderPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1118] p-8 pb-32 text-white">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 text-blue-300">
          <Icon size={34} />
        </div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
