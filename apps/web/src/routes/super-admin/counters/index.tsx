import { isDefinedError } from "@orpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CounterDetailPanel } from "@/components/counter-detail-panel";
import { CounterListItem } from "@/components/counter-list-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCounter, useListAllCounters } from "@/hooks/use-counters";

export const Route = createFileRoute("/super-admin/counters/")({
  component: CountersPage,
});

function CountersPage() {
  const [selectedCounter, setSelectedCounter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCounterName, setNewCounterName] = useState("");

  const createMutation = useCreateCounter();
  const { data: countersData, isLoading } = useListAllCounters();

  const counterList = countersData?.counters.map((c) => c.name) || [];

  // Handle UI state changes based on mutation status
  useEffect(() => {
    if (createMutation.isSuccess && createMutation.data) {
      // ✅ Close dialog and select new counter on success
      setIsCreateDialogOpen(false);
      setNewCounterName("");
      setSelectedCounter(createMutation.data.name);
    }
  }, [createMutation.isSuccess, createMutation.data]);

  useEffect(() => {
    if (createMutation.isError && createMutation.error) {
      // ✅ Re-open dialog on error for retry
      setIsCreateDialogOpen(true);
      // Keep the counter name in the form for easy retry

      const error = createMutation.error;

      // ✅ TYPE-SAFE ERROR HANDLING with specific messages
      if (isDefinedError(error)) {
        if (error.code === "COUNTER_VALIDATION_ERROR") {
          toast.error(`Validation error: ${error.data.reason}`);
          return;
        }
        if (error.code === "COUNTER_OPERATION_FAILED") {
          toast.error(`Operation failed: ${error.data.reason}`);
          return;
        }
      }

      // Handle Zod validation errors
      if (error instanceof Error) {
        if (error.message.includes("Counter name")) {
          toast.error(error.message);
          return;
        }
        // Handle database unique constraint error
        if (
          error.message.toLowerCase().includes("unique") ||
          error.message.toLowerCase().includes("already exists")
        ) {
          toast.error(`Counter "${newCounterName}" already exists`);
          return;
        }
      }

      toast.error("Failed to create counter. Please try again.");
    }
  }, [createMutation.isError, createMutation.error, newCounterName]);

  const handleCreateCounter = () => {
    if (!newCounterName.trim()) {
      return;
    }

    createMutation.mutate({ name: newCounterName.trim() });
  };

  const handleDeleteCounter = () => {
    // Clear selection when counter is deleted
    setSelectedCounter(null);
  };

  const filteredCounters = counterList.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl text-foreground">
            Counter Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage Durable Object counters
          </p>
        </div>

        <Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Counter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Counter</DialogTitle>
              <DialogDescription>
                Enter a unique name for your counter. Only letters, numbers,
                hyphens, and underscores are allowed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="counter-name">Counter Name</Label>
                <Input
                  id="counter-name"
                  onChange={(e) => setNewCounterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateCounter();
                    }
                  }}
                  placeholder="my-counter"
                  value={newCounterName}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setIsCreateDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={createMutation.isPending || !newCounterName.trim()}
                onClick={handleCreateCounter}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List + Detail Panel Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Panel - Counter List */}
        <Card className="p-4 lg:col-span-1">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search counters..."
                value={searchQuery}
              />
            </div>

            {/* Counter List */}
            <div className="space-y-1">
              {isLoading ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Loading counters...
                  </p>
                </div>
              ) : filteredCounters.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    {counterList.length === 0
                      ? "No counters yet. Create one to get started!"
                      : "No counters match your search"}
                  </p>
                </div>
              ) : (
                filteredCounters.map((name) => (
                  <CounterListItem
                    isActive={selectedCounter === name}
                    key={name}
                    name={name}
                    onClick={() => setSelectedCounter(name)}
                  />
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Right Panel - Counter Detail */}
        <div className="lg:col-span-2">
          {selectedCounter ? (
            <CounterDetailPanel
              counterName={selectedCounter}
              onDelete={handleDeleteCounter}
            />
          ) : (
            <Card className="p-12">
              <div className="space-y-2 text-center">
                <p className="font-medium text-foreground text-lg">
                  Select a counter
                </p>
                <p className="text-muted-foreground text-sm">
                  Choose a counter from the list to view and manage it
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
