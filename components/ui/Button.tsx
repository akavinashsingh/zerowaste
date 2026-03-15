import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-green-600 text-white hover:bg-green-700 border-transparent shadow-sm",
  outline:
    "bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400",
  ghost: "bg-transparent border-transparent text-slate-600 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-7 py-3.5 text-base gap-2.5",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-xl border font-semibold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon && <span className="h-4 w-4">{icon}</span>
      )}
      {children}
    </button>
  );
}
