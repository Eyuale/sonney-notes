"use client";

import { useEffect, useState } from 'react';
import { EditorProvider } from '@/components/editor/EditorProvider';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import { PublishModal } from '@/components/marketplace/PublishModal';
import { GenerateLessonModal } from '@/components/GenerateLessonModal';
import { useParams } from 'next/navigation';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ResizableSplit } from '@/components/layout/ResizableSplit';
import { TiptapDoc } from '@/lib/lesson-mapper';
import { Editor } from '@tiptap/react';

export default function LessonPage() {
    const params = useParams();
    // Ensure id is a string
    const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

    const [editor, setEditor] = useState<Editor | null>(null);

    function handleLessonDocInsert(doc: TiptapDoc) {
        if (!editor) return;
        editor.commands.setContent(doc, { emitUpdate: true }); // emitUpdate true for Yjs?
        editor.commands.focus("start");
    }

    if (!id) return <div>Loading...</div>;

    return (
        <EditorProvider lessonId={id}>
            <ResizableSplit
                left={
                    <div className="h-full bg-background flex flex-col">
                        <div className="border-b p-2 flex justify-between items-center">
                            <h2 className="font-semibold px-2">Lesson Editor</h2>
                            <div className="flex gap-2">
                                <GenerateLessonModal onInsert={(content) => editor?.commands.setContent(content)} />
                                <PublishModal lessonId={id} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <SimpleEditor onEditorReady={setEditor} />
                        </div>
                    </div>
                }
                right={<ChatPanel onLessonDoc={handleLessonDocInsert} />}
                defaultRightWidth={420}
                minRightWidth={360}
                maxRightWidth={560}
            />
        </EditorProvider>
    );
}
