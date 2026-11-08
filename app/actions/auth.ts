"use server";

import { signOut } from "@/lib/auth";

/** Ends the session and returns to the login screen (sidebar and mobile "Más" menu). */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
