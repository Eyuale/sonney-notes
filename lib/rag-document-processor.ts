// RAG Document Processor - Handles document processing and chunking for vector storage
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { extractTextFromPdfBuffer } from './pdf-extract';

export interface ProcessedDocument {
  chunks: Document[];
  metadata: {
    filename: string;
    totalChunks: number;
    processedAt: Date;
    documentType: string;
  };
}

/**
 * Extract text from DOCX buffer
 */
async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX file');
  }
}

/**
 * Extract text from any supported document buffer
 */
async function extractTextFromDocument(
  buffer: Buffer,
  filename: string
): Promise<{ text: string; type: string }> {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.endsWith('.pdf')) {
    const text = await extractTextFromPdfBuffer(buffer);
    return { text, type: 'pdf' };
  } else if (lowerFilename.endsWith('.docx')) {
    const text = await extractTextFromDocxBuffer(buffer);
    return { text, type: 'docx' };
  } else if (lowerFilename.endsWith('.txt')) {
    const text = buffer.toString('utf-8');
    return { text, type: 'txt' };
  } else if (lowerFilename.endsWith('.md')) {
    const text = buffer.toString('utf-8');
    return { text, type: 'markdown' };
  } else {
    throw new Error(`Unsupported file type: ${filename}`);
  }
}

/**
 * Process a document buffer into chunks suitable for vector storage
 * @param buffer - Document file buffer
 * @param filename - Original filename
 * @param options - Processing options
 */
export async function processDocumentForRAG(
  buffer: Buffer,
  filename: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
  } = {}
): Promise<ProcessedDocument> {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separators = ['\n\n', '\n', '. ', ' ', ''],
  } = options;

  // Extract text from document
  const { text, type } = await extractTextFromDocument(buffer, filename);

  if (!text || text.length === 0) {
    throw new Error(`No text could be extracted from ${filename}`);
  }

  // Create text splitter with LangChain
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators,
  });

  // Split text into chunks
  const chunks = await textSplitter.createDocuments(
    [text],
    [{ source: filename, type, documentType: type }]
  );

  return {
    chunks,
    metadata: {
      filename,
      totalChunks: chunks.length,
      processedAt: new Date(),
      documentType: type,
    },
  };
}

/**
 * Legacy alias for backward compatibility
 */
export async function processPdfForRAG(
  buffer: Buffer,
  filename: string,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
  }
): Promise<ProcessedDocument> {
  return processDocumentForRAG(buffer, filename, options);
}

/**
 * Process multiple documents in batch
 */
export async function processDocumentBatch(
  files: Array<{ buffer: Buffer; filename: string }>
): Promise<ProcessedDocument[]> {
  const results = await Promise.all(
    files.map((file) => processDocumentForRAG(file.buffer, file.filename))
  );
  return results;
}

/**
 * Extract metadata from processed chunks for storage
 */
export function extractChunkMetadata(chunk: Document): Record<string, unknown> {
  return {
    source: chunk.metadata.source || 'unknown',
    type: chunk.metadata.type || 'unknown',
    chunkIndex: chunk.metadata.chunkIndex,
    pageContent: chunk.pageContent,
  };
}

