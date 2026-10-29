import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Home = __DummyIcon;
const Instagram = __DummyIcon;



export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 text-xs">
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-foreground">Contact Us</h1>
        <p className="text-sm text-muted-foreground mb-8">Reach out to us through any of the following channels.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs sm:text-sm">
              <p className="text-muted-foreground mb-1">For general inquiries and support:</p>
              <a href="mailto:support@mingree.com" className="text-foreground hover:underline font-medium">
                support@mingree.com
              </a>
              <p className="text-muted-foreground mt-3 mb-1">For business partnerships:</p>
              <a href="mailto:business@mingree.com" className="text-foreground hover:underline font-medium">
                business@mingree.com
              </a>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs sm:text-sm">
              <p className="text-muted-foreground leading-relaxed">
                We typically respond to all inquiries within 24-48 hours during business days. For urgent matters, please mention "URGENT" in your email subject.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">
                Office Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs sm:text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">LAKHWINDER Singh / MusicLand Studios</strong><br />
                (Brand: Mingree)<br />
                India
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs sm:text-sm">
              <p className="text-muted-foreground leading-relaxed">
                Monday - Friday: 10:00 AM - 6:00 PM IST<br />
                Saturday: 10:00 AM - 2:00 PM IST<br />
                Sunday: Closed
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4 text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <h3 className="font-semibold mb-1 text-foreground">How do I reset my password?</h3>
              <p className="text-muted-foreground">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-foreground">How long does withdrawal take?</h3>
              <p className="text-muted-foreground">Withdrawals are processed within 2-3 business days after admin approval.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-foreground">How do I link my Instagram account?</h3>
              <p className="text-muted-foreground">Go to your Profile page and connect your handle or use Instagram login to connect your account.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
