# Changelog

## RAG Implementation v2.0 - October 2025

### Major Changes

#### Complete RAG Refactor
- **Removed old buggy PDF handling** - Eliminated the old SSOT/unit extraction approach that was unreliable
- **Implemented RAG-first architecture** - All document queries now use vector search and retrieval-augmented generation
- **Multi-format support** - Added support for DOCX, TXT, and Markdown files in addition to PDFs

#### New Features
1. **Multi-format Document Processing**
   - PDF support (existing, improved)
   - DOCX support (new) using mammoth library
   - TXT support (new)
   - Markdown support (new)

2. **Simplified Chat Flow**
   - Auto-detection of document attachments
   - Automatic indexing on upload
   - RAG automatically activates for document-related questions
   - Clean fallback to standard Gemini when RAG not needed

3. **Better User Experience**
   - Clear source citations: "📚 *Based on X section(s) from your uploaded document(s)*"
   - Better console logging for debugging
   - More comprehensive chunking (retrieves top 8 chunks instead of 4-6)
   - Improved error handling and user feedback

#### Technical Improvements
- Refactored `lib/rag-document-processor.ts` to support multiple formats
- Added `processDocumentForRAG()` function that auto-detects file type
- Cleaned up chat API (`app/api/chat/route.ts`) - removed 100+ lines of old buggy code
- Better separation of concerns: indexing → retrieval → generation
- Improved metadata tracking (document type, content type, etc.)

### Breaking Changes
- Old SSOT/unit extraction methods are no longer used
- PDF attachments are now indexed into vector DB instead of inline text extraction
- `processPdfForRAG` is now a legacy alias for `processDocumentForRAG`

### Migration Guide

If upgrading from the old system:

1. **Environment**: No changes needed - same environment variables
2. **API**: Existing `/api/chat` endpoint works the same from client perspective
3. **Data**: Old chats remain intact; new chats use RAG-based approach
4. **Dependencies**: New dependency added: `mammoth` (for DOCX support)

### Bug Fixes
- Fixed unreliable text extraction from complex PDFs
- Fixed inconsistent handling of multi-page documents
- Fixed issues with unit/chapter detection in documents
- Improved handling of scanned/image-based PDFs

### Performance
- Faster document processing (parallel chunk embedding)
- Better retrieval accuracy (8 chunks vs 4-6)
- Reduced memory usage (streaming document processing)

### Documentation Updates
- Updated README with multi-format support
- Enhanced quick-start guide with troubleshooting
- Added supported formats section
- Updated example interactions

## Previous Version - September 2025

### Initial RAG Implementation
- Basic PDF support with LangChain
- Integration with Google Gemini embeddings
- Chroma DB vector store
- Manual and auto-indexing options

