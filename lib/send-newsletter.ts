import { Resend } from "resend";
import { getNewsletterIssue } from "@/lib/newsletterMeta";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNewsletter({
  to,
  htmlTemplate
}: {
  to: string[];
  htmlTemplate: string;
}) {
  const { ISSUE, YEAR, MONTH } = getNewsletterIssue();

  const html = htmlTemplate
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
