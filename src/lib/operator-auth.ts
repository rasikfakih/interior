import { cookies } from "next/headers";

export async function getOperatorSession() {
  const cookieStore = await cookies();
  return cookieStore.get("superadmin_session")?.value === "1";
}
