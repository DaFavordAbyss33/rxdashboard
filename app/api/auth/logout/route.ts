import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("discord_session")

  return NextResponse.json({ success: true })
}

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete("discord_session")

  return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL!))
}
