import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "motion/react";

interface AuthErrorAlertProps {
	error: string | null;
}

export function AuthErrorAlert({ error }: AuthErrorAlertProps) {
	return (
		<AnimatePresence>
			{error && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
				>
					<Alert
						variant="destructive"
						className="bg-red-500/10 border-red-500/20 text-red-400"
					>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
