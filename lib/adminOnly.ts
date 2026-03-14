import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

type AdminRouteHandler<TContext = unknown> = (
  request: Request,
  context: TContext,
  session: Session,
) => Promise<Response>;

/**
 * Wrap route handlers that should only be accessible by admin users.
 */
export function adminOnly<TContext = unknown>(handler: AdminRouteHandler<TContext>) {
  return async (request: Request, context: TContext): Promise<Response> => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    return handler(request, context, session);
  };
}
