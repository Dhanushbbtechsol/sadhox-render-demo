import { env } from "@sadhox/env/web";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import { getAccessToken } from "@/lib/api";

type CommentCreatedHandler = (payload: unknown) => void;

/**
 * Join `ticket:${ticketId}` and listen for `comment.created`.
 * Reconnects with the current access token.
 */
export function useTicketSocket(
  ticketId: string | undefined,
  onCommentCreated: CommentCreatedHandler,
) {
  const handlerRef = useRef(onCommentCreated);
  handlerRef.current = onCommentCreated;

  useEffect(() => {
    if (!ticketId) return;

    const token = getAccessToken();
    if (!token) return;

    const socket: Socket = io(env.VITE_SERVER_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      socket.emit("join", { ticketId });
    });

    socket.on("comment.created", (payload: unknown) => {
      handlerRef.current(payload);
    });

    return () => {
      socket.emit("leave", { ticketId });
      socket.disconnect();
    };
  }, [ticketId]);
}
