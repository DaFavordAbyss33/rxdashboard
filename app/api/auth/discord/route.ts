import { NextResponse } from "next/server"

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/discord/callback`

// Standard OAuth scopes - only use scopes that don't require special permissions
const SCOPES = [
  "identify",
  "email", 
  "guilds",
  "guilds.members.read",
].join(" ")

export async function GET() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
  })

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`
  
  return NextResponse.redirect(discordAuthUrl)
}
