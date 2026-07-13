import { headers } from "next/headers";
import { auth } from "./auth";

export type ServerSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getServerSession(): Promise<ServerSession> {
  return auth.api.getSession({ headers: await headers() });
}
