import { Link } from "wouter";
import { Button } from "@/components/ui/button";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Users = __DummyIcon;
const Home = __DummyIcon;
const Instagram = __DummyIcon;
const User = __DummyIcon;



export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 text-xs">
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 6, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Business Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              This website (<a href="https://mingree.com" className="text-primary hover:underline">mingree.com</a>) is owned and operated by <strong>MINGREE</strong>, a <strong>Proprietary (Sole Proprietorship)</strong> enterprise owned by <strong>Shri Lakhwinder Singh (Proprietor)</strong>, registered under MSME Udyam Registration Number <strong>UDYAM-PB-20-0059364</strong> (Business Activity: <strong>Services</strong>; NIC Code: <strong>73100 – Advertising Services</strong>). By using this platform, you are entering into an agreement with <strong>MINGREE</strong> (Proprietor: <strong>Lakhwinder Singh</strong>). All references to "we", "us", "our", or "MINGREE" refer to this sole proprietorship enterprise.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Website: <a href="https://mingree.com" className="text-primary hover:underline">https://mingree.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Mingree ("the Platform"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mingree is an influencer marketing platform that connects Instagram creators with brands and sponsors for promotional campaigns. Our services include campaign discovery, content submission, payment processing, and wallet management.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Age Requirement (13+)</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least <strong>13 years of age</strong> to create an account and use Mingree. Users under 13 are not permitted to access or register on the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users must register for an account to access our services. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Creator Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Creators must have a valid Instagram account that meets minimum follower and authenticity requirements to participate in campaigns. Creators agree to submit original content that complies with campaign requirements, ASCI paid-partnership disclosure norms, and Instagram's community guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Sponsor/Brand Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sponsors must maintain sufficient wallet balance to fund campaigns. Campaign payments are processed through our secure escrow payment system. Sponsors agree to review and approve/reject submissions within a reasonable timeframe.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Payments and Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments are processed in Indian Rupees (INR). Platform fees and applicable GST apply as displayed in campaign billing and withdrawal summaries as per Indian tax regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Content submitted by creators remains their intellectual property. By submitting content, creators grant sponsors a license to use the content for promotional purposes as specified in the campaign.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users may not engage in fraudulent activities, create fake accounts, submit plagiarized content, or violate any applicable laws. Violation of these terms may result in account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mingree shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions regarding these terms, please contact us at support@mingree.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
