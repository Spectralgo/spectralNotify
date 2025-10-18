import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthLoadingButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: string;
}

export function AuthLoadingButton({
  isLoading = false,
  loadingText = "Loading...",
  children,
  disabled,
  className,
  variant = "default",
  ...props
}: AuthLoadingButtonProps) {
  return (
    <Button
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        className
      )}
      disabled={disabled || isLoading}
      variant={variant}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
