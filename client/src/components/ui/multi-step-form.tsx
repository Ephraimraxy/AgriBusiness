import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description?: string;
}

interface MultiStepFormProps {
  steps: Step[];
  currentStep: number;
  children: ReactNode;
  className?: string;
}

export function MultiStepForm({ steps, currentStep, children, className }: MultiStepFormProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber <= currentStep;
            const isCurrent = stepNumber === currentStep;
            
            return (
              <div key={index} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  )}
                >
                  {stepNumber}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-16 h-1 mx-2",
                      stepNumber < currentStep ? "bg-blue-600" : "bg-gray-300"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Labels */}
      <div className="flex justify-center">
        <div className="flex space-x-12">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber <= currentStep;
            
            return (
              <span
                key={index}
                className={cn(
                  "text-sm font-medium",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}
              >
                {step.title}
              </span>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="min-h-[400px]">
        {children}
      </div>
    </div>
  );
}
