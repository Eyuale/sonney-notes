"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
// import debounce from "lodash/debounce"; // Avoiding extra deps if possible, manual debounce is fine

export const SearchInput = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(searchParams?.get("search") || "");
    const [debouncedValue, setDebouncedValue] = useState(value);

    // Debounce logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, 500);
        return () => clearTimeout(handler);
    }, [value]);

    // Update URL on debounce change
    useEffect(() => {
        const params = new URLSearchParams(searchParams?.toString());
        if (debouncedValue) {
            params.set("search", debouncedValue);
        } else {
            params.delete("search");
        }
        router.push(`?${params.toString()}`);
    }, [debouncedValue, router, searchParams]);

    return (
        <div className="w-full max-w-md mx-auto mb-8">
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Search notes by title, tag, or author..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                />
                <svg className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>
    );
};
