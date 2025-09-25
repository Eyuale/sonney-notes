"use client"

import { useSession } from "next-auth/react"
import { signIn, signOut } from "next-auth/react"

export default function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div style={{ opacity: 0.6, color: 'inherit' }}>Loading…</div>
  }

  if (!session) {
    return (
      <button onClick={() => signIn("google")}>Sign in with Google</button>
    )
  }

    return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color: 'inherit' }}>
      <span style={{ fontSize: 14, color: 'inherit' }}>Hi, {session.user?.name || session.user?.email}</span>
      <button style={{ color: 'inherit' }} onClick={() => signOut()}>Sign out</button>
    </div>
  )
}
