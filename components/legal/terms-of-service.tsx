"use client"

import { ScrollArea } from "@/components/ui/scroll-area"

export function TermsOfService() {
  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-6 text-sm text-muted-foreground">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Terms of Service</h3>
          <p className="mt-1 text-xs">
            Rx Systems &mdash; Effective Date: 16 February 2026 &middot; Last Updated: 16 February 2026
          </p>
        </div>

        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of services provided by Rx Systems, including but
          not limited to: SyrupRx, MapleRx, AutoClockRx, VexRx, MedNoteRx, and any Discord bots, dashboards, APIs, or
          related tools operated under Rx Systems.
        </p>
        <p>By adding, accessing, or using any Rx Systems service, you agree to these Terms.</p>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">1. Eligibility and Authority</h4>
          <p>You must be at least the minimum age required to use Discord, comply with Discord&apos;s Terms of Service and Community Guidelines, and have appropriate permissions within a server before adding or configuring a bot. If you add an Rx Systems bot to a Discord server, you confirm that you have authority to do so.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">2. Description of Services</h4>
          <p>Rx Systems provides Discord automation tools, API integrations, dashboards, and subscription-based features designed to assist with server management, logging, automation, and external integrations.</p>
          <p>Features may include role-based permission systems, staff logging and audit systems, integration with third-party APIs (e.g., Maple/Marizma), webhook routing and automation, AI-powered interaction systems, and premium subscription features. Services may evolve over time.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">3. Use of Discord Privileged Intents</h4>
          <p>Some Rx Systems bots use Discord&apos;s privileged intents when required for configured features.</p>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">3.1 Server Members Intent</h5>
            <p>Used for role verification, permission enforcement, member join/leave tracking, and audit logging. You agree not to misuse member data for scraping, resale, or unlawful purposes.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">3.2 Presence Intent</h5>
            <p>Used for presence-aware dashboards, online status-based notifications, and staff activity visibility tools. Presence data must not be used for harassment, stalking, or abusive monitoring.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">3.3 Message Content Intent</h5>
            <p>Used only when necessary for keyword-based triggers, structured logging systems, chat-based automation, and AI conversational features (where enabled). Message content is not accessed unless a feature requires it. Server administrators are responsible for informing their members if logging or message-based features are enabled.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">4. Acceptable Use</h4>
          <p>You agree not to use Rx Systems services to violate Discord&apos;s Terms of Service, harass or abuse other users, operate scams, spam, or phishing systems, store or distribute unlawful content, attempt to reverse engineer, exploit, or disrupt the service, or circumvent subscription or premium restrictions. We reserve the right to suspend access if misuse is detected.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">5. Third-Party Services</h4>
          <p>Rx Systems services may rely on third-party providers, including Discord, payment processors (e.g., Stripe), hosting infrastructure providers, and external APIs connected by server administrators. We are not responsible for outages, data inaccuracies, or policy changes caused by third-party services.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">6. Premium Services and Billing</h4>
          <p>Certain features require an active subscription. By purchasing premium access, you agree that subscription fees are billed via the designated payment processor, access remains active only while payment is valid, failed payments may result in suspension of premium features, and chargebacks or fraudulent disputes may result in permanent suspension. Refund policies are determined by Rx Systems and/or the applicable payment processor.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">7. Availability and Modifications</h4>
          <p>We aim to maintain reliable service but do not guarantee continuous uptime, error-free operation, or compatibility with future Discord updates. We reserve the right to modify features, add or remove functionality, adjust rate limits or quotas, and perform maintenance.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">8. Data and Privacy</h4>
          <p>Your use of Rx Systems services is also governed by the Rx Systems Privacy Policy. By using our services, you acknowledge that data processing occurs as described in that policy.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">9. Termination</h4>
          <p>We may suspend or terminate access if these Terms are violated, Discord policy violations occur, abuse or fraud is detected, or legal or regulatory requirements require action. You may terminate use at any time by removing the bot from your server.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">10. Disclaimer of Warranties</h4>
          <p>Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make no warranties regarding fitness for a particular purpose, uninterrupted operation, or data accuracy from third-party integrations. To the fullest extent permitted by law, all implied warranties are disclaimed.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">11. Limitation of Liability</h4>
          <p>To the maximum extent permitted by law, Rx Systems shall not be liable for indirect or consequential damages, loss of profits, data, or goodwill, service interruptions caused by Discord or third parties, or misconfiguration by server administrators. If liability cannot be excluded, it shall be limited to the amount paid for premium services within the preceding billing period, if any.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">12. Indemnification</h4>
          <p>You agree to indemnify and hold harmless Rx Systems from claims arising from your misuse of the services, your violation of Discord&apos;s policies, or your unlawful use of integrations or collected data.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">13. Governing Law</h4>
          <p>These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">14. Changes to These Terms</h4>
          <p>We may update these Terms from time to time. Continued use of services after changes constitutes acceptance of the revised Terms.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">15. Contact Information</h4>
          <p>
            Rx Systems<br />
            Email:{" "}
            <a href="mailto:rxflow@rxdev.org" className="text-primary hover:underline">
              rxflow@rxdev.org
            </a>
            <br />
            Support Server:{" "}
            <a
              href="https://discord.gg/6wsbdkXP2s"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              discord.gg/6wsbdkXP2s
            </a>
            <br />
            Website:{" "}
            <a
              href="https://rxsystems.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              rxsystems.app
            </a>
          </p>
        </section>
      </div>
    </ScrollArea>
  )
}
