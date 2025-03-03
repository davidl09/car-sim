import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '3000', 10)
  },
  client: {
    url: process.env.CLIENT_URL || 
         (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'),
    // Path to the client build directory relative to the server
    buildPath: path.resolve(__dirname, '../../client/dist')
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) :
      [process.env.CLIENT_URL || 'http://localhost:5173']
  },
  // Is production environment?
  isProd: process.env.NODE_ENV === 'production'
};