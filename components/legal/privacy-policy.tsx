export function PrivacyPolicy() {
  return (
    <div className="space-y-6 text-sm text-muted-foreground">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Privacy Policy</h3>
          <p className="mt-1 text-xs">
            Rx Systems &mdash; Effective Date: 16 February 2026 &middot; Last Updated: 16 February 2026
          </p>
        </div>

        <p>
          Rx Systems (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) develops and operates Discord bots and related web
          services, including but not limited to: SyrupRx, MapleRx, AutoClockRx, VexRx, MedNoteRx, and other Discord
          automation or integration services operated under Rx Systems.
        </p>
        <p>This Privacy Policy explains what data we collect, how we use it, how it is stored, and your rights.</p>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">1. Scope of This Policy</h4>
          <p>This policy applies to all Rx Systems Discord bots, dashboards and web applications, API integrations, and premium subscription services. This policy does not apply to Discord itself, which has its own Privacy Policy.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">2. Information We Collect</h4>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">2.1 Guild (Server) Information</h5>
            <p>When a server adds an Rx Systems bot, we may collect: Guild ID, server name, role IDs, channel IDs, feature configuration settings, and integration keys (e.g., Maple/Marizma API keys).</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">2.2 User Information</h5>
            <p>When users interact with our bots, we may collect: Discord User ID, username and display name, role information (if required for permission checks), command interaction data, and timestamps of actions. We do not collect passwords or private Discord credentials.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">2.3 Message Data (Message Content Intent)</h5>
            <p>Some features require reading message content. This only occurs when a server enables message-based triggers, a structured logging feature is enabled, a keyword automation feature is enabled, or a chatbot feature (e.g., VexRx) is active. Slash commands do not require message content access.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">2.4 Server Members Data (Server Members Intent)</h5>
            <p>Where enabled, we may access guild member list, role assignments, join/leave events, and nicknames. This is used for permission enforcement, role-based feature access, logging staff actions, and preventing impersonation.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">2.5 Presence Data (Presence Intent)</h5>
            <p>If a server enables presence-based features, we may access online status and activity status. This is used for presence-aware staff dashboards, online-only notification systems, and operational visibility features. Presence data is not stored long-term unless explicitly required by a configured feature.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">2.6 Integration Data</h5>
            <p>If a server connects external services (e.g., Maple/Marizma API), we may store API keys or tokens provided by administrators, webhook URLs, and integration configuration settings. These are used strictly to provide the requested service.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">2.7 Billing Information</h5>
            <p>For premium subscriptions, billing is processed via third-party payment providers such as Stripe. We may store subscription status, customer reference ID, and server entitlement level. We do not store full card details.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">3. How We Use Information</h4>
          <p>We use collected data to provide bot functionality, enforce permissions, process commands, operate integrations, provide logging and audit features, maintain subscription status, prevent abuse or misuse, and improve service reliability. We do not sell personal data.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">4. Legal Basis (UK / GDPR Context)</h4>
          <p>Where applicable under UK GDPR, we process data based on legitimate interest (operating the bot service), contractual necessity (providing premium services), and consent (where features require optional configuration).</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">5. Data Retention</h4>
          <p>We retain data only as long as necessary to provide services. Guild configuration data is retained while the bot remains in the server. Log data is retained according to feature configuration. API keys are stored until removed or bot uninstall. Subscription data is retained as required for billing records.</p>
          <p>When a bot is removed from a server, associated configuration data is deleted within a reasonable period unless required for security or legal reasons.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">6. Data Sharing</h4>
          <p>We may share data only when necessary with Discord (as required to operate), hosting providers, payment processors, and connected third-party APIs selected by server administrators. We do not sell or rent user data.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">7. Security</h4>
          <p>We implement reasonable safeguards including encrypted HTTPS connections, secure environment variable storage, access controls, and limited internal access to production systems. While we take security seriously, no system can guarantee absolute security.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">8. User and Administrator Responsibilities</h4>
          <p>Server administrators are responsible for informing members about enabled logging features, ensuring configuration complies with Discord policies, and properly managing API keys. Users are responsible for complying with Discord&apos;s Terms of Service and using bot features appropriately.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">9. Children&apos;s Privacy</h4>
          <p>Rx Systems services are not directed toward individuals under the minimum age required by Discord. If you believe data has been collected improperly, contact us.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">10. International Transfers</h4>
          <p>Our services may operate on infrastructure located outside your country of residence. By using Rx Systems services, you acknowledge that data may be processed internationally.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">11. Changes to This Policy</h4>
          <p>We may update this Privacy Policy periodically. Continued use of our services after updates constitutes acceptance of the revised policy.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">12. Contact Information</h4>
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
  )
}
