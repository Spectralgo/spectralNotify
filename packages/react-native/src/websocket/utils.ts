/**
 * Send a ping message to keep the connection alive
 */
export function sendPing(ws: WebSocket): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}

/**
 * Close a WebSocket connection gracefully
 */
export function closeWebSocket(ws: WebSocket): void {
  if (
    ws.readyState === WebSocket.OPEN ||
    ws.readyState === WebSocket.CONNECTING
  ) {
    ws.close(1000, "Client closing connection");
  }
}
