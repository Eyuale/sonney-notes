import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";

export interface StudySession {
    title: string;
    resources: string[]; // Links or note IDs
    estimatedTime: string; // e.g. "2h"
    status: 'pending' | 'completed';
    scheduledAt?: Date;
}

export interface StudyTopic {
    name: string;
    sessions: StudySession[];
}

export interface StudyPlan {
    _id?: ObjectId;
    userId: string; // Owner
    planId: string; // Slug or UUID
    title: string;
    topics: StudyTopic[];
    visibility: 'private' | 'public';
    // Marketplace fields
    averageRating?: number;
    ratingCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

const COLLECTION = 'study_plans';

export async function createStudyPlan(plan: Omit<StudyPlan, '_id' | 'createdAt' | 'updatedAt' | 'averageRating' | 'ratingCount'>) {
    const db = await getDb();
    const newPlan = {
        ...plan,
        averageRating: 0,
        ratingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const res = await db.collection<StudyPlan>(COLLECTION).insertOne(newPlan as any);
    return res.insertedId;
}

export async function getStudyPlans(filter: any = {}) {
    const db = await getDb();
    return db.collection<StudyPlan>(COLLECTION).find(filter).sort({ createdAt: -1 }).toArray();
}

export async function getStudyPlanById(id: string) {
    const db = await getDb();
    // Try by ObjectId first, then by slug planId
    if (ObjectId.isValid(id)) {
        return db.collection<StudyPlan>(COLLECTION).findOne({ _id: new ObjectId(id) });
    }
    return db.collection<StudyPlan>(COLLECTION).findOne({ planId: id });
}

export async function updateStudyPlan(id: string, updates: Partial<StudyPlan>) {
    const db = await getDb();
    delete updates._id; // Safety
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { planId: id };

    return db.collection<StudyPlan>(COLLECTION).updateOne(
        query,
        {
            $set: {
                ...updates,
                updatedAt: new Date()
            }
        }
    );
}

export async function deleteStudyPlan(id: string) {
    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { planId: id };
    return db.collection<StudyPlan>(COLLECTION).deleteOne(query);
}
