import { isDefinedError } from "@orpc/client";
import { formatDistanceToNow } from "date-fns";
import { Minus, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useCounterHistory,
  useCounterMetadata,
  useDecrementCounter,
  useDeleteCounter,
  useIncrementCounter,
  useResetCounter,
  useSetCounterValue,
} from "@/hooks/use-counters";
import { CounterHistoryTimeline } from "./counter-history-timeline";

interface CounterDetailPanelProps {
  counterName: string;
  onDelete?: () => void;
}

export function CounterDetailPanel({
  counterName,
  onDelete,
}: CounterDetailPanelProps) {
  const [customValue, setCustomValue] = useState<string>("");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [valueChangeDirection, setValueChangeDirection] = useState<
    "up" | "down" | null
  >(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const { data: metadata, isLoading } = useCounterMetadata(counterName);
  const { data: history } = useCounterHistory(counterName, 50);

  // Track value changes for animations
  useEffect(() => {
    if (metadata?.value !== undefined && previousValue !== null) {
      if (metadata.value > previousValue) {
        setValueChangeDirection("up");
      } else if (metadata.value < previousValue) {
        setValueChangeDirection("down");
      }
      // Reset animation after a short delay
      const timer = setTimeout(() => setValueChangeDirection(null), 600);
      return () => clearTimeout(timer);
    }
    if (metadata?.value !== undefined) {
      setPreviousValue(metadata.value);
    }
  }, [metadata?.value, previousValue]);

  const incrementMutation = useIncrementCounter();
  const decrementMutation = useDecrementCounter();
  const setValueMutation = useSetCounterValue();
  const resetMutation = useResetCounter();
  const deleteMutation = useDeleteCounter();

  // Handle delete success/error states with useEffect
  useEffect(() => {
    if (deleteMutation.isSuccess) {
      // ✅ Close dialog and clear selection on success
      setIsDeleteDialogOpen(false);
      onDelete?.();
    }
  }, [deleteMutation.isSuccess, onDelete]);

  useEffect(() => {
    if (deleteMutation.isError && deleteMutation.error) {
      // ✅ Re-open dialog on error for retry
      setIsDeleteDialogOpen(true);

      const error = deleteMutation.error;

      // ✅ TYPE-SAFE ERROR HANDLING
      if (isDefinedError(error)) {
        if (error.code === "COUNTER_NOT_FOUND") {
          toast.error("Counter not found");
          return;
        }
        if (error.code === "COUNTER_OPERATION_FAILED") {
          toast.error(`Operation failed: ${error.data.reason}`);
          return;
        }
      }

      // Handle generic errors
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }

      toast.error("Failed to delete counter. Please try again.");
    }
  }, [deleteMutation.isError, deleteMutation.error]);

  // Handle reset success/error states with useEffect
  useEffect(() => {
    if (resetMutation.isSuccess) {
      // ✅ Close dialog on success
      setIsResetDialogOpen(false);
    }
  }, [resetMutation.isSuccess]);

  useEffect(() => {
    if (resetMutation.isError && resetMutation.error) {
      // ✅ Re-open dialog on error for retry
      setIsResetDialogOpen(true);

      const error = resetMutation.error;

      // ✅ TYPE-SAFE ERROR HANDLING
      if (isDefinedError(error)) {
        if (error.code === "COUNTER_NOT_FOUND") {
          toast.error("Counter not found");
          return;
        }
        if (error.code === "COUNTER_OPERATION_FAILED") {
          toast.error(`Operation failed: ${error.data.reason}`);
          return;
        }
      }

      // Handle generic errors
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }

      toast.error("Failed to reset counter. Please try again.");
    }
  }, [resetMutation.isError, resetMutation.error]);

  // Handle increment/decrement/setValue errors with useEffect
  useEffect(() => {
    if (incrementMutation.isError && incrementMutation.error) {
      const error = incrementMutation.error;

      if (isDefinedError(error)) {
        if (error.code === "COUNTER_NOT_FOUND") {
          toast.error("Counter not found");
          return;
        }
        if (error.code === "COUNTER_OPERATION_FAILED") {
          toast.error(`Operation failed: ${error.data.reason}`);
          return;
        }
      }

      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }

      toast.error("Failed to increment counter. Please try again.");
    }
  }, [incrementMutation.isError, incrementMutation.error]);

  useEffect(() => {
    if (decrementMutation.isError && decrementMutation.error) {
      const error = decrementMutation.error;

      if (isDefinedError(error)) {
        if (error.code === "COUNTER_NOT_FOUND") {
          toast.error("Counter not found");
          return;
        }
        if (error.code === "COUNTER_OPERATION_FAILED") {
          toast.error(`Operation failed: ${error.data.reason}`);
          return;
        }
      }

      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }

      toast.error("Failed to decrement counter. Please try again.");
    }
  }, [decrementMutation.isError, decrementMutation.error]);

  useEffect(() => {
    if (setValueMutation.isError && setValueMutation.error) {
      const error = setValueMutation.error;

      if (isDefinedError(error)) {
        if (error.code === "COUNTER_NOT_FOUND") {
          toast.error("Counter not found");
          return;
        }
        if (error.code === "COUNTER_OPERATION_FAILED") {
          toast.error(`Operation failed: ${error.data.reason}`);
          return;
        }
        if (error.code === "COUNTER_VALIDATION_ERROR") {
          toast.error(`Validation error: ${error.data.reason}`);
          return;
        }
      }

      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }

      toast.error("Failed to set counter value. Please try again.");
    }
  }, [setValueMutation.isError, setValueMutation.error]);

  const handleIncrement = () => {
    incrementMutation.mutate({ name: counterName, amount: 1 });
  };

  const handleDecrement = () => {
    decrementMutation.mutate({ name: counterName, amount: 1 });
  };

  const handleSetValue = () => {
    const value = Number.parseInt(customValue, 10);
    if (!Number.isNaN(value)) {
      setValueMutation.mutate({ name: counterName, value });
      setCustomValue("");
    }
  };

  const handleReset = () => {
    setIsResetDialogOpen(false);
    resetMutation.mutate({ name: counterName });
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(false);
    deleteMutation.mutate({ name: counterName });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading counter details...</p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Counter not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Counter Name Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl text-foreground">
            {metadata.name}
          </h2>
          <p className="text-muted-foreground text-sm">
            Updated{" "}
            {formatDistanceToNow(new Date(metadata.updatedAt), {
              addSuffix: true,
            })}
          </p>
        </div>
        <Button
          disabled={deleteMutation.isPending}
          onClick={() => setIsDeleteDialogOpen(true)}
          size="sm"
          variant="destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Current Value Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden py-8 text-center">
            <AnimatePresence mode="popLayout">
              <motion.div
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  color: valueChangeDirection
                    ? valueChangeDirection === "up"
                      ? "hsl(var(--primary))"
                      : "hsl(var(--destructive))"
                    : "hsl(var(--foreground))",
                }}
                className="font-bold text-6xl"
                exit={{ scale: 0.8, opacity: 0 }}
                initial={{
                  scale: 0.8,
                  opacity: 0,
                  y: valueChangeDirection === "up" ? 20 : -20,
                }}
                key={metadata.value}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
              >
                {metadata.value}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Increment/Decrement */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={decrementMutation.isPending}
              onClick={handleDecrement}
              variant="outline"
            >
              <Minus className="mr-2 h-4 w-4" />
              Decrement
            </Button>
            <Button
              className="flex-1"
              disabled={incrementMutation.isPending}
              onClick={handleIncrement}
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Increment
            </Button>
          </div>

          <Separator />

          {/* Set Custom Value */}
          <div className="space-y-2">
            <Label htmlFor="custom-value">Set Custom Value</Label>
            <div className="flex gap-2">
              <Input
                id="custom-value"
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSetValue();
                  }
                }}
                placeholder="Enter value..."
                type="number"
                value={customValue}
              />
              <Button
                disabled={
                  setValueMutation.isPending || customValue.trim() === ""
                }
                onClick={handleSetValue}
              >
                <Save className="mr-2 h-4 w-4" />
                Set
              </Button>
            </div>
          </div>

          <Separator />

          {/* Reset */}
          <Button
            className="w-full"
            disabled={resetMutation.isPending}
            onClick={() => setIsResetDialogOpen(true)}
            variant="secondary"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Zero
          </Button>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Created</span>
            <span className="text-foreground">
              {formatDistanceToNow(new Date(metadata.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Last Updated</span>
            <span className="text-foreground">
              {formatDistanceToNow(new Date(metadata.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Total Operations</span>
            <span className="text-foreground">{metadata.operationCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation History</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterHistoryTimeline history={history} />
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Counter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete counter "{counterName}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog onOpenChange={setIsResetDialogOpen} open={isResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Counter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset counter "{counterName}" to zero?
              This will clear the current value but preserve the counter's
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Reset to Zero
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
