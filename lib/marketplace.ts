import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";

export interface MarketplaceListing {
    _id?: ObjectId;
    lessonId: string;
    ownerId: string;
    title: string;
    description: string;
    tags: string[];
    priceCents: number;
    currency: string;
    coverImageKey?: string;
    publishedAt: Date;
    salesCount: number;
    rating?: number;
    visibility: 'public' | 'unlisted' | 'private';
    averageRating: number;
    ratingCount: number;
    updatedAt: Date;
}

export interface Rating {
    _id?: ObjectId;
    userId: string;
    listingId: ObjectId;
    ratingValue: number; // 1-5
    createdAt: Date;
}

export interface Purchase {
    _id?: ObjectId;
    buyerId: string;
    listingId: ObjectId | string;
    lessonId: ObjectId | string;
    amountCents: number;
    currency: string;
    stripeSessionId: string;
    status: 'pending' | 'completed' | 'refunded';
    createdAt: Date;
}

// Helpers

export async function createListing(listing: Omit<MarketplaceListing, '_id' | 'publishedAt' | 'salesCount' | 'updatedAt'>) {
    const db = await getDb();
    const newListing = {
        ...listing,
        lessonId: listing.lessonId, // Don't cast to ObjectId, use slug
        publishedAt: new Date(),
        salesCount: 0,
        averageRating: 0,
        ratingCount: 0,
        updatedAt: new Date(),
    };
    const res = await db.collection<MarketplaceListing>('marketplace_listings').insertOne(newListing as any);
    return res.insertedId;
}

export async function getListings(filter: any = {}, sort: any = { publishedAt: -1 }, limit = 20) {
    const db = await getDb();
    const query: any = { ...filter };

    // Handle special search filter
    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        query.$or = [
            { title: searchRegex },
            { description: searchRegex },
            { tags: searchRegex },
            { ownerId: searchRegex }
        ];
        delete query.search;
    }

    // Default sort: Rating desc, then Published date desc
    const sortConfig = sort.averageRating ? sort : { averageRating: -1, publishedAt: -1 };

    return db.collection<MarketplaceListing>('marketplace_listings')
        .find(query)
        .sort(sortConfig)
        .limit(limit)
        .toArray();
}

export async function getListingById(id: string) {
    const db = await getDb();
    return db.collection<MarketplaceListing>('marketplace_listings').findOne({ _id: new ObjectId(id) });
}

export async function rateListing(userId: string, listingId: string, ratingValue: number) {
    const db = await getDb();
    const lId = new ObjectId(listingId);

    // 1. Upsert rating
    await db.collection<Rating>('ratings').updateOne(
        { userId, listingId: lId },
        { $set: { ratingValue, createdAt: new Date() } },
        { upsert: true }
    );

    // 2. Aggregate average
    const ratings = await db.collection<Rating>('ratings').find({ listingId: lId }).toArray();
    const total = ratings.reduce((sum, r) => sum + r.ratingValue, 0);
    const avg = ratings.length > 0 ? total / ratings.length : 0;

    // 3. Update listing
    await db.collection<MarketplaceListing>('marketplace_listings').updateOne(
        { _id: lId },
        { $set: { averageRating: avg, ratingCount: ratings.length } }
    );

    return { averageRating: avg, ratingCount: ratings.length };
}

export async function createPurchase(purchase: Omit<Purchase, '_id' | 'createdAt'>) {
    const db = await getDb();
    const newPurchase = {
        ...purchase,
        listingId: new ObjectId(purchase.listingId),
        lessonId: purchase.lessonId, // Slug
        createdAt: new Date(),
    };
    const res = await db.collection<Purchase>('purchases').insertOne(newPurchase as any);
    return res.insertedId;
}

export async function completePurchase(stripeSessionId: string) {
    const db = await getDb();
    const res = await db.collection<Purchase>('purchases').findOneAndUpdate(
        { stripeSessionId },
        { $set: { status: 'completed' } },
        { returnDocument: 'after' }
    );
    if (res && res.listingId) {
        // Increment sales count
        await db.collection('marketplace_listings').updateOne(
            { _id: new ObjectId(res.listingId) },
            { $inc: { salesCount: 1 } }
        );
    }
    return res;
}

export async function verifyPurchase(buyerId: string, lessonId: string) {
    const db = await getDb();
    const purchase = await db.collection<Purchase>('purchases').findOne({
        buyerId,
        lessonId: lessonId,
        status: 'completed'
    });
    return !!purchase;
}
