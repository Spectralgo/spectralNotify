import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

const loginSearchSchema = z.object({
  redirectTo: z.string().optional(),
});

export const Route = createFileRoute("/_auth/login")({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);
  const { redirectTo } = Route.useSearch();

  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} redirectTo={redirectTo} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} redirectTo={redirectTo} />
  );
}
