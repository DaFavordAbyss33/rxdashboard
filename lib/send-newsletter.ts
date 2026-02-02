import { Resend } from "resend";
import { readFileSync } from "fs";
import { join } from "path";
import { getNewsletterIssue } from "@/lib/newsletterMeta";

const resend = new Resend(process.env.RESEND_API_KEY);

// Load the default newsletter template
export function getNewsletterTemplate(): string {
  const templatePath = join(process.cwd(), "lib/email-templates/newsletter.html");
  return readFileSync(templatePath, "utf-8");
}

export async function sendNewsletter({
  to,
  htmlTemplate
}: {
  to: string[];
  htmlTemplate?: string;
}) {
  const { ISSUE, YEAR, MONTH } = getNewsletterIssue();

  // Use provided template or load the default one
  const template = htmlTemplate || getNewsletterTemplate();

  const html = template
    .replace(/{{MONTH}}/g, MONTH)
    .replace(/{{YEAR}}/g, String(YEAR))
    .replace(/{{ISSUE_NUMBER}}/g, ISSUE);

  await resend.emails.send({
    from: "Rx Systems <newsletter@rxdev.org>",
    to,
    subject: `Rx Systems Newsletter — ${MONTH} ${YEAR}`,
    html
  });
}
