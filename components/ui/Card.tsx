import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = { sm: "p-4", md: "p-6", lg: "p-8" };

export default function Card({
  children,
  hover = false,
  className,
  padding = "md",
}: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        hover &&
          "transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
