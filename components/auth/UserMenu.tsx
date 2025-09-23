"use client"

import { useSession } from "next-auth/react"
import { signIn, signOut } from "next-auth/react"

export default function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div style={{ opacity: 0.6 }}>Loading…</div>
  }

  if (!session) {
    return (
      <button onClick={() => signIn("google")}>Sign in with Google</button>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 14 }}>Hi, {session.user?.name || session.user?.email}</span>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  )
}
