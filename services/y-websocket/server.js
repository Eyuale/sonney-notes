const WebSocket = require('ws');
const http = require('http');
const wss = new WebSocket.Server({ noServer: true });
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection;
const Y = require('yjs');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load generic .env if present, or rely on env vars

const port = process.env.PORT || 1234;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tiptap_app";

// --- Persistence Logic ---
let db;
let client;

async function connectToDB() {
    if (client) return db;
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(process.env.MONGODB_DB || 'tiptap_app');
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
    }
    return db;
}

// Basic persistence: Save snapshot on document update (debounced)
// In a real prod setup, use y-mongodb-provider or similar, but here we implement simple snapshotting
const docs = new Map();

// Helper to persist doc
const persistDoc = async (docName, doc) => {
    if (!db) await connectToDB();
    if (!db) return;

    try {
        const state = Y.encodeStateAsUpdate(doc);
        const buffer = Buffer.from(state);
        // Persist to 'lessons' collection or 'yjs_documents'
        // We'll update the 'contentSnapshot' field in 'lessons' if docName is a lessonId
        // Or store in a dedicated collection

        // Strategy: Store raw update for Yjs history, AND optionally Tiptap JSON if we ran a transformer (harder on Node side w/o Tiptap extensions).
        // Check implementation plan: "Periodically persist the Yjs document to MongoDB as a static snapshot"

        // We will store the binary update blob. Front-end handles JSON conversion usually, 
        // but backend storage of the binary is best for Yjs consistency.

        await db.collection('lessons').updateOne(
            { _id: new require('mongodb').ObjectId(docName) }, // Assuming docName is the lesson ObjectId
            {
                $set: {
                    yDocUpdate: buffer,
                    updatedAt: new Date()
                }
            }
        ).catch(err => {
            // If ID is not an objectID (e.g. "test-doc"), fallback to a generic collection
            console.log(`Could not update lesson collection for ${docName}, trying generic storage.`);
            db.collection('yjs_docs').updateOne(
                { name: docName },
                { $set: { update: buffer, updatedAt: new Date() } },
                { upsert: true }
            );
        });

        console.log(`Persisted ${docName}`);
    } catch (e) {
        console.error('Error persisting doc:', e);
    }
};

// Hook into y-websocket utils
// This is a simplified way to inject persistence. 
// Ideally we write a custom persistence adapter, but for "surgical and complete", hooking the actual y-doc updates is effective.

const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Yjs WebSocket Server Running');
});

server.on('upgrade', (request, socket, head) => {
    // You can handle auth here by checking request.url params
    // const url = new URL(request.url, 'http://localhost');
    // const token = url.searchParams.get('token');
    // if (!validate(token)) { socket.destroy(); return; }

    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

wss.on('connection', (conn, req) => {
    // Extract docName from URL, e.g. /ws/docName
    // y-websocket client usually connects to ws://host/roomName
    // The 'setupWSConnection' handles the protocol details.
    // We can wrap it to attach persistence listeners.

    // Note: setupWSConnection signature is (conn, req, { docName, gc })
    // We rely on standard behavior which extracts docName from req.url

    setupWSConnection(conn, req, {
        docName: req.url.slice(1).split('?')[0] // simple parsing
    });
});

// To implement persistence properly with the official y-websocket utils,
// we need to access the 'getYDoc' utility or bind to the docs map if exposed.
// However, y-websocket Utils keeps 'docs' map internal in some versions.
// A common pattern is to use the environment variable YPERSISTENCE or callback.
// Since we want custom Mongo logic, let's use the 'setPersistence' approach if available,
// or just poll the docs if we can access them.
// A more robust approach for this file:
// We will intercept the doc creation.

const utils = require('y-websocket/bin/utils');
const oldGetYDoc = utils.getYDoc;

utils.getYDoc = (docname, gc = true) => {
    const doc = oldGetYDoc(docname, gc);

    // Bind persistence if not already bound
    if (!doc._hasPersistence) {
        doc._hasPersistence = true;
        console.log(`Initializing persistence for ${docname}`);

        // Load initial state
        (async () => {
            await connectToDB();
            if (!db) return;

            let data;
            try {
                // Try lesson collection first
                const lesson = await db.collection('lessons').findOne({ _id: new require('mongodb').ObjectId(docname) });
                if (lesson && lesson.yDocUpdate) {
                    data = lesson.yDocUpdate.buffer;
                } else {
                    // Fallback
                    const stored = await db.collection('yjs_docs').findOne({ name: docname });
                    if (stored) data = stored.update.buffer;
                }

                if (data) {
                    Y.applyUpdate(doc, new Uint8Array(data));
                    console.log(`Loaded state for ${docname}`);
                }
            } catch (e) { console.error("Error loading doc", e) }
        })();

        // Save on update
        doc.on('update', (update, origin) => {
            // Debounce save?
            // For MVP, just save or use a basic throttle
            persistDoc(docname, doc);
        });
    }
    return doc;
};

// Start
connectToDB().then(() => {
    server.listen(port, () => {
        console.log(`Yjs server running on port ${port}`);
    });
});
