"use client";

import { useEffect, useState, createContext, useContext } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useSession } from 'next-auth/react';

const EditorContext = createContext<{ provider: WebsocketProvider | null; ydoc: Y.Doc | null }>({ provider: null, ydoc: null });

export const useEditorContext = () => useContext(EditorContext);

const WEBSOCKET_URL = 'ws://localhost:1234';

export const EditorProvider = ({ children, lessonId }: { children: React.ReactNode, lessonId: string }) => {
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const { data: session } = useSession();

    useEffect(() => {
        if (!lessonId) return;

        const ydocInstance = new Y.Doc();
        const providerInstance = new WebsocketProvider(WEBSOCKET_URL, lessonId, ydocInstance);

        providerInstance.on('status', (event: any) => {
            console.log('Yjs status:', event.status); // logs "connected" or "disconnected"
        });

        setYdoc(ydocInstance);
        setProvider(providerInstance);

        return () => {
            providerInstance.destroy();
            ydocInstance.destroy();
        };
    }, [lessonId]);

    // Update Awareness (User Info)
    useEffect(() => {
        if (provider && session?.user) {
            const { name, image, email } = session.user;
            const color = '#' + Math.floor(Math.random() * 16777215).toString(16); // Random color for now

            provider.awareness.setLocalStateField('user', {
                name: name || email || 'Anonymous',
                color,
                avatar: image,
                email
            });
        }
    }, [provider, session]);

    return (
        <EditorContext.Provider value={{ provider, ydoc }}>
            {children}
        </EditorContext.Provider>
    );
};
