import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent", className)}
      {...props}
    />
  )
}

export { Spinner }
