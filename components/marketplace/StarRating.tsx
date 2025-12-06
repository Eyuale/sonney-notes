"use client";

import { useState } from "react";
// import { StarIcon } from "lucide-react"; // Removing unused import
// Actually, I don't know if lucide is installed. I should check package.json or use SVG.
// Using inline SVG to be safe and dependency-free for this component.

interface StarRatingProps {
    value?: number; // 0 to 5
    ratingCount?: number;
    interactive?: boolean; // If true, user can click
    onChange?: (rating: number) => void;
    size?: "sm" | "md" | "lg";
}

export const StarRating = ({ value = 0, ratingCount, interactive = false, onChange, size = "md" }: StarRatingProps) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    const displayValue = hoverValue ?? value;

    // Ensure displayValue is treated as a number
    const numericDisplayValue = Number(displayValue) || 0;

    // Round to nearest half or integer if needed. For simplicity, integer stars for display in this iteration unless decimal needed.
    // Let's do full stars for simplicity of "filled" logic.

    const stars = [1, 2, 3, 4, 5];

    const sizeClasses = {
        sm: "w-3 h-3",
        md: "w-4 h-4",
        lg: "w-6 h-6"
    };

    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {stars.map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={!interactive}
                        className={`transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                        onMouseEnter={() => interactive && setHoverValue(star)}
                        onMouseLeave={() => interactive && setHoverValue(null)}
                        onClick={() => interactive && onChange?.(star)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={star <= numericDisplayValue ? "#fbbf24" : "none"} // Amber-400 for filled
                            stroke={star <= numericDisplayValue ? "#fbbf24" : "#d1d5db"} // Gray-300 for empty stroke
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={sizeClasses[size]}
                        >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </button>
                ))}
            </div>
            {ratingCount !== undefined && (
                <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-sm'} ml-1`}>
                    ({ratingCount})
                </span>
            )}
        </div>
    );
};
