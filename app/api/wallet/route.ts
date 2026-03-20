import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";
import WalletTransaction from "@/models/WalletTransaction";

/**
 * GET /api/wallet
 * Returns the authenticated user's wallet balance and last 50 transactions.
 * Accessible by NGO and volunteer roles.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !["ngo", "volunteer"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 403 });
  }

  await connectMongo();

  const [user, transactions] = await Promise.all([
    User.findById(session.user.id).select("walletBalance name role").lean(),
    WalletTransaction.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  return NextResponse.json({
    balance: user?.walletBalance ?? 0,
    transactions: transactions.map((tx) => ({
      id: tx._id.toString(),
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      balanceAfter: tx.balanceAfter,
      listingId: tx.listingId?.toString() ?? null,
      createdAt: tx.createdAt,
    })),
  });
}
