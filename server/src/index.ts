import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './services/socketService';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Configure Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Set up routes
app.get('/', (req, res) => {
  res.send('Car Simulator Server is running');
});

// Set up Socket.IO handlers
setupSocketHandlers(io);

// Parse command line arguments
const args = process.argv.slice(2);
const hostArg = args.findIndex(arg => arg === '--host');
let HOST = 'localhost';

// Check if --host flag is present
if (hostArg !== -1 && args[hostArg + 1]) {
  HOST = args[hostArg + 1];
} else if (args.includes('--host')) {
  HOST = '0.0.0.0'; // Default to all interfaces if --host is specified without value
}

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);

// Use the appropriate overload based on the host setting
if (HOST === '0.0.0.0') {
  server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Server is exposed to the local network. Access using your local IP address:${PORT}`);
  });
} else {
  server.listen(PORT, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });
}
