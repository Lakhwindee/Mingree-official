interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ message = "Loading...", fullScreen = true }: LoadingScreenProps) {
  const containerClass = fullScreen 
    ? "min-h-screen flex items-center justify-center bg-background"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClass}>
      <div className="text-center space-y-2">
        <div className="h-6 w-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-xs">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5", 
    lg: "h-7 w-7"
  }[size];

  return <div className={`${sizeClass} border-2 border-foreground border-t-transparent rounded-full animate-spin`} />;
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
