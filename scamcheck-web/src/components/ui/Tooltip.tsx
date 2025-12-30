import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
        <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
            {children}
            {isVisible && (
                 <div className="absolute z-10 w-64 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-sm -top-10 left-1/2 transform -translate-x-1/2">
                    {content}
                    <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-slate-900"></div>
                </div>
            )}
        </div>
    )
}
