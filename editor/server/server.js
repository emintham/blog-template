const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const db = require('./db');
const Y = require('yjs');
const cors = require('cors');

// Since we can't require 'y-websocket/bin/utils' directly due to exports,
// we will implement a custom Yjs Websocket server using y-websocket as a library is tough if exports are blocked.
// However, y-websocket is usually run as a CLI.
// Let's implement a basic Yjs sync handler manually using 'y-websocket' if possible,
// OR just use the 'y-websocket' CLI and a custom persistence callback file.

// ACTUALLY: The best way to do this in a custom Node script is to ignore the internal 'utils' if they are blocked
// and implement the connection handler logic using 'y-socket.io' or just basic 'ws' with 'y-protocols'.

// BUT, let's try a simpler fix first: Many projects import from 'y-websocket/bin/utils.js' explicitly or assume commonjs.
// If package.json blocks it, we can't.

// Plan B: Use the `WSSharedDoc` approach if we can find where it is exported,
// or implement a minimal sync server.

// Let's try to import the YWebsocketServer from a different entry point? No.

// REWRITE: simple-y-websocket-server logic.
// We need to handle the sync protocol.
// Installing 'y-protocols' is helpful here.
const { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } = require('y-protocols/awareness');
const { readSyncMessage, writeSyncStep1, writeUpdate } = require('y-protocols/sync');
const { createMutex } = require('lib0/mutex');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const map = require('lib0/map');

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const docs = new Map();

class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new Awareness(this);
    this.awareness.setLocalState(null);

    // Load from DB
    const row = db.prepare('SELECT content FROM posts WHERE id = ?').get(name);
    if (row && row.content) {
      console.log(`Loaded ${name} from DB`);
      Y.applyUpdate(this, row.content);
    }

    // Persist on update (debounced)
    let timeoutId = null;
    this.on('update', (update, origin, doc) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        persistDocument(this.name, this);
        timeoutId = null;
      }, 2000); // 2 seconds debounce
    });
  }
}

const persistDocument = (docName, ydoc) => {
  try {
    const update = Y.encodeStateAsUpdate(ydoc);
    const stmt = db.prepare(`
      INSERT INTO posts (id, content, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(docName, Buffer.from(update));
    console.log(`Saved document: ${docName}`);
  } catch (err) {
    console.error('Failed to save document:', err);
  }
};

const getYDoc = (docname, gc = true) => {
  return map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    if (docs.has(docname)) docs.get(docname).destroy();
    docs.set(docname, doc);
    return doc;
  });
};

const messageSync = 0;
const messageAwareness = 1;

const updateHandler = (update, origin, doc) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

const send = (doc, conn, m) => {
  if (conn.readyState !== WebSocket.OPEN) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, (err) => { if (err != null) closeConn(doc, conn); });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const closeConn = (doc, conn) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    // awareness logic omitted for brevity in POC
    if (doc.conns.size === 0) {
      // if (doc.gc) docs.delete(doc.name) // keep in memory for now
    }
  }
  conn.close();
};

const setupWSConnection = (conn, req, { docName = req.url.slice(1).split('?')[0], gc = true } = {}) => {
  conn.binaryType = 'arraybuffer';
  const doc = getYDoc(docName, gc);
  doc.conns.set(conn, new Set());

  // Listen to client messages
  conn.on('message', (message) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          readSyncMessage(decoder, encoder, doc, null);
          if (encoding.length(encoder) > 1) {
            send(doc, conn, encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness:
          // Omitted for POC
          break;
      }
    } catch (err) {
      console.error(err);
      doc.emit('error', [err]);
    }
  });

  // Start Sync
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  writeSyncStep1(encoder, doc);
  send(doc, conn, encoding.toUint8Array(encoder));

  // Register update handler if not already
  if (doc.conns.size === 1) {
      doc.on('update', updateHandler);
  }
};

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
