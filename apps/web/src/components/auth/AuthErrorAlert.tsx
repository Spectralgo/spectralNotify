import { AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthErrorAlertProps {
  error: string | null;
}

export function AuthErrorAlert({ error }: AuthErrorAlertProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          initial={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Alert
            className="border-red-500/20 bg-red-500/10 text-red-400"
            variant="destructive"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
