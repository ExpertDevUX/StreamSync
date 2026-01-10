#!/bin/bash

# ConnectNow Signaling Server Setup
# Copyright © 2026 Hoang Thong Pham

PORT=${1:-3001}
echo "Starting ConnectNow Signaling Server on port $PORT..."
echo "Domain: thongphamit.site"
echo ""

# Create server script if it doesn't exist
if [ ! -f "signaling-server.js" ]; then
  cat > signaling-server.js << 'EOF'
const http = require('http')
const WebSocket = require('ws')

const PORT = process.env.PORT || 3001
const DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'thongphamit.site'

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    status: 'running',
    domain: DOMAIN,
    timestamp: new Date().toISOString()
  }))
})

const wss = new WebSocket.Server({ server })

const rooms = new Map()
const clients = new Map()

wss.on('connection', (ws) => {
  const userId = Math.random().toString(36).substr(2, 9)
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      
      if (data.type === 'join') {
        const roomId = data.roomId
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set())
        }
        rooms.get(roomId).add(userId)
        clients.set(userId, { ws, roomId })
        
        // Notify others in room
        rooms.get(roomId).forEach(id => {
          if (id !== userId && clients.get(id)) {
            clients.get(id).ws.send(JSON.stringify({
              type: 'user-joined',
              userId
            }))
          }
        })
      }
      
      if (data.type === 'signal') {
        const targetId = data.targetId
        if (clients.has(targetId)) {
          clients.get(targetId).ws.send(JSON.stringify({
            type: 'signal',
            from: userId,
            data: data.data
          }))
        }
      }
    } catch (error) {
      console.error('Message error:', error)
    }
  })
  
  ws.on('close', () => {
    const client = clients.get(userId)
    if (client) {
      const roomId = client.roomId
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(userId)
        if (rooms.get(roomId).size === 0) {
          rooms.delete(roomId)
        }
      }
      clients.delete(userId)
    }
  })
})

server.listen(PORT, () => {
  console.log(`✓ ConnectNow Signaling Server running on port ${PORT}`)
  console.log(`✓ Domain: ${DOMAIN}`)
  console.log(`✓ WebSocket: ws://localhost:${PORT}`)
})
EOF
fi

# Install dependencies if needed
if [ ! -d "node_modules/ws" ]; then
  echo "Installing WebSocket dependency..."
  npm install ws
fi

# Start server
export PORT=$PORT
export NEXT_PUBLIC_APP_DOMAIN=thongphamit.site
node signaling-server.js
