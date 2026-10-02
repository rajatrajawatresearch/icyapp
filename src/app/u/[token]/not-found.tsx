import { Link2Off } from "lucide-react";

export default function InvalidLink() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-muted text-ink-3">
        <Link2Off className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
        This link doesn&apos;t work any more
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        The store may have replaced it. Ask them to send you your latest link.
      </p>
    </main>
  );
}
