import Link from "next/link";
import type { Digest } from "@/generated/prisma/client";

export function DigestList({ digests }: { digests: Digest[] }) {
  if (digests.length === 0) return null;

  return (
    <section className="glass rounded-3xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-medium text-current/60">Digest precedenti</h2>
      <ul className="flex flex-wrap gap-2">
        {digests.map((d) => (
          <li key={d.id}>
            <Link
              href={`/digest/${d.id}`}
              className="glass-hover inline-block rounded-full bg-black/[.04] dark:bg-white/[.06] px-3 py-1.5 text-sm hover:bg-black/[.08] dark:hover:bg-white/[.12]"
            >
              {new Date(d.creatoIl).toLocaleString("it-IT")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
