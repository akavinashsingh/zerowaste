"use client";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, useState } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({ label, error, icon, className, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(props.value);
  const floated = focused || hasValue;

  return (
    <div className="relative">
      <div
        className={cn(
          "relative flex items-center rounded-xl border bg-white transition-all",
          error
            ? "border-red-400 ring-2 ring-red-100"
            : focused
            ? "border-green-500 ring-2 ring-green-100"
            : "border-slate-200 hover:border-slate-300"
        )}
      >
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholder=" "
          className={cn(
            "peer w-full rounded-xl bg-transparent px-4 py-4 text-sm text-slate-900 outline-none transition-all placeholder:text-transparent",
            icon && "pl-10",
            className
          )}
        />
        <label
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-all duration-150",
            icon && "left-10",
            floated
              ? "-translate-y-[1.7rem] scale-90 font-medium text-green-600"
              : "text-slate-400"
          )}
        >
          {label}
        </label>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
