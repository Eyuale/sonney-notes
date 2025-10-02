// RAG Vector Store - Manages embeddings and vector storage using Chroma
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from 'langchain/document';
import { ChromaClient } from 'chromadb';
import { LocalEmbeddings } from './rag-embeddings';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

/**
 * Get or create embeddings instance
 * Uses LOCAL embeddings (runs on your computer - completely OFFLINE and FREE!)
 */
function getEmbeddings() {
  console.log('💻 Using LOCAL embeddings (offline, no API needed)');
  
  return new LocalEmbeddings({
    modelName: 'Xenova/all-MiniLM-L6-v2', // Runs locally, no API calls!
  });
}

/**
 * Create a vector store for a user's documents
 * @param userId - User identifier
 * @param collectionName - Optional collection name (defaults to user-specific)
 */
export async function createVectorStore(
  userId: string,
  collectionName?: string
): Promise<Chroma> {
  const embeddings = getEmbeddings();
  const collection = collectionName || `user_${userId}_docs`;

  try {
    const vectorStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: collection,
      url: CHROMA_URL,
    });
    return vectorStore;
  } catch (error) {
    // Collection doesn't exist, create new one
    const vectorStore = new Chroma(embeddings, {
      collectionName: collection,
      url: CHROMA_URL,
    });
    return vectorStore;
  }
}

/**
 * Add documents to vector store
 */
export async function addDocumentsToVectorStore(
  userId: string,
  documents: Document[],
  metadata?: Record<string, unknown>
): Promise<{ count: number; collectionName: string }> {
  const vectorStore = await createVectorStore(userId);
  
  // Add metadata to each document
  const docsWithMetadata = documents.map((doc) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      ...metadata,
      userId,
      indexedAt: new Date().toISOString(),
    },
  }));

  await vectorStore.addDocuments(docsWithMetadata);

  return {
    count: documents.length,
    collectionName: `user_${userId}_docs`,
  };
}

/**
 * Search for relevant documents
 */
export async function searchDocuments(
  userId: string,
  query: string,
  options: {
    k?: number; // Number of results to return
    filter?: Record<string, unknown>;
  } = {}
): Promise<Document[]> {
  const { k = 4, filter } = options;
  const vectorStore = await createVectorStore(userId);

  const results = await vectorStore.similaritySearch(query, k, filter);
  return results;
}

/**
 * Search with relevance scores
 */
export async function searchDocumentsWithScore(
  userId: string,
  query: string,
  options: {
    k?: number;
    filter?: Record<string, unknown>;
    scoreThreshold?: number; // Minimum similarity score (0-1)
  } = {}
): Promise<Array<{ document: Document; score: number }>> {
  const { k = 4, filter, scoreThreshold = 0.5 } = options;
  const vectorStore = await createVectorStore(userId);

  const results = await vectorStore.similaritySearchWithScore(query, k, filter);
  
  // Filter by score threshold and format results
  return results
    .filter(([, score]) => score >= scoreThreshold)
    .map(([document, score]) => ({ document, score }));
}

/**
 * Delete a collection (useful for cleanup)
 */
export async function deleteUserCollection(userId: string): Promise<void> {
  try {
    const client = new ChromaClient({ path: CHROMA_URL });
    await client.deleteCollection({ name: `user_${userId}_docs` });
  } catch (error) {
    console.error('Error deleting collection:', error);
    // Non-fatal - collection might not exist
  }
}

/**
 * Check if Chroma server is available
 */
export async function isChromaAvailable(): Promise<boolean> {
  try {
    const client = new ChromaClient({ path: CHROMA_URL });
    await client.heartbeat();
    return true;
  } catch (error) {
    console.error('Chroma server not available:', error);
    return false;
  }
}

