// RAG Service - Combines retrieval and generation using LangChain and Gemini
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from 'langchain/document';
import { searchDocuments, searchDocumentsWithScore } from './rag-vector-store';

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-pro';

// Debug logging to help troubleshoot
console.log('💻 Using LOCAL embeddings - runs offline on your computer, no API needed!');
console.log('🔍 Checking Gemini API key...');
console.log('   - API key exists:', !!GOOGLE_API_KEY);
console.log('   - API key length:', GOOGLE_API_KEY?.length || 0);
console.log('   - API key preview:', GOOGLE_API_KEY?.substring(0, 15) + '...' || 'MISSING');

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not set - RAG service will not work');
  console.error('   Get your free key from: https://makersuite.google.com/app/apikey');
}

/**
 * RAG prompt template for answering questions based on context
 */
const RAG_PROMPT_TEMPLATE = `You are a helpful AI assistant embedded in a lesson builder app with TWO panels: a CHAT PANEL and a CANVAS/EDITOR (Tiptap editor).

IMPORTANT CONTEXT:
- When users say "canvas", "canva", or "editor", they are referring to the Tiptap editor in THIS app, NOT the external Canva.com website
- You DO have the ability to display content on the canvas/editor - never say you cannot access it
- The canvas/editor is part of this application and is where document content should be displayed

Context from the user's documents:
{context}

Question: {question}

CRITICAL INSTRUCTIONS - SINGLE SOURCE OF TRUTH:
- The uploaded documents are the SINGLE SOURCE OF TRUTH
- Answer EXCLUSIVELY using information from the context above
- DO NOT add any information from your training data or general knowledge
- DO NOT make assumptions or inferences beyond what is explicitly stated in the documents
- If the context doesn't contain the information needed to answer, explicitly state: "This information is not available in your uploaded document(s)."
- DO NOT say "based on general knowledge" or reference external sources
- Be specific and cite relevant parts of the context when possible
- If asked about a specific unit, chapter, or section, focus on that part of the context
- Your role is to extract and present information FROM THE DOCUMENTS ONLY, not to supplement it

FOR SUMMARIES AND OVERVIEWS:
When asked to summarize, provide an overview, or display content on the canvas/editor:
- Start your response with "EDITOR_CONTENT:" followed by well-formatted Markdown
- Be COMPREHENSIVE and DETAILED - extract ALL important information from the context
- Include ALL key concepts, definitions, formulas, data points, and specific facts
- Organize with clear hierarchical structure (# main title, ## sections, ### subsections)
- Preserve ALL important details:
  * Numerical data, statistics, measurements, and percentages
  * Definitions and technical terminology
  * Formulas, equations, and mathematical expressions
  * Complete lists, steps, and procedures
  * Tables and structured data (use markdown table format)
  * Examples, case studies, and illustrations
  * Dates, names, locations, and specific references
- Use rich formatting:
  * **Bold** for key terms and critical concepts
  * *Italic* for emphasis and important points
  * Code blocks (backticks) for technical terms, variables, or code
  * > Blockquotes for important quotes or definitions
  * Proper lists (bullet points and numbered lists)
- Maintain logical flow and accurate representation of the source
- For extensive content, create multiple detailed sections rather than condensing
- DO NOT skip or abbreviate important information

FOR OTHER QUESTIONS:
Format your answer in clear, well-structured Markdown for the chat panel

Answer:`;

/**
 * Simple RAG prompt for direct context-based answers
 */
const SIMPLE_RAG_PROMPT_TEMPLATE = `Based on the following context from the user's documents, answer the question.

Context:
{context}

Question: {question}

CRITICAL: The uploaded documents are the SINGLE SOURCE OF TRUTH. Answer using ONLY information from the context above. DO NOT add information from your training data or general knowledge. If the information is not in the context, say "This information is not available in your uploaded document(s)."

Answer:`;

/**
 * Format retrieved documents into context string
 */
function formatDocumentsAsContext(documents: Document[]): string {
  return documents
    .map((doc, idx) => {
      const source = doc.metadata.source || 'Unknown source';
      return `[Document ${idx + 1} - ${source}]\n${doc.pageContent}\n`;
    })
    .join('\n---\n\n');
}

