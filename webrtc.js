const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

// Load SSL certificate and private key
const serverOptions = {
  key: fs.readFileSync("/etc/letsencrypt/live/demo.vicharak.in/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/demo.vicharak.in/fullchain.pem"),
};

// Create HTTP and HTTPS servers
const httpServer = http.createServer();
const httpsServer = https.createServer(serverOptions);

// Initialize WebSocket servers
const wss = new WebSocket.Server({ server: httpsServer });
const ws = new WebSocket.Server({ server: httpServer });

const rooms = {}; // Store rooms and their clients

const handleConnection = (wsInstance) => {
  wsInstance.on('connection', (ws) => {
    ws.on('message', (message) => {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join':
          // Join a room
          const room = data.room;
          if (!rooms[room]) {
            rooms[room] = [];
          }
          rooms[room].push(ws);

          // Notify other peers in the room
          rooms[room].forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'joined', room }));
            }
          });
          break;

        case 'signal':
          // Forward signaling data to other peers in the room
          const targetRoom = rooms[data.room];
          if (targetRoom) {
            targetRoom.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'signal', data: data.data }));
              }
            });
          }
          break;

        default:
          console.error('Unknown message type:', data.type);
      }
    });

    ws.on('close', () => {
      // Remove the client from all rooms
      for (const room in rooms) {
        rooms[room] = rooms[room].filter((client) => client !== ws);
      }
    });
  });
};

handleConnection(wss);
handleConnection(ws);

// Start the servers
const HTTP_PORT = 8381;
const HTTPS_PORT = 8383;

httpServer.listen(HTTP_PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${HTTP_PORT}`);
});

httpsServer.listen(HTTPS_PORT, () => {
  console.log(`WebSocket server running on wss://localhost:${HTTPS_PORT}`);
});
