export function getNewsletterIssue() {
  const now = new Date();
  const year = now.getFullYear();
  const monthNumber = String(now.getMonth() + 1).padStart(2, "0"); // 01–12
  const monthName = now.toLocaleString("en-GB", { month: "long" });
  return {
    ISSUE: `${year}.${monthNumber}`, // 2026.02
    YEAR: year,
    MONTH: monthName
  };
}
