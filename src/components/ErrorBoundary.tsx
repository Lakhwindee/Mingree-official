import React, { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Home = __DummyIcon;



interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full border-border">
            <CardContent className="pt-6 text-center space-y-4">
              <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                We encountered an unexpected error. Please try again or go back to the home page.
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre className="text-left text-xs bg-muted p-3 rounded overflow-auto max-h-32 text-foreground font-mono">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-2.5 justify-center pt-2">
                <Button variant="outline" size="sm" onClick={this.handleRetry} data-testid="button-retry">
                  Try Again
                </Button>
                <Button size="sm" onClick={this.handleGoHome} data-testid="button-go-home">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
