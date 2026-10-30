import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="[date]">
      <p>
        These terms apply to Forensicology, run by [Business name] (ABN [ABN]), [address], Australia (&ldquo;we&rdquo;). By using the site you agree to them.
      </p>
      <h2>The game</h2>
      <p>Forensicology is a game. Every case, person, place and organisation in it is fictional. Nothing in it is forensic, legal or medical advice.</p>
      <h2>Accounts</h2>
      <ul>
        <li>You can play the free case without an account. To save progress across devices or appear on leaderboards you need one.</li>
        <li>Keep access to your email account secure; sign-in links are sent there.</li>
        <li>Display names must not impersonate anyone or be offensive. We may change or remove names that are.</li>
      </ul>
      <h2>Purchases</h2>
      <p>
        Paid cases, passes and subscriptions are sold in Australian dollars, including GST. Our goods and services come with guarantees that cannot be
        excluded under the Australian Consumer Law. See the <a href="/refunds" className="underline">refund policy</a>.
      </p>
      <h2>Fair play</h2>
      <p>Don&apos;t attack the site, automate answer guessing, or share solutions in a way that spoils leaderboards. We may remove leaderboard entries we believe were not earned fairly.</p>
      <h2>Content</h2>
      <p>The cases, writing, puzzles and artwork are ours. You may stream or share your play for personal, non-commercial purposes; please avoid publishing full solutions.</p>
      <h2>Liability</h2>
      <p>
        Nothing in these terms excludes rights you have under the Australian Consumer Law. To the extent the law allows, our liability is limited to
        resupplying the service or refunding what you paid for it.
      </p>
      <h2>Contact</h2>
      <p>[contact email]</p>
    </LegalPage>
  );
}
