import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Refund policy" };

export default function Refunds() {
  return (
    <LegalPage title="Refund policy" updated="[date]">
      <p>
        Our products come with guarantees that cannot be excluded under the Australian Consumer Law. If a case or service has a major failure, for example
        it can&apos;t be completed because of a fault on our side, you&apos;re entitled to a refund. For minor problems, we&apos;ll fix them within a reasonable time,
        and if we can&apos;t, you can ask for a refund.
      </p>
      <h2>Beyond what the law requires</h2>
      <ul>
        <li>[Your goodwill policy, e.g. a refund on request within 14 days if you haven&apos;t completed the case.]</li>
        <li>Subscriptions: cancel any time; you keep access until the end of the period you paid for. [Pro-rata refunds: yes/no.]</li>
        <li>Team sessions: [policy for sessions that haven&apos;t started].</li>
      </ul>
      <h2>How to ask</h2>
      <p>Email [support email] with the email address on your account and what went wrong. Refunds go back to the original payment method, usually within 5–10 business days.</p>
      <h2>Gift codes</h2>
      <p>[Gift code refund rules.]</p>
    </LegalPage>
  );
}