/**
 * Create a RAG chain for question answering
 */
async function createRAGChain() {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY.trim() === '') {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for answer generation. Get one from: https://makersuite.google.com/app/apikey');
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey: GOOGLE_API_KEY,
    model: MODEL_NAME,
    temperature: 0.1, // Very low temperature for maximum factual accuracy from documents
  });

  const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

  const chain = RunnableSequence.from([
    prompt,
    model,
    new StringOutputParser(),
  ]);

  return chain;
}

/**
 * Answer a question using RAG (Retrieval-Augmented Generation)
 */
export async function answerQuestionWithRAG(
  userId: string,
  question: string,
  options: {
    k?: number; // Number of documents to retrieve
    includeScores?: boolean;
    filter?: Record<string, unknown>;
    temperature?: number;
  } = {}
): Promise<{
  answer: string;
  sources: Document[];
  scores?: number[];
}> {
  // Use more chunks for better coverage, especially for summaries
  const { k = 10, includeScores = false, filter } = options;

  // Retrieve relevant documents
  let sources: Document[];
  let scores: number[] | undefined;

  if (includeScores) {
    const results = await searchDocumentsWithScore(userId, question, {
      k,
      filter,
    });
    sources = results.map((r) => r.document);
    scores = results.map((r) => r.score);
  } else {
    sources = await searchDocuments(userId, question, { k, filter });
  }

  if (sources.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your documents to answer this question. Please make sure you've uploaded the relevant PDF documents.",
      sources: [],
      scores,
    };
  }

  // Format context from retrieved documents
  const context = formatDocumentsAsContext(sources);

  // Create and run RAG chain
  const chain = await createRAGChain();
  const answer = await chain.invoke({
    context,
    question,
  });

  return {
    answer,
    sources,
    scores,
  };
}

/**
 * Answer a question with a simpler prompt (less verbose)
 */
export async function answerQuestionSimple(
  userId: string,
  question: string,
  options: { k?: number } = {}
): Promise<string> {
  const { k = 10 } = options;

  const sources = await searchDocuments(userId, question, { k });

  if (sources.length === 0) {
    return "I don't have any documents to reference. Please upload PDF documents first.";
  }

  const context = formatDocumentsAsContext(sources);

  const model = new ChatGoogleGenerativeAI({
    apiKey: GOOGLE_API_KEY!,
    model: MODEL_NAME,
    temperature: 0.1, // Very low temperature for maximum factual accuracy from documents
  });

  const prompt = PromptTemplate.fromTemplate(SIMPLE_RAG_PROMPT_TEMPLATE);
  const chain = RunnableSequence.from([
    prompt,
    model,
    new StringOutputParser(),
  ]);

  const answer = await chain.invoke({ context, question });
  return answer;
}

/**
 * Check if a question seems to be about document content
 * (heuristic to decide whether to use RAG)
 */
export function shouldUseRAG(question: string): boolean {
  const ragKeywords = [
    'according to',
    'in the document',
    'in my pdf',
    'from the file',
    'what does',
    'explain',
    'summarize',
    'summary',
    'overview',
    'tell me about',
    'attachment',
    'my file',
    'uploaded',
    'unit',
    'chapter',
    'section',
    'page',
    'lecture',
    'notes',
    'textbook',
  ];

  const lowerQuestion = question.toLowerCase();
  return ragKeywords.some((keyword) => lowerQuestion.includes(keyword));
}

/**
 * Get a summary of available documents for a user
 */
export async function getDocumentSummary(
  userId: string
): Promise<{
  documentCount: number;
  sources: string[];
}> {
  try {
    // Search with a broad query to get all documents
    const docs = await searchDocuments(userId, 'summary overview content', {
      k: 100,
    });

    const sources = Array.from(
      new Set(docs.map((doc) => doc.metadata.source as string))
    );

    return {
      documentCount: docs.length,
      sources,
    };
  } catch {
    return {
      documentCount: 0,
      sources: [],
    };
  }
}

