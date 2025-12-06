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
        <div className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
            <div className="h-32 bg-secondary/30 flex items-center justify-center">
                {/* Placeholder for cover image */}
                <span className="text-4xl">📚</span>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-card-foreground line-clamp-1">{listing.title}</h3>
                    <StarRating value={listing.averageRating || 0} ratingCount={listing.ratingCount || 0} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mb-3">by {listing.ownerId}</p>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">{listing.description}</p>

                <Link
                    href={viewLink}
                    className="w-full block text-center bg-primary text-primary-foreground font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    View Notes
                </Link>
            </div>
        </div>
    );
}
