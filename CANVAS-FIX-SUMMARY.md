# Canvas/Editor Content Routing Fix

## Issues Fixed

### 1. LLM Misunderstanding "Canva"
**Problem**: When users asked to display content on "the canva" or "canvas", the LLM responded saying it cannot access external websites like Canva.com.

**Solution**: Updated system prompts to clarify that:
- The app has TWO panels: CHAT PANEL and CANVAS/EDITOR (Tiptap editor)
- "Canvas", "canva", or "editor" refers to the Tiptap editor in THIS app, NOT Canva.com
- The LLM DOES have the ability to display content on the canvas/editor

### 2. Summaries Going to Chat Instead of Editor
**Problem**: When users asked for summaries of uploaded documents, the content appeared in the chat panel instead of the editor.

**Solution**: Implemented a new response routing system:
- Added `EDITOR_CONTENT:` prefix protocol for content meant for the editor
- Created new `editor` response type alongside existing `blueprint` type
- Content with this prefix is automatically routed to the Tiptap editor

## Files Modified

### 1. `app/api/chat/route.ts`
- ✅ Updated `systemInstruction` to clarify canvas/editor context
- ✅ Added `EDITOR_CONTENT:` detection for standard Gemini responses
- ✅ Added `EDITOR_CONTENT:` detection for RAG responses
- ✅ Created new `editor` response type with proper persistence
- ✅ Fixed linter errors (const instead of let, removed unused variables)

### 2. `lib/rag-service.ts`
- ✅ Updated `RAG_PROMPT_TEMPLATE` to include canvas/editor context
- ✅ Instructed RAG to use `EDITOR_CONTENT:` prefix for summaries
- ✅ Fixed linter error (removed unused error variable)

### 3. `components/chat/ChatPanel.tsx`
- ✅ Added `markdownToNodes` import from lesson-mapper
- ✅ Added new `editor` type to `ChatAPIResponse` union
- ✅ Implemented handler for `editor` type responses
- ✅ Converts markdown content to Tiptap document format
- ✅ Routes content to editor and shows confirmation in chat

### 4. `lib/lesson-mapper.ts`
- ✅ Exported `markdownToNodes` function for use in ChatPanel

## How It Works

### Flow for Summaries/Document Content:

1. **User asks for summary** (e.g., "give me a summary on the canva")
2. **LLM processes request** using updated system prompt
3. **LLM recognizes** this is a summary/editor content request
4. **LLM responds** with `EDITOR_CONTENT:` prefix followed by markdown
5. **Backend detects** the prefix and returns `type: "editor"` response
6. **Frontend (ChatPanel)** receives the editor type
7. **Content is converted** from markdown to Tiptap nodes
8. **Editor displays** the content
9. **Chat shows** confirmation message

### Response Types:

```typescript
type ChatAPIResponse =
  | { type: "blueprint"; blueprint: LessonBlueprint; chat: string }  // For lessons
  | { type: "editor"; content: string; chat: string }                // For summaries/content
  | { role: "assistant"; content: string }                            // For chat messages
```

## Testing Scenarios

### Test 1: Summary Request with "Canva"
- **Input**: "Give me a summary of my attachment on the canva"
- **Expected**: Summary appears in the editor, not chat panel
- **Expected**: No "I cannot access Canva.com" error message

### Test 2: Summary Request with "Editor"
- **Input**: "Summarize this document in the editor"
- **Expected**: Summary appears in the editor with document source info

### Test 3: General Question
- **Input**: "What is quantum physics?"
- **Expected**: Answer appears in chat panel (not editor)

### Test 4: Lesson Generation
- **Input**: "Teach me about logarithms"
- **Expected**: JSON blueprint converted to lesson in editor
- **Expected**: Chat confirmation message

## Benefits

1. ✅ **Clear Context**: LLM understands the app's dual-panel architecture
2. ✅ **Smart Routing**: Content goes to the right place automatically
3. ✅ **Better UX**: Summaries are readable in the editor, not cramped in chat
4. ✅ **Consistent Behavior**: Works for both RAG and standard Gemini responses
5. ✅ **No Breaking Changes**: Existing lesson generation still works perfectly

## Notes

- The `EDITOR_CONTENT:` prefix is removed before displaying to user
- Markdown content is converted to Tiptap nodes using existing `markdownToNodes` utility
- Database persistence includes the new `editor` type for chat history
- Source attribution is preserved (e.g., "Based on 5 sections from your document")

