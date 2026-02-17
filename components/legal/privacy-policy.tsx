export function PrivacyPolicy() {
  return (
    <div className="space-y-6 text-sm text-muted-foreground">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Privacy Policy</h3>
          <p className="mt-1 text-xs">
            Rx Systems &mdash; Effective Date: 17 February 2026 &middot; Last Updated: 17 February 2026
          </p>
        </div>

        <p>
          Rx Systems (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) develops and operates Discord automation and
          integration services, including: SyrupRx, SyrupRx Pro, AutoClockRx, VexRx, MedNoteRx, and associated
          dashboards and subscription systems.
        </p>
        <p>
          This Privacy Policy explains how we process information when you use our services.
        </p>
        <p>
          This Policy does not apply to Discord itself. Discord operates under its own privacy framework.
        </p>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">1. Scope</h4>
          <p>This Policy applies to all Rx Systems Discord bots, Rx Systems dashboards, premium subscription services, and external API integrations configured within our bots.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">2. Data Controller</h4>
          <p>Rx Systems acts as the Data Controller for configuration and operational data processed through its bots.</p>
          <p>Where server administrators configure structured logging features, the server owner may act as the Data Controller and Rx Systems acts as a Data Processor.</p>
          <p>Contact: <a href="mailto:support@rxdev.org" className="text-primary hover:underline">support@rxdev.org</a></p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">3. Lawful Basis for Processing (UK GDPR)</h4>
          <p>We process data under:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="font-medium text-card-foreground">Legitimate Interest</span> &ndash; to provide Discord automation services.</li>
            <li><span className="font-medium text-card-foreground">Contractual Necessity</span> &ndash; to deliver premium features.</li>
            <li><span className="font-medium text-card-foreground">Consent</span> &ndash; where optional features are enabled by administrators.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">4. Categories of Data Processed</h4>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">4.1 Guild Configuration Data</h5>
            <p>When a server configures a bot, we may store: Guild ID, configured role IDs (e.g., admin/staff roles), configured channel IDs, feature toggles, and API keys provided by administrators.</p>
            <p>Purpose: to deliver the requested functionality.</p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-card-foreground">4.2 User Identifiers</h5>
            <p>When users interact with our bots: Discord User ID, username / display name, role membership (for permission enforcement), and interaction metadata (timestamps, command usage).</p>
            <p>We do not collect passwords, IP addresses, or Discord credentials.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">5. Bot-Specific Processing</h4>

          <div className="space-y-4 rounded-md border border-border p-4">
            <h5 className="text-sm font-semibold text-card-foreground">5.1 SyrupRx</h5>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Purpose</p>
              <p>SyrupRx provides role-based permission systems, structured logging tools, server configuration management, external API integrations, presence-aware staff visibility, and optional message-triggered automation.</p>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Privileged Gateway Intents</p>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-card-foreground">Server Members Intent</p>
                <p>Used for role verification, permission enforcement, preventing impersonation, and attribution of logs to verified members. Member lists are not exported or sold.</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-card-foreground">Presence Intent</p>
                <p>Used exclusively for the /onlinestaff feature. This feature displays currently online, idle, or DND staff, filters by roles configured during /setup, processes presence data in real time only, does not store historical presence, and does not track user behavior. Presence data is not retained.</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-card-foreground">Message Content Intent (If Enabled)</p>
                <p>Used only when a server enables keyword-triggered automation, structured logging parsing, or bot-triggered message workflows. Message content is processed solely to perform configured features and is not used for analytics or AI training.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-border p-4">
            <h5 className="text-sm font-semibold text-card-foreground">5.2 SyrupRx Pro</h5>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Purpose</p>
              <p>SyrupRx Pro is the premium subscription tier of SyrupRx. It provides enhanced capabilities such as expanded automation limits, advanced logging features, additional configuration options, and priority support features.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Data Processed</p>
              <p>In addition to SyrupRx core data: subscription status, entitlement level, and payment processor reference ID. Payment processing is handled by third-party providers (e.g., Stripe). Rx Systems does not store full card details.</p>
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-border p-4">
            <h5 className="text-sm font-semibold text-card-foreground">5.3 AutoClockRx</h5>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Purpose</p>
              <p>AutoClockRx provides automated shift logging and operational tracking tools.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Data Processed</p>
              <p>Guild ID, User ID, shift timestamps, and logged operational entries. Shift data is retained only as necessary for operational purposes. Presence tracking is not used unless explicitly configured.</p>
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-border p-4">
            <h5 className="text-sm font-semibold text-card-foreground">5.4 VexRx</h5>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Purpose</p>
              <p>VexRx provides conversational AI assistance within Discord servers.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Data Processed</p>
              <p>Message content (when interacting with the bot), User ID, and interaction metadata. Message content is processed solely to generate contextual responses. User data is not used to train machine learning models. Conversation data is not permanently retained unless logging is explicitly enabled by administrators.</p>
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-border p-4">
            <h5 className="text-sm font-semibold text-card-foreground">5.5 MedNoteRx</h5>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Purpose</p>
              <p>MedNoteRx provides structured note-taking and documentation tools.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-card-foreground">Data Processed</p>
              <p>Guild ID, User ID, structured note content, and associated timestamps. Stored notes remain within the configured server context and are not shared externally.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">6. External API Integrations</h4>
          <p>If administrators configure external APIs (e.g., Maple/Marizma API), we may store API keys securely, send API requests on behalf of the server, and display returned results within Discord. API keys are not shared externally.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">7. Data Retention</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="font-medium text-card-foreground">Configuration data:</span> retained while the bot remains installed.</li>
            <li><span className="font-medium text-card-foreground">Presence data:</span> processed in real time only; not stored.</li>
            <li><span className="font-medium text-card-foreground">Message content:</span> stored only if required by configured logging features.</li>
            <li><span className="font-medium text-card-foreground">Subscription records:</span> retained for billing compliance.</li>
          </ul>
          <p>When a bot is removed from a server, configuration data is deleted within a reasonable timeframe unless required for compliance or security.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">8. AI & Machine Learning</h4>
          <p>Rx Systems does not use user data to train machine learning models. If AI features are enabled (e.g., VexRx), data is processed only to generate responses within the server context.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">9. Data Sharing</h4>
          <p>We do not sell personal data. Data may be processed by Discord, hosting providers, payment processors, and external APIs configured by administrators. Data is shared only as necessary to provide services.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">10. Security</h4>
          <p>We implement reasonable safeguards including HTTPS encryption, secure environment variable storage, access-controlled infrastructure, and monitoring of production systems. No system can guarantee absolute security.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">11. International Processing</h4>
          <p>Infrastructure may operate internationally. By using our services, you acknowledge that data may be processed in multiple jurisdictions.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">12. Data Subject Rights (UK GDPR)</h4>
          <p>Users may request: access, correction, deletion, restriction of processing, and data portability (where applicable).</p>
          <p>Requests: <a href="mailto:support@rxdev.org" className="text-primary hover:underline">support@rxdev.org</a></p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">13. Data Processing Agreement (DPA)</h4>
          <p>Where structured logging is configured, the server owner may act as Data Controller and Rx Systems acts as Data Processor. A formal DPA may be requested via <a href="mailto:support@rxdev.org" className="text-primary hover:underline">support@rxdev.org</a>.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">14. Changes to This Policy</h4>
          <p>We may update this Policy periodically. Continued use of our services constitutes acceptance of the revised version.</p>
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
  )
}
