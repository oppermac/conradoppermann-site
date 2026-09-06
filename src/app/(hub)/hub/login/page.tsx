import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/hub/auth";
import { proximaNova } from "@/app/fonts";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/hub") || value.startsWith("//")) return "/hub";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const jar = await cookies();
  const session = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  const { next } = await searchParams;
  const target = safeNext(next);
  if (session.ok) redirect(target);

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6"
      style={{ paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}
    >
      <div className="w-full max-w-[360px]">
        <div className="mb-8 text-center">
          <div className={`${proximaNova.className} text-[22px] font-bold uppercase tracking-[0.35em]`}>Conrad</div>
          <div className="mt-1 text-[15px] text-ink-2">Hub</div>
        </div>
        <LoginForm next={target} />
      </div>
    </main>
  );
}
