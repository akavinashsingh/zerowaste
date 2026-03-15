import { cn } from "@/lib/utils";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="mb-1 font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mb-4 max-w-xs text-sm text-slate-400">{description}</p>
      )}
      {action}
    </div>
  );
}
