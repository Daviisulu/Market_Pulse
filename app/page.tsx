import Link from "next/link";
import { db } from "@/lib/db";
import { DigestBody } from "@/components/DigestBody";
import { DigestList } from "@/components/DigestList";
import { SIGNALS_QUERY_ARGS, DIGEST_COUNT_ARGS } from "@/lib/digest-query";

// Query ogni volta: dashboard personale a basso traffico, la freschezza
// del digest più recente conta più della cache statica.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [digest, altriDigest] = await Promise.all([
    db.digest.findFirst({
      orderBy: { creatoIl: "desc" },
      include: {
        signals: SIGNALS_QUERY_ARGS,
        _count: DIGEST_COUNT_ARGS,
      },
    }),
    db.digest.findMany({
      orderBy: { creatoIl: "desc" },
      skip: 1,
      take: 10,
    }),
  ]);

  if (!digest) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-2">
          <h1 className="text-xl font-semibold">Nessun digest ancora</h1>
          <p className="text-current/60">
            Esegui <code className="rounded bg-black/[.06] px-1.5 py-0.5 dark:bg-white/[.08]">npm run digest</code> per generarne uno.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <header className="glass rounded-3xl p-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Market Pulse</h1>
          <p className="text-sm text-current/60">
            Digest del {new Date(digest.creatoIl).toLocaleString("it-IT")} — {digest.signals.length} segnali
          </p>
        </div>
        <Link
          href="/calendario"
          className="shrink-0 rounded-full bg-black/[.05] dark:bg-white/[.08] px-3 py-1.5 text-sm hover:bg-black/[.1] dark:hover:bg-white/[.14]"
        >
          calendario eventi
        </Link>
      </header>

      <DigestBody
        creatoIl={digest.creatoIl}
        signals={digest.signals}
        totaleSegnali={digest._count.signals}
        tempo="presente"
      />

      <DigestList digests={altriDigest} />
    </main>
  );
}
