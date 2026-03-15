import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "error" | "info" | "default";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  default: "bg-slate-100 text-slate-700 border-slate-200",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

interface Props {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export default function Badge({
  variant = "default",
  size = "sm",
  children,
  className,
  pulse = false,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        variantClasses[variant],
        sizeClasses[size],
        pulse && "relative",
        className
      )}
    >
      {pulse && (
        <span className="relative mr-0.5 inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
      )}
      {children}
    </span>
  );
}
