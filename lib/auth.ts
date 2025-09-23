import NextAuth, { type NextAuthOptions, getServerSession, type Session } from "next-auth";
import Google from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
      // next-auth v4 handles checks internally; no explicit checks needed
    }),
  ],
  // Ensure we can access user id in session
  callbacks: {
    async session({ session, token }: { session: Session; token: { sub?: string } }) {
      if (session.user && token?.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

export async function getAuthSession() {
  return getServerSession(authOptions);
}
