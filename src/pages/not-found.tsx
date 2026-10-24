import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Home = __DummyIcon;



export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg mx-4 border-border">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="text-6xl font-bold text-muted-foreground/30 mb-4">404</div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Page Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.history.back()} data-testid="button-go-back">
              Go Back
            </Button>
            <Link href="/">
              <Button size="sm" data-testid="button-home">
                Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
