import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { counterRouter } from "./counter/counter.router";
import { tasksRouter } from "./tasks/tasks.router";
import { workflowsRouter } from "./workflows/workflows.router";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  tasks: tasksRouter,
  workflows: workflowsRouter,
  counter: counterRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
