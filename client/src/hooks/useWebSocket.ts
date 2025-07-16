import { useEffect, useRef, useState } from 'react';
import { WebSocketMessage } from '../types/trading';

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    let ws: WebSocket;
    
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
        
        const handler = messageHandlers.current.get(message.type);
        if (handler) {
          handler(message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      return;
    }
    
    return () => {
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
    };
  }, [url]);

  const send = (message: WebSocketMessage) => {
    if (socket && isConnected) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  };

  const subscribe = (messageType: string, handler: (data: any) => void) => {
    const wrappedHandler = (data: any) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in WebSocket handler for ${messageType}:`, error);
      }
    };
    messageHandlers.current.set(messageType, wrappedHandler);
  };

  const unsubscribe = (messageType: string) => {
    messageHandlers.current.delete(messageType);
  };

  return {
    socket,
    isConnected,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
  };
}
