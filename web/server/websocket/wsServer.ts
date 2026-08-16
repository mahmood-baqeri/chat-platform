import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { users, messages, chats, formatMessageFromDB } from "../store/dataStore.js";
import { formatChatForUser } from "../endpoints/auth-endpoint.js";

export let wss: WebSocketServer | null = null;
export const wsClients = new Map<WebSocket, { userId?: string }>();

export function createWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    wsClients.set(ws, {});

    ws.on("message", (raw: Buffer) => {
      try {
        const payload = JSON.parse(raw.toString());
        const { event, data } = payload;

        if (event === "auth") {
          wsClients.set(ws, { userId: data.userId });
          const user = users.find(u => u.id === data.userId);
          if (user) {
            user.status = "online";
            broadcastWSEvent("presence:change", { userId: user.id, status: "online" });
          }
        } else if (event === "typing") {
          if (data?.chatId) {
            sendRoomWSEvent(data.chatId, "typing:status", data, ws);
          } else {
            broadcastWSEvent("typing:status", data, ws);
          }
        } else if (event === "message:read") {
          const { chatId } = data || {};
          messages.filter(m => m.chatId === chatId).forEach(m => {
            m.status = "seen";
          });
          if (chatId) {
            sendRoomWSEvent(chatId, "message:status_updated", { chatId, status: "seen" });
          } else {
            broadcastWSEvent("message:status_updated", { chatId, status: "seen" });
          }
        }
      } catch (e) {
        console.error("WebSocket message parsing error:", e);
      }
    });

    ws.on("close", () => {
      const clientData = wsClients.get(ws);
      if (clientData?.userId) {
        const user = users.find(u => u.id === clientData.userId);
        if (user) {
          user.status = "offline";
          user.lastSeen = "لحظاتی پیش";
          broadcastWSEvent("presence:change", { userId: user.id, status: "offline", lastSeen: user.lastSeen });
        }
      }
      wsClients.delete(ws);
    });
  });

  return wss;
}

export function broadcastWSEvent(event: string, data: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify({ event, data });
  wsClients.forEach((info, client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function sendChatMembersWSEvent(memberUserIds: (number | string)[], event: string, data: any, excludeWs?: WebSocket) {
  const memberSet = new Set(memberUserIds.map(String));

  wsClients.forEach((info, client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      if (info.userId && memberSet.has(String(info.userId))) {
        let payloadData = data;
        if (event === "chat:created" && data?.type === "direct") {
          payloadData = formatChatForUser(data, info.userId);
        }
        client.send(JSON.stringify({ event, data: payloadData }));
      }
    }
  });
}

export function sendRoomWSEvent(chatId: string, event: string, data: any, excludeWs?: WebSocket) {
  const targetChat = chats.find(c => c.id === chatId);
  if (!targetChat) return;
  const memberUserIds = targetChat.members?.map(m => m.userId) || [];
  sendChatMembersWSEvent(memberUserIds, event, data, excludeWs);
}
