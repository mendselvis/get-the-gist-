"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Request = { title: string; body: string; confirmLabel: string };
type ConfirmFn = (request: Request) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm outside ConfirmProvider");
  return ctx;
}

// one native <dialog> for the whole app: focus is trapped and Escape cancels
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);
  const [request, setRequest] = useState<Request | null>(null);

  const confirm = useCallback<ConfirmFn>((req) => {
    setRequest(req);
    requestAnimationFrame(() => dialogRef.current?.showModal());
    return new Promise((resolve) => (resolveRef.current = resolve));
  }, []);

  function close(ok: boolean) {
    dialogRef.current?.close();
    resolveRef.current?.(ok);
    resolveRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        onClick={(e) => e.target === dialogRef.current && close(false)}
        className="m-auto w-[min(92vw,420px)] rounded-[24px] bg-white p-0 text-[#111] shadow-[0_30px_80px_-20px_rgba(17,17,17,0.45)] backdrop:bg-black/40"
        aria-labelledby="confirm-title"
      >
        {request && (
          <div className="p-6">
            <h2 id="confirm-title" className="font-serif text-3xl leading-tight">
              {request.title}
            </h2>
            <p className="mt-2 leading-relaxed text-muted">{request.body}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                autoFocus
                className="h-11 rounded-full border border-line bg-white px-5 font-medium text-[#111] hover:border-[#111]"
              >
                Cancel
              </button>
              <button type="button" onClick={() => close(true)} className="h-11 rounded-full bg-[#111] px-5 font-medium text-white hover:bg-black/80">
                {request.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
