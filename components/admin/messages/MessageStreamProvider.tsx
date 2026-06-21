"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ThreadMessage } from "@/components/admin/messages/MessageThread";

type MessageListener = (msg: ThreadMessage) => void;

type MessageStreamContextValue = {
  subscribe: (listener: MessageListener) => () => void;
};

const MessageStreamContext = createContext<MessageStreamContextValue | null>(null);

export function MessageStreamProvider({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: ReactNode;
}) {
  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((listener: MessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/messages/stream");

    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("message", (e) => {
      try {
        const newMsg: ThreadMessage = JSON.parse(e.data);
        const peerId =
          newMsg.from_user_id === currentUserId ? newMsg.to_user_id : newMsg.from_user_id;
        listenersRef.current.forEach((fn) => fn({ ...newMsg, _peerId: peerId } as ThreadMessage & { _peerId: string }));
      } catch {
        /* ignore malformed events */
      }
    });
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      setConnected(false);
    };
  }, [currentUserId]);

  return (
    <MessageStreamContext.Provider value={{ subscribe }}>
      {children}
      {!connected && (
        <span className="sr-only" aria-live="polite">
          reconnecting
        </span>
      )}
    </MessageStreamContext.Provider>
  );
}

export function useMessageStream() {
  const ctx = useContext(MessageStreamContext);
  return ctx;
}
