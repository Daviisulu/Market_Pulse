import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { SignalCard } from "@/components/SignalCard";

export const dynamic = "force-dynamic";

export default async function DigestPage(props: PageProps<"/digest/[id]">) {
  const { id } = await props.params;

  const digest = await db.digest.findUnique({
    where: { id },
    include: {
      signals: {
        include: { explanation: true, priceSnapshots: true },
        orderBy: { conteggioMenzioni: "desc" },
      },
    },
  });

  if (!digest) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <header className="glass rounded-3xl p-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Digest del {new Date(digest.creatoIl).toLocaleString("it-IT")}
          </h1>
          <p className="text-sm text-current/60">{digest.signals.length} segnali</p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full bg-black/[.05] dark:bg-white/[.08] px-3 py-1.5 text-sm hover:bg-black/[.1] dark:hover:bg-white/[.14]"
        >
          digest più recente
        </Link>
      </header>

      {digest.signals.length === 0 ? (
        <p className="text-current/60">Nessun segnale rilevante in questo digest.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {digest.signals.map((signal) => (
            <div key={signal.id} className={signal.explanation ? "sm:col-span-2" : ""}>
              <SignalCard signal={signal} featured={Boolean(signal.explanation)} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
