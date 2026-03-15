import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
  description?: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export default function Stepper({ steps, currentStep, className }: Props) {
  return (
    <div className={cn("flex items-start gap-0", className)}>
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={step.label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* left connector */}
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i === 0 ? "bg-transparent" : done ? "bg-green-500" : "bg-slate-200"
                )}
              />
              {/* circle */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-2 transition-all",
                  done
                    ? "bg-green-500 text-white ring-green-500"
                    : active
                    ? "bg-white text-green-600 ring-green-500"
                    : "bg-white text-slate-400 ring-slate-200"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {/* right connector */}
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i === steps.length - 1
                    ? "bg-transparent"
                    : done
                    ? "bg-green-500"
                    : "bg-slate-200"
                )}
              />
            </div>
            <span
              className={cn(
                "mt-2 text-center text-xs font-medium",
                active ? "text-green-700" : done ? "text-slate-600" : "text-slate-400"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
