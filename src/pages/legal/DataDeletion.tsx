import { Link } from "wouter";
import { Button } from "@/components/ui/button";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Settings = __DummyIcon;
const Home = __DummyIcon;
const Instagram = __DummyIcon;
const User = __DummyIcon;



export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 text-xs">
            Back to Home
          </Button>
        </Link>

        <div className="mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            User Data Deletion Instructions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meta Platform Compliant Data Deletion Request & Instructions
          </p>
        </div>

        <p className="text-xs text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground">
          <section className="p-5 rounded-lg border border-border bg-card">
            <h2 className="text-lg font-bold mb-2 text-foreground">
              Overview
            </h2>
            <p className="leading-relaxed text-xs sm:text-sm text-muted-foreground">
              Mingree is an influencer marketing platform operated by <strong>LAKHWINDER Singh / MusicLand Studios</strong>.
              In accordance with Meta's Platform Terms and GDPR/data privacy regulations, users have the right to request the deletion of all data associated with their Instagram account that was provided to or stored by Mingree.
            </p>
          </section>

          <section className="p-5 rounded-lg border border-border bg-card space-y-3">
            <h2 className="text-lg font-bold text-foreground">Method 1: Automatic Deletion via Instagram (Recommended)</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              You can instantly revoke Mingree's access and trigger automatic removal directly from your Instagram or Facebook account:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-muted-foreground pl-2">
              <li>Open the <strong>Instagram</strong> app or visit <strong>instagram.com</strong> and log in.</li>
              <li>Navigate to your profile &gt; tap the menu icon (three lines) &gt; <strong>Settings and privacy</strong>.</li>
              <li>Tap <strong>Website permissions</strong> &gt; <strong>Apps and websites</strong>.</li>
              <li>Under the <strong>Active</strong> tab, locate <strong>Mingree</strong>.</li>
              <li>Click or tap <strong>Remove</strong>.</li>
            </ol>
            <p className="text-xs text-muted-foreground italic">
              Once removed, Meta automatically notifies our server via the deauthorization webhook to clear your connected tokens and profile metadata.
            </p>
          </section>

          <section className="p-5 rounded-lg border border-border bg-card space-y-3">
            <h2 className="text-lg font-bold text-foreground">Method 2: In-App Disconnect</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              If you have access to your Mingree dashboard:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-muted-foreground pl-2">
              <li>Log in to your Mingree account.</li>
              <li>Go to <strong>Profile Settings</strong> or the <strong>Dashboard</strong>.</li>
              <li>Locate your connected Instagram account card.</li>
              <li>Click <strong>Disconnect</strong>. All OAuth tokens and associated Instagram metrics are purged immediately from your account.</li>
            </ol>
          </section>

          <section className="p-5 rounded-lg border border-border bg-card space-y-3">
            <h2 className="text-lg font-bold text-foreground">Method 3: Direct Manual Data Erasure Request</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              If you wish to have all your personal records, campaigns history, and account data completely erased from our database:
            </p>
            <div className="p-4 rounded bg-muted/40 border border-border space-y-1.5 text-xs sm:text-sm">
              <p className="font-semibold text-foreground">
                Email our Privacy Officer:
              </p>
              <p className="font-mono text-foreground font-semibold">
                support@mingree.com
              </p>
              <p className="text-xs text-muted-foreground">
                Please include your registered email address and Instagram handle with the subject line <em>"Data Deletion Request"</em>. We will process your erasure request and issue a confirmation code within 48 hours.
              </p>
            </div>
          </section>

          <section className="p-5 rounded-lg border border-border bg-card">
            <h2 className="text-lg font-bold mb-2 text-foreground">Data Retention Notice</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Upon receiving a verified deletion request, all personal identifiers, Instagram IDs, OAuth tokens, and analytics are permanently removed from production databases. Financial transaction records may be retained only for the duration required by applicable taxation and accounting laws.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
