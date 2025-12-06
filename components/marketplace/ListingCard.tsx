"use client";

import Link from "next/link";
import { useState } from "react";
import { StarRating } from "./StarRating";

interface Listing {
    _id: string;
    title: string;
    description: string;
    priceCents: number;
    ownerId: string;
    lessonId: string;
    averageRating?: number;
    ratingCount?: number;
}

export const ListingCard = ({ listing }: { listing: Listing }) => {
    const viewLink = `/marketplace/view/${listing.lessonId}`; // Using lessonId for view since it's cleaner, or listing._id

    return (
        <div className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
            <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                {/* Placeholder for cover image */}
                <span className="text-4xl">📚</span>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{listing.title}</h3>
                    <StarRating value={listing.averageRating || 0} ratingCount={listing.ratingCount || 0} size="sm" />
                </div>
                <p className="text-xs text-gray-500 mb-3">by {listing.ownerId}</p>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">{listing.description}</p>

                <Link
                    href={viewLink}
                    className="w-full block text-center bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                >
                    View Notes
                </Link>
            </div>
        </div>
    );
}
