import { getListings } from "@/lib/marketplace";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { SearchInput } from "@/components/marketplace/SearchInput";

export const dynamic = "force-dynamic";

// Server Component
export default async function MarketplacePage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
    const listings = await getListings({ visibility: 'public', search }); // search is passed to lib

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-4xl font-extrabold text-center mb-2 text-gray-900">Lesson Marketplace</h1>
            <p className="text-center text-gray-500 mb-8">Discover and share knowledge with the community.</p>

            <SearchInput />

            {listings.length === 0 ? (
                <div className="text-center text-gray-400 mt-12">
                    <p>No lessons found matching your criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((item: any) => (
                        <ListingCard key={item._id.toString()} listing={{ ...item, _id: item._id.toString(), lessonId: item.lessonId.toString() }} />
                    ))}
                </div>
            )}
        </div>
    );
}
