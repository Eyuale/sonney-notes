// API endpoint for querying documents using RAG
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { answerQuestionWithRAG, shouldUseRAG } from '@/lib/rag-service';
import { isChromaAvailable } from '@/lib/rag-vector-store';

/**
 * POST /api/rag/query
 * Query indexed documents using RAG
 * 
 * Body: { question: string, k?: number, includeScores?: boolean }
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
          message: 'Please ensure Chroma DB is running on http://localhost:8000. You can start it with: docker run -p 8000:8000 chromadb/chroma'
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { question, k = 4, includeScores = false } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid question parameter' },
        { status: 400 }
      );
    }

    // Use RAG to answer the question
    const result = await answerQuestionWithRAG(userId, question, {
      k,
      includeScores,
    });

    return NextResponse.json({
      answer: result.answer,
      sourceCount: result.sources.length,
      sources: result.sources.map((doc) => ({
        content: doc.pageContent.substring(0, 200) + '...', // Preview
        source: doc.metadata.source,
        metadata: doc.metadata,
      })),
      scores: result.scores,
    });

  } catch (error: unknown) {
    console.error('Error querying with RAG:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to query documents',
      },
      { status: 500 }
    );
  }
}

