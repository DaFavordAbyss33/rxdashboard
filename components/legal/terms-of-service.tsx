export function TermsOfService() {
  return (
    <div className="space-y-6 text-sm text-muted-foreground">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Terms of Service</h3>
          <p className="mt-1 text-xs">
            Rx Systems &mdash; Effective Date: 17 February 2026
          </p>
        </div>

        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of services provided by Rx Systems
          (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), including: SyrupRx, SyrupRx Pro, AutoClockRx, VexRx,
          MedNoteRx, and associated dashboards, APIs, and subscription systems.
        </p>
        <p>By adding, configuring, or using any Rx Systems service, you agree to these Terms.</p>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">1. Definitions</h4>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>&quot;Services&quot;</strong> means all Discord bots, dashboards, APIs, and related systems operated by Rx Systems.</li>
            <li><strong>&quot;User&quot;</strong> means any individual interacting with a bot.</li>
            <li><strong>&quot;Server Administrator&quot;</strong> means a Discord user with authority to configure a server.</li>
            <li><strong>&quot;Premium Services&quot;</strong> refers to subscription-based tiers such as SyrupRx Pro.</li>
            <li><strong>&quot;Third-Party Services&quot;</strong> includes Discord, Stripe, hosting providers, and external APIs.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">2. Eligibility</h4>
          <p>You must:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Meet Discord&apos;s minimum age requirement.</li>
            <li>Comply with Discord&apos;s Terms of Service.</li>
            <li>Have authority to add and configure bots.</li>
          </ul>
          <p>You represent that you are legally capable of entering into binding agreements.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">3. Description of Services</h4>
          <p>Rx Systems provides Discord automation, logging systems, API integrations, AI-powered assistance, and subscription-based enhancements.</p>
          <p>Features may include:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Role-based permission enforcement</li>
            <li>Structured logging and audit systems</li>
            <li>Presence-aware staff listing (/onlinestaff)</li>
            <li>Message-triggered automation</li>
            <li>External API integrations</li>
            <li>AI conversational responses (VexRx)</li>
            <li>Premium tiers with expanded limits</li>
          </ul>
          <p>We reserve the right to modify features at any time.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">4. Privileged Intents Usage</h4>

          <div className="space-y-2 rounded-md border border-border p-3">
            <h5 className="text-xs font-semibold text-card-foreground">4.1 Server Members Intent</h5>
            <p>Used only for:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Role verification</li>
              <li>Permission enforcement</li>
              <li>Logging attribution</li>
              <li>Impersonation prevention</li>
            </ul>
            <p>Member data is not exported or sold.</p>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <h5 className="text-xs font-semibold text-card-foreground">4.2 Presence Intent</h5>
            <p>Used solely for /onlinestaff. Presence data:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Is processed in real time</li>
              <li>Is not stored</li>
              <li>Is not analyzed historically</li>
              <li>Is not used for behavioral profiling</li>
            </ul>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <h5 className="text-xs font-semibold text-card-foreground">4.3 Message Content Intent</h5>
            <p>Used only when message-triggered features are enabled. Message content:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Is processed only to perform configured functionality</li>
              <li>Is not used for analytics or AI training</li>
              <li>Is not sold or redistributed</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">5. Acceptable Use Policy</h4>
          <p>You may not use the Services to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Violate Discord policies</li>
            <li>Conduct harassment or surveillance</li>
            <li>Operate spam or phishing</li>
            <li>Circumvent subscription systems</li>
            <li>Reverse engineer or exploit vulnerabilities</li>
            <li>Conduct illegal activities</li>
          </ul>
          <p>Violation may result in suspension or termination.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">6. AI &amp; Automated Decision-Making</h4>
          <p>AI features (e.g., VexRx):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Generate responses based on user input.</li>
            <li>Do not constitute professional advice.</li>
            <li>May produce inaccurate outputs.</li>
          </ul>
          <p>Users remain responsible for decisions made using AI responses. No user data is used to train AI models.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">7. Subscription &amp; Billing</h4>
          <p>Premium Services:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Are billed via third-party processors (e.g., Stripe).</li>
            <li>Are recurring unless cancelled.</li>
            <li>May be suspended for non-payment.</li>
            <li>Are subject to enforcement against fraudulent chargebacks.</li>
          </ul>
          <p>Chargebacks or payment fraud may result in permanent suspension. We do not store full payment card details.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">8. Service Level Agreement (SLA)</h4>
          <p>We aim for 99% monthly uptime for core services. This is a target, not a guarantee.</p>
          <p>Downtime exclusions include:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Discord outages</li>
            <li>Third-party API failures</li>
            <li>Infrastructure provider outages</li>
            <li>Force majeure events</li>
          </ul>
          <p>No financial credits are guaranteed unless separately contracted in writing.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">9. External API Disclaimer</h4>
          <p>If you configure external APIs:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>You are responsible for compliance with those APIs.</li>
            <li>We are not liable for API outages, inaccuracies, or changes.</li>
            <li>API keys must be securely managed by server administrators.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">10. Data Protection &amp; Processing</h4>
          <p>Data handling is governed by our Privacy Policy. Where structured logging is configured:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Server owners may act as Data Controllers.</li>
            <li>Rx Systems acts as Data Processor.</li>
          </ul>
          <p>A Data Processing Addendum (DPA) is available upon request.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">11. Data Processing Addendum (DPA)</h4>
          <p>Where required under UK GDPR:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Rx Systems processes data only under documented instructions.</li>
            <li>Appropriate technical and organisational safeguards are implemented.</li>
            <li>Subprocessors are limited to infrastructure and payment providers.</li>
            <li>Data deletion is available upon request.</li>
          </ul>
          <p>
            Requests:{" "}
            <a href="mailto:support@rxdev.org" className="text-primary hover:underline">
              support@rxdev.org
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">12. Security &amp; Compliance</h4>
          <p>We implement:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>HTTPS encryption</li>
            <li>Secure environment variable management</li>
            <li>Access-controlled production systems</li>
            <li>Principle of least privilege</li>
            <li>Production logging &amp; monitoring</li>
          </ul>
          <p>We do not claim SOC 2 certification unless explicitly stated. No system guarantees absolute security.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">13. Intellectual Property</h4>
          <p>All software, source code, branding, and systems remain property of Rx Systems. You may not copy, redistribute, reverse engineer, resell, clone, or derive any part of the service without written consent.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">14. Export Controls</h4>
          <p>You agree to comply with all applicable export control laws and sanctions regulations. Services may not be used in jurisdictions subject to UK sanctions.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">15. Limitation of Liability</h4>
          <p>To the maximum extent permitted by law, Rx Systems shall not be liable for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Indirect damages</li>
            <li>Loss of profits</li>
            <li>Loss of goodwill</li>
            <li>Loss of data</li>
            <li>Discord outages</li>
            <li>Third-party failures</li>
            <li>Misconfiguration by administrators</li>
          </ul>
          <p>Total liability shall not exceed the amount paid in the preceding 3-month billing period. Nothing excludes liability that cannot legally be excluded.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">16. Indemnification</h4>
          <p>You agree to indemnify Rx Systems from claims arising from:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your misuse of the Services</li>
            <li>Your violation of laws or policies</li>
            <li>Your improper configuration of logging features</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">17. Termination</h4>
          <p>We may suspend or terminate access if:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>These Terms are violated</li>
            <li>Fraud or abuse is detected</li>
            <li>Legal compliance requires action</li>
          </ul>
          <p>You may terminate by removing the bot.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">18. Force Majeure</h4>
          <p>We are not liable for events beyond our reasonable control, including:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Infrastructure outages</li>
            <li>Government actions</li>
            <li>Natural disasters</li>
            <li>Discord API changes</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">19. Assignment</h4>
          <p>You may not assign rights under these Terms without written consent. We may assign these Terms in connection with business transfers.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">20. Entire Agreement</h4>
          <p>These Terms, together with the Privacy Policy, constitute the entire agreement between you and Rx Systems.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">21. Governing Law</h4>
          <p>These Terms are governed by the laws of England and Wales. All disputes shall be subject to exclusive jurisdiction of the courts of England and Wales.</p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground">Contact Information</h4>
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
