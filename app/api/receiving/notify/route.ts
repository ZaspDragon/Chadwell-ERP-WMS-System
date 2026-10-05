import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();
  const webhook = process.env.RECEIVING_NOTIFICATION_WEBHOOK_URL;

  if (!webhook) {
    return NextResponse.json({
      ok: true,
      delivered: false,
      message:
        "Exception saved in demo mode. Configure RECEIVING_NOTIFICATION_WEBHOOK_URL after Vercel/Supabase setup to deliver admin notifications.",
      payload,
    });
  }

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "receiving_exception",
      recipients: process.env.RECEIVING_ADMIN_EMAILS ?? "",
      ...payload,
    }),
  });

  return NextResponse.json({
    ok: response.ok,
    delivered: response.ok,
    status: response.status,
  });
}
