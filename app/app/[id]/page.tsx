import { Suspense } from "react";
import SessionView from "@/components/app/SessionView";

// the session id is only known at request time, so the page reading it sits inside Suspense
export default function SessionPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-6 pt-16 text-muted">Opening your explanation…</div>}>
      <SessionView />
    </Suspense>
  );
}
