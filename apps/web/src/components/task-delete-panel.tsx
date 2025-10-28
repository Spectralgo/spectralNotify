import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { useDeleteTask } from "@/hooks/use-delete-tasks";

interface TaskDeletePanelProps {
  taskId: string;
  onDelete: () => void;
}

export function TaskDeletePanel({ taskId, onDelete }: TaskDeletePanelProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteMutation = useDeleteTask();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(taskId);
      toast.success(`Task ${taskId} deleted successfully`);
      onDelete();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete task: ${errorMessage}`);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-foreground text-sm">Delete Task</h4>
          <p className="mt-1 text-muted-foreground text-xs">
            Permanently delete this task and all its data from the Durable
            Object storage. This action cannot be undone.
          </p>
        </div>

        <Button
          className="w-full"
          disabled={deleteMutation.isPending}
          onClick={() => setIsDeleteDialogOpen(true)}
          variant="destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
        </Button>

        <AlertDialog
          onOpenChange={setIsDeleteDialogOpen}
          open={isDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete task <strong>{taskId}</strong> and
                clear all its Durable Object storage including:
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Task metadata and status</li>
                  <li>Complete event history</li>
                  <li>WebSocket connections</li>
                  <li>Registry entry</li>
                </ul>
                <p className="mt-2 font-semibold text-destructive">
                  This action cannot be undone.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete Task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
