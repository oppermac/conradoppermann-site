import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/hub/auth";
import { HubShell } from "../components/HubShell";

export const dynamic = "force-dynamic";

export default async function HubAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const session = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session.ok) redirect("/hub/login");
  return <HubShell>{children}</HubShell>;
}
