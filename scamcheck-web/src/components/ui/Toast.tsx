import * as React from "react"
import { cn } from "@/lib/utils"

const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'error' }
>(({ className, variant = 'default', ...props }, ref) => {
    let bgClass = "bg-slate-900";
    if (variant === 'success') bgClass = "bg-green-600";
    if (variant === 'error') bgClass = "bg-red-600";

  return (
    <div
      ref={ref}
      className={cn(
        "fixed bottom-8 left-1/2 transform -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 z-50 animate-in fade-in slide-in-from-bottom-5",
        bgClass,
        className
      )}
      {...props}
    />
  )
})
Toast.displayName = "Toast"

export { Toast }
