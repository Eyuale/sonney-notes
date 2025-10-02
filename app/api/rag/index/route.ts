// API endpoint for indexing PDF documents into vector store
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { presignGetUrl } from '@/lib/s3';
import { processDocumentForRAG } from '@/lib/rag-document-processor';
import { addDocumentsToVectorStore, isChromaAvailable } from '@/lib/rag-vector-store';
import { getDb } from '@/lib/mongodb';

/**
 * POST /api/rag/index
 * Index a PDF document for RAG querying
 * 
 * Body: { objectKey: string, filename: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getAuthSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string }).id || session.user.email || 'anonymous';

    // Check if Chroma is available
    const chromaAvailable = await isChromaAvailable();
    if (!chromaAvailable) {
      return NextResponse.json(
        { 
          error: 'Vector store not available',
          message: 'Please ensure Chroma DB is running on http://localhost:8000'
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { objectKey, filename } = body;

    if (!objectKey || !filename) {
      return NextResponse.json(
        { error: 'Missing required fields: objectKey and filename' },
        { status: 400 }
      );
    }

    // Download PDF from S3
    const url = await presignGetUrl({ key: objectKey });
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to download PDF from storage' },
        { status: 500 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process document into chunks (supports PDF, DOCX, TXT, MD)
    const processed = await processDocumentForRAG(buffer, filename);

    if (processed.chunks.length === 0) {
      return NextResponse.json(
        { error: 'No content could be extracted from the PDF' },
        { status: 400 }
      );
    }

    // Add chunks to vector store
    const result = await addDocumentsToVectorStore(
      userId,
      processed.chunks,
      {
        objectKey,
        filename,
        uploadedAt: new Date().toISOString(),
      }
    );

    // Store indexing record in MongoDB
    try {
      const db = await getDb();
      const indexedDocs = db.collection('indexed_documents');
      await indexedDocs.insertOne({
        userId,
        filename,
        objectKey,
        chunkCount: processed.chunks.length,
        collectionName: result.collectionName,
        indexedAt: new Date(),
      });
    } catch (dbError) {
      console.error('Failed to store indexing record:', dbError);
      // Non-fatal - indexing succeeded even if we couldn't record it
    }

    return NextResponse.json({
      success: true,
      filename,
      chunksIndexed: result.count,
      collectionName: result.collectionName,
      message: `Successfully indexed ${result.count} chunks from ${filename}`,
    });

  } catch (error: unknown) {
    console.error('Error indexing document:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to index document for RAG',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rag/index
 * Get list of indexed documents for the current user
 */
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string }).id || session.user.email || 'anonymous';

    const db = await getDb();
    const indexedDocs = db.collection('indexed_documents');
    
    const documents = await indexedDocs
      .find({ userId })
      .sort({ indexedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc._id.toString(),
        filename: doc.filename,
        chunkCount: doc.chunkCount,
        indexedAt: doc.indexedAt,
      })),
    });

  } catch (error: unknown) {
    console.error('Error fetching indexed documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

