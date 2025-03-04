interface ApiConfig {
  baseUrl: string;
  wsUrl: string;
}

const getApiConfig = (): ApiConfig => {
  // First check if explicitly defined in env variables
  if (import.meta.env.VITE_SERVER_URL) {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    
    // Convert http/https to ws/wss if needed for WebSocket URL
    const wsUrl = serverUrl.replace(/^http/, 'ws');
    
    return {
      baseUrl: serverUrl,
      wsUrl: wsUrl
    };
  }
  
  // Fallback to relative URL which works in both dev and production
  const protocol = window.location.protocol;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;

  
  return {
    baseUrl: `${protocol}//${host}`,
    wsUrl: `${wsProtocol}//${host}`
  };
};

export const apiConfig = getApiConfig();