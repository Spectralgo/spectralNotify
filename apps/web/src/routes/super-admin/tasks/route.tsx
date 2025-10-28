import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin/tasks")({
  component: () => <div>Super Admin Tasks</div>,
});
