"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";

import { cn } from "@/shared/lib/cn";

const AUTO_DISMISS_MS = 5000;

export type ToastVariant = "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  nextId: number;
}

type ToastAction =
  | { kind: "add"; message: string; variant: ToastVariant }
  | { kind: "remove"; id: number };

export function toastReducer(
  state: ToastState,
  action: ToastAction,
): ToastState {
  if (action.kind === "add") {
    const toast: Toast = {
      id: state.nextId,
      message: action.message,
      variant: action.variant,
    };
    return { toasts: [...state.toasts, toast], nextId: state.nextId + 1 };
  }
  return {
    ...state,
    toasts: state.toasts.filter((toast) => toast.id !== action.id),
  };
}

interface ToastApi {
  toasts: Toast[];
  notify: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [], nextId: 0 });

  const notify = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      dispatch({ kind: "add", message, variant });
    },
    [],
  );
  const dismiss = useCallback((id: number) => {
    dispatch({ kind: "remove", id });
  }, []);

  return (
    <ToastContext value={{ toasts: state.toasts, notify, dismiss }}>
      {children}
      <Toaster />
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return api;
}

function Toaster() {
  const { toasts, dismiss } = useToast();

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts, dismiss]);

  return (
    <div
      className="fixed right-4 bottom-4 flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => {
            dismiss(toast.id);
          }}
          className={cn(
            "border-border bg-card animate-in rounded-md border px-4 py-2 text-left text-sm shadow-lg",
            toast.variant === "error" && "border-rejected text-rejected",
          )}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
