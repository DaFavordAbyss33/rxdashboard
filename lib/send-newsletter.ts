import { Resend } from "resend";
import { getNewsletterIssue } from "@/lib/newsletterMeta";
import { buildNewsletter } from "@/lib/email-templates/newsletter-builder";
import { NewsletterContent } from "@/lib/email-templates/components";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a newsletter email
 * 
 * Usage with content object (recommended for reusability):
 * ```ts
 * await sendNewsletter({
 *   to: ["user@example.com"],
 *   content: {
 *     heroTitle: "FEBRUARY UPDATE",
 *     highlights: ["New feature A", "Bug fix B", "Improvement C"],
 *     features: [{ title: "Cool Feature", description: "Details here" }],
 *   }
 * })
 * ```
 * 
 * Usage with raw HTML:
 * ```ts
 * await sendNewsletter({ to: ["user@example.com"], htmlTemplate: "<html>..." })
 * ```
 */
export async function sendNewsletter({
  to,
  content,
  htmlTemplate,
  subject,
}: {
  to: string[];
  content?: Partial<NewsletterContent>;
  htmlTemplate?: string;
  subject?: string;
}) {
  const { YEAR, MONTH } = getNewsletterIssue();

  // Build HTML from content object or use provided template
  const html = htmlTemplate || buildNewsletter(content || {});

  await resend.emails.send({
    from: "Rx Systems <newsletter@rxdev.org>",
    to,
    subject: subject || `Rx Systems Newsletter — ${MONTH} ${YEAR}`,
    html
  });
}

// Re-export for convenience
export { buildNewsletter } from "@/lib/email-templates/newsletter-builder";
export type { NewsletterContent } from "@/lib/email-templates/components";
