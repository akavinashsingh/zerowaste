import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  variant?: "line" | "card" | "circle";
  count?: number;
}

function SkeletonBase({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-shimmer rounded-lg", className)} />
  );
}

export default function Skeleton({ className, variant = "line", count = 1 }: Props) {
  if (variant === "circle") {
    return <SkeletonBase className={cn("h-10 w-10 rounded-full", className)} />;
  }

  if (variant === "card") {
    return (
      <div className={cn("rounded-2xl border border-slate-100 bg-white p-5 shadow-sm", className)}>
        <div className="flex items-start gap-3">
          <SkeletonBase className="h-10 w-10 flex-shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-4 w-3/4" />
            <SkeletonBase className="h-3 w-1/2" />
          </div>
        </div>
        <SkeletonBase className="mt-4 h-24 w-full rounded-xl" />
        <div className="mt-3 flex gap-2">
          <SkeletonBase className="h-7 w-20 rounded-full" />
          <SkeletonBase className="h-7 w-16 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBase key={i} className={cn("h-4 w-full", i === count - 1 && "w-3/4")} />
      ))}
    </div>
  );
}
