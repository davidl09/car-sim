import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { setupSocketHandlers } from './services/socketService';
import { config } from './config';

// Initialize express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

// Configure Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up Socket.IO server
const io = new Server(server, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// In production mode, serve the static client files
if (process.env.NODE_ENV === 'production') {
  console.log(`Production mode: Serving static files from ${config.client.buildPath}`);
  
  // Check if the client build directory exists
  if (fs.existsSync(config.client.buildPath)) {
    console.log('Client build directory found, serving static files');
    
    // Serve static files from the client build directory
    app.use(express.static(config.client.buildPath));
    
    // API routes are defined before the catch-all
    
    // Catch-all route handler for SPA (needs to be last)
    app.use((req, res, next) => {
      // Skip API routes - should never reach here due to order of routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Send the index.html for any other requests (SPA client-side routing)
      res.sendFile(path.join(config.client.buildPath, 'index.html'));
    });
  } else {
    console.error('Client build directory not found. Please run "npm run build:client" first.');
    app.get('/', (req, res) => {
      res.send('Client build directory not found. Please build the client application first.');
    });
  }
} else {
  // In development mode, just show a simple message
  console.log('Development mode: Not serving static files');
  app.get('/', (req, res) => {
    res.send('Car Simulator Server is running in development mode');
  });
}

// Set up Socket.IO handlers
setupSocketHandlers(io);

// Parse command line arguments
const args = process.argv.slice(2);
const hostArg = args.findIndex(arg => arg === '--host');
let HOST = config.server.host;

// Check if --host flag is present (command line args override config)
if (hostArg !== -1 && args[hostArg + 1]) {
  HOST = args[hostArg + 1];
} else if (args.includes('--host')) {
  HOST = '0.0.0.0'; // Default to all interfaces if --host is specified without value
}

// Start the server
const PORT = config.server.port;

// Use the appropriate overload based on the host setting
if (HOST === '0.0.0.0') {
  server.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server is exposed to the local network. Access using your network IP address:${PORT}`);
  });
} else {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
