import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  Mail,
  FileText,
  UserCheck,
  Instagram,
  Database,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

export default function Privacy() {
  const [activeSection, setActiveSection] = useState<string>("intro");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans selection:bg-rose-500 selection:text-white">
      {/* 1. Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
              alt="Mingree Logo"
              className="w-8 h-8 rounded-xl object-cover shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900">Mingree</span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Legal &amp; Privacy
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Title Banner */}
      <div className="border-b border-slate-200 bg-white py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>Digital Personal Data Protection (DPDP) Compliance Notice</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            This Privacy Policy explains how Mingree.com collects, processes, protects, and stores
            personal data for Creators, Influencers, and Brand Sponsors in accordance with the
            Digital Personal Data Protection Act (DPDP Act), 2023 of India and applicable rules.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 font-medium">
            <span>Last Updated: November 2026</span>
            <span aria-hidden="true">·</span>
            <span>Version: 2.1 (India DPDP Compliant)</span>
          </div>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Navigation / Quick Links Pills */}
        <div className="mb-10 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Navigation
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {[
              { id: "collection", label: "1. Information We Collect" },
              { id: "purpose", label: "2. Why We Collect It" },
              { id: "instagram", label: "3. Instagram & Meta Permissions" },
              { id: "security", label: "4. Storage & Security" },
              { id: "retention", label: "5. Retention & Deletion" },
              { id: "rights", label: "6. Your DPDP Rights" },
              { id: "sharing", label: "7. Third-Party Sharing" },
              { id: "cookies", label: "8. Cookies & Analytics" },
              { id: "grievance", label: "9. Grievance Redressal" },
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollTo(sec.id)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition cursor-pointer text-slate-700"
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legal Text Sections */}
        <div className="space-y-12 bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs text-slate-800 leading-relaxed text-sm sm:text-base">
          {/* Section 1: Overview */}
          <section id="collection" className="space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 1</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              1. Personal Information We Collect
            </h2>
            <p className="text-slate-600">
              Mingree ("Mingree", "we", "us", or "our") operates a technology platform connecting
              verified content creators and social media influencers with brand partners and music
              sponsors. To provide verified matching, campaign management, and automated payout
              services, we collect specific categories of personal data:
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-rose-600" />
                  A. Identity and Contact Information
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Full name, email address, mobile phone number, profile avatar picture, and
                  account login credentials. Mobile phone numbers are verified via One-Time Password
                  (OTP) for account security and two-factor identity protection.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  B. Social Media Profile &amp; Audience Statistics
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Instagram username/handle, official account connection identifier, public profile
                  information, verified follower count, average/median Reel views, engagement rates,
                  media count, and geographic audience distribution percentages (e.g., percentage of
                  Indian audience).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  C. Geographic and Demographic Information
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  City, state, country, preferred content languages, and primary content genres
                  (e.g., Music, Lifestyle, Fashion, Fitness). This allows brands to target local
                  Indian regional creator cohorts.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  D. Tax, Billing &amp; Compliance Identifiers
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  For creators qualifying for commercial payouts: Permanent Account Number (PAN) for
                  TDS (Tax Deducted at Source) compliance under the Indian Income Tax Act. For brands
                  and registered entities: Legal company name, billing address, and Goods and
                  Services Tax Identification Number (GSTIN) for tax invoice generation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  E. Banking, UPI and Payout Records
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Bank account number, bank name, IFSC code, and Virtual Payment Address (UPI ID)
                  provided by creators for receiving earnings. Complete credit/debit card numbers and
                  net banking passwords are never captured or stored on Mingree servers; all card
                  transactions are handled directly by RBI-authorized payment aggregators (such as
                  Cashfree Payments).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-600" />
                  F. Campaign Deliverables &amp; Transaction History
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Campaign briefs, submitted Instagram Reel links, draft video uploads, review
                  status, chat communications inside campaign workspaces, wallet balances, payment
                  reservation records, invoice receipts, and withdrawal logs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Purpose */}
          <section id="purpose" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 2</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              2. Why We Collect Information &amp; How It Is Used
            </h2>
            <p className="text-slate-600">
              Under the Digital Personal Data Protection Act, 2023, we process your personal data
              only for specified, lawful purposes for which you have provided affirmative consent or
              as required by applicable Indian law:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-700 text-xs sm:text-sm">
              <li>
                <strong>Account Creation &amp; Authentication:</strong> To create and manage your
                creator or brand sponsor profile, verify mobile numbers with secure OTPs, and
                authenticate your sessions.
              </li>
              <li>
                <strong>Marketplace Matching &amp; Search:</strong> To display verified follower tiers,
                median views, and cities to prospective brand advertisers looking to hire influencers
                for campaigns.
              </li>
              <li>
                <strong>Campaign Execution &amp; Workflow:</strong> To enable direct booking, brief
                sharing, draft submission reviews, and 48-hour approval turnaround windows in campaign
                workspaces.
              </li>
              <li>
                <strong>Automated Payouts &amp; Withdrawals:</strong> To transfer earned compensation
                directly to your bank account or UPI ID via authorized payment partners.
              </li>
              <li>
                <strong>Statutory Tax Invoicing &amp; GST Compliance:</strong> To generate legally
                valid GST invoices and compute applicable TDS deductions in accordance with Indian
                commercial laws.
              </li>
              <li>
                <strong>Fraud Prevention &amp; Platform Integrity:</strong> To prevent duplicate
                accounts, detect automated bot activity, and ensure verified Instagram analytics.
              </li>
            </ul>
          </section>

          {/* Section 3: Instagram Data */}
          <section id="instagram" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 3</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              3. Instagram Data &amp; Connected Account Permissions
            </h2>
            <p className="text-slate-600">
              Mingree enables creators to link their official Instagram profiles via Meta's secure
              OAuth protocol. We strictly observe Meta Platform Policies:
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Read-Only Metric Access:</strong> We only request read permissions to
                  verify follower count, public profile data, median Reel view counts, and engagement
                  ratios.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>No Unauthorized Posting:</strong> Mingree will never publish posts, reels,
                  stories, or messages to your Instagram account on your behalf without your explicit
                  action.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Revocable Anytime:</strong> You can disconnect your Instagram profile at
                  any time from your Creator Settings page or directly through your Meta / Instagram
                  Security Settings. Disconnecting immediately terminates active access tokens.
                </span>
              </div>
            </div>
          </section>

          {/* Section 4: Storage & Security */}
          <section id="security" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 4</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              4. Database Storage, Security Measures &amp; Encryption
            </h2>
            <p className="text-slate-600">
              We employ industry-standard technical and organizational safeguards to ensure your
              personal data is protected against unauthorized access, alteration, loss, or misuse:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  Encryption in Transit &amp; at Rest
                </div>
                <p className="text-xs text-slate-600">
                  All traffic is encrypted using Transport Layer Security (TLS 1.3 / HTTPS). Sensitive
                  passwords are cryptographically salted and hashed using bcrypt.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Role-Based Access Control (RBAC)
                </div>
                <p className="text-xs text-slate-600">
                  Access to user databases and payout credentials is strictly restricted to
                  authorized platform personnel on a need-to-know basis.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  Secure In-Country Cloud Servers
                </div>
                <p className="text-xs text-slate-600">
                  Primary databases are hosted in enterprise data centers ensuring high availability,
                  automated snapshots, and disaster recovery.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  Comprehensive Security Audit Logs
                </div>
                <p className="text-xs text-slate-600">
                  Administrative operations, wallet payouts, and profile status updates are recorded
                  in immutable security audit logs for forensic accountability.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Retention & Deletion */}
          <section id="retention" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 5</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              5. Data Retention Periods &amp; Secure Deletion Procedures
            </h2>
            <p className="text-slate-600">
              We retain personal data only for as long as necessary to fulfill the operational purposes
              outlined in this policy or as mandated by statutory Indian regulations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-xs sm:text-sm">
              <li>
                <strong>Active Account Data:</strong> Maintained for the active duration of your
                creator or brand account.
              </li>
              <li>
                <strong>Financial &amp; Tax Records:</strong> In accordance with Indian tax laws (such
                as the Income Tax Act, 1961 and GST Regulations), transaction invoices and payout
                records are retained for statutory audit periods (typically 7–8 years).
              </li>
              <li>
                <strong>Inactive or Closed Accounts:</strong> Upon an approved account deletion
                request, non-financial identifying data is permanently erased or irreversibly
                anonymized within thirty (30) days.
              </li>
            </ul>
          </section>

          {/* Section 6: User Rights under DPDP Act */}
          <section id="rights" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 6</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              6. Your Rights Under India's DPDP Act, 2023
            </h2>
            <p className="text-slate-600">
              As a Data Principal under India's Digital Personal Data Protection Act, 2023, you are
              entitled to the following legal rights:
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Right to Access Summary:</strong> You may request a summary of the personal
                data processed by us and the identities of third parties with whom it has been shared.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Right to Correction &amp; Updation:</strong> You can edit or correct any
                inaccurate, incomplete, or out-of-date personal information through your profile
                settings or by contacting our team.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Right to Erasure / Deletion:</strong> You may request the permanent deletion
                of your personal data when it is no longer necessary for the purpose it was collected,
                subject to legal retention requirements.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Right to Withdraw Consent:</strong> Where processing is based on consent, you
                have the right to withdraw your consent at any time without retroactive effect.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Right to Grievance Redressal:</strong> You may submit complaints regarding the
                processing of your data directly to our designated Grievance Officer.
              </div>
            </div>
          </section>

          {/* Section 7: Third-Party Sharing */}
          <section id="sharing" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 7</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              7. When Information May Be Shared
            </h2>
            <p className="text-slate-600">
              We never sell or lease your personal information to third-party data brokers. Data is
              shared strictly in the following necessary contexts:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-xs sm:text-sm">
              <li>
                <strong>Payment Aggregators &amp; Banking Partners:</strong> Shared with RBI-regulated
                entities (such as Cashfree, UPI networks, and nodal banking partners) to execute
                wallet deposits, UPI payouts, and fraud monitoring.
              </li>
              <li>
                <strong>Campaign Counterparties:</strong> Brands receive creator handles, city, tier,
                and performance metrics. Creators receive brand guidelines and campaign briefs. Direct
                banking details are never shared between brands and creators.
              </li>
              <li>
                <strong>Meta / Instagram APIs:</strong> Verified API exchanges to authenticate
                profile handles and refresh analytics.
              </li>
              <li>
                <strong>Statutory &amp; Law Enforcement Authorities:</strong> When required by a valid
                court order, subpoena, or lawful request under applicable Indian legislation.
              </li>
            </ul>
          </section>

          {/* Section 8: Cookies & Analytics */}
          <section id="cookies" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 8</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              8. Cookies, Local Storage &amp; Session Analytics
            </h2>
            <p className="text-slate-600">
              Mingree utilizes essential cookies and local browser storage strictly to ensure platform
              functionality:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-xs sm:text-sm">
              <li>
                <strong>Authentication &amp; Session Security:</strong> Secure HTTP-only cookies and
                tokens to maintain logged-in creator and sponsor sessions.
              </li>
              <li>
                <strong>Preferences:</strong> To remember UI preferences such as language, theme,
                and creator filtering choices.
              </li>
              <li>
                <strong>Performance &amp; Diagnostics:</strong> Anonymous diagnostic telemetry to
                detect server latency, prevent DDoS attacks, and improve mobile browser compatibility.
              </li>
            </ul>
          </section>

          {/* Section 9: Grievance Redressal */}
          <section id="grievance" className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 9</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              9. Grievance Redressal &amp; Privacy Contact
            </h2>
            <p className="text-slate-600">
              In accordance with the Information Technology Act, 2000 and the Digital Personal Data
              Protection Act, 2023, Mingree has designated a Grievance Officer to address data
              protection queries, correction requests, and grievances:
            </p>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-sm">
                Data Protection &amp; Grievance Redressal Officer
              </div>
              <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                <div>
                  <strong>Platform:</strong> Mingree Influencer Marketing Platform
                </div>
                <div>
                  <strong>Official Privacy Contact:</strong>{" "}
                  <a
                    href="mailto:privacy@mingree.com"
                    className="text-rose-600 hover:underline font-semibold"
                  >
                    privacy@mingree.com
                  </a>
                </div>
                <div>
                  <strong>Grievance Desk:</strong>{" "}
                  <a
                    href="mailto:grievance@mingree.com"
                    className="text-rose-600 hover:underline font-semibold"
                  >
                    grievance@mingree.com
                  </a>
                </div>
                <div>
                  <strong>Response Timeline:</strong> We acknowledge requests within 48 hours and
                  aim to resolve grievances within thirty (30) business days.
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex items-start gap-3 text-xs sm:text-sm text-rose-900">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Need Account or Data Deletion?</strong> You can submit an automated deletion
                request by visiting our{" "}
                <Link href="/data-deletion" className="font-bold underline text-rose-700">
                  Data Deletion Instructions
                </Link>{" "}
                or emailing{" "}
                <a href="mailto:privacy@mingree.com" className="font-bold underline">
                  privacy@mingree.com
                </a>
                .
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 4. Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
              alt="Mingree Logo"
              className="w-5 h-5 rounded-md object-cover"
            />
            <span>© {new Date().getFullYear()} Mingree.com. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-slate-600">
            <Link href="/" className="hover:text-rose-600">
              Home
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="hover:text-rose-600">
              Terms of Service
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/refunds" className="hover:text-rose-600">
              Refund Policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/data-deletion" className="hover:text-rose-600">
              Data Deletion
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/contact" className="hover:text-rose-600">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
