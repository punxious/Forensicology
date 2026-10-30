import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="[date]">
      <p>
        [Business name] (ABN [ABN]) handles personal information in line with the Australian Privacy Principles in the <em>Privacy Act 1988</em> (Cth)
        and, for players in the EU and UK, the GDPR.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Without an account:</strong> a random identifier in a cookie so your progress is saved in your browser, and your game progress.</li>
        <li><strong>With an account:</strong> your email address, an optional display name, your settings, progress, scores and hint use.</li>
        <li><strong>Purchases (when available):</strong> handled by Stripe. We receive a record of what you bought, not your card details.</li>
        <li><strong>Usage analytics:</strong> cookieless, aggregate page and funnel counts. No advertising trackers, ever.</li>
        <li><strong>Security logs:</strong> IP addresses are used briefly for rate limiting and abuse prevention.</li>
      </ul>
      <h2>Why</h2>
      <p>To run the game, save your progress, show leaderboards you opt into, process purchases, prevent abuse, and (only if you tick the box) email you about new cases.</p>
      <h2>Who processes it for us</h2>
      <ul>
        <li>Supabase: database and sign-in, hosted in Sydney, Australia.</li>
        <li>Vercel: website hosting.</li>
        <li>Stripe: payments (when available).</li>
        <li>[Email provider]: sign-in and opted-in emails.</li>
        <li>[Analytics provider]: cookieless analytics.</li>
        <li>[Error monitoring provider]: crash reports.</li>
      </ul>
      <p>Some of these providers may process data outside Australia. We choose providers with appropriate safeguards.</p>
      <h2>Leaderboards</h2>
      <p>You only appear on leaderboards if you opt in, and only with the display name you choose. Your email is never shown.</p>
      <h2>Your choices</h2>
      <ul>
        <li>Change your display name, leaderboard and email preferences on your account page at any time.</li>
        <li>Delete your account and all your progress from your account page. It takes effect immediately.</li>
        <li>Ask for a copy of your information or correct it by emailing [privacy contact email].</li>
      </ul>
      <h2>Complaints</h2>
      <p>Contact us first at [privacy contact email]. If you&apos;re not satisfied, you can complain to the Office of the Australian Information Commissioner (oaic.gov.au).</p>
    </LegalPage>
  );
}
