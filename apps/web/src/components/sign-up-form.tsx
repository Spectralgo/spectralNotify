import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { AuthErrorAlert } from "./auth/AuthErrorAlert";
import { AuthLoadingButton } from "./auth/AuthLoadingButton";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const [error, setError] = useState("");

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      setError("");
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign up successful");
          },
          onError: (err) => {
            const errorMessage =
              err.error.message || err.error.statusText || "An error occurred";
            setError(errorMessage);
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900">
      {/* Background pattern */}
      <svg
        aria-hidden="true"
        className="-z-10 absolute inset-0 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
      >
        <defs>
          <pattern
            height={200}
            id="auth-grid-pattern"
            patternUnits="userSpaceOnUse"
            width={200}
            x="50%"
            y={-1}
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <svg className="overflow-visible fill-gray-800/20" x="50%" y={-1}>
          <path
            d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          fill="url(#auth-grid-pattern)"
          height="100%"
          strokeWidth={0}
          width="100%"
        />
      </svg>

      {/* Gradient orb */}
      <div
        aria-hidden="true"
        className="-z-10 -translate-x-1/2 absolute top-0 left-[calc(50%-30rem)] transform-gpu blur-3xl"
      >
        <div
          className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-emerald-400 to-teal-500 opacity-20"
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="w-full px-6 py-8">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn("mx-auto w-full max-w-md")}
          initial={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Logo at top */}
          <div className="mb-8 block text-center">
            <h1 className="relative inline-flex items-baseline font-bold text-3xl">
              <span className="text-white tracking-tight">
                Spectral
                <span className="bg-gradient-to-tr from-emerald-400 to-teal-600 bg-clip-text text-transparent">
                  Notify
                </span>
              </span>
            </h1>
          </div>

          <Card className="overflow-hidden rounded-xl border border-white/10 bg-gray-800/50 shadow-2xl backdrop-blur-xl">
            <CardContent className="p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <h2 className="font-bold text-2xl text-white tracking-tight">
                      Create an account
                    </h2>
                    <p className="mt-2 text-gray-400">
                      Get started with your new account
                    </p>
                  </div>

                  <div className="space-y-4">
                    <form.Field name="name">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label
                            className="font-medium text-gray-200 text-sm"
                            htmlFor={field.name}
                          >
                            Full Name
                          </Label>
                          <Input
                            autoComplete="name"
                            className="min-h-[44px] border-white/10 bg-white/5 text-base text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="John Doe"
                            required
                            type="text"
                            value={field.state.value}
                          />
                          {field.state.meta.errors.map((err) => (
                            <p
                              className="text-red-400 text-sm"
                              key={err?.message}
                            >
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="email">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label
                            className="font-medium text-gray-200 text-sm"
                            htmlFor={field.name}
                          >
                            Email
                          </Label>
                          <Input
                            autoComplete="email"
                            className="min-h-[44px] border-white/10 bg-white/5 text-base text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="m@example.com"
                            required
                            type="email"
                            value={field.state.value}
                          />
                          {field.state.meta.errors.map((err) => (
                            <p
                              className="text-red-400 text-sm"
                              key={err?.message}
                            >
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="password">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label
                            className="font-medium text-gray-200 text-sm"
                            htmlFor={field.name}
                          >
                            Password
                          </Label>
                          <Input
                            autoComplete="new-password"
                            className="min-h-[44px] border-white/10 bg-white/5 text-base text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Create a strong password"
                            required
                            type="password"
                            value={field.state.value}
                          />
                          <p className="flex items-center gap-1 text-gray-500 text-xs">
                            <Info className="h-3 w-3" />
                            Password must be 8-128 characters
                          </p>
                          {field.state.meta.errors.map((err) => (
                            <p
                              className="text-red-400 text-sm"
                              key={err?.message}
                            >
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>
                  </div>

                  <AuthErrorAlert error={error} />

                  <form.Subscribe>
                    {(state) => (
                      <AuthLoadingButton
                        className="min-h-[44px] w-full bg-emerald-600 font-semibold text-white hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98]"
                        disabled={!state.canSubmit || state.isSubmitting}
                        isLoading={state.isSubmitting}
                        loadingText="Creating account..."
                        type="submit"
                      >
                        Sign Up
                      </AuthLoadingButton>
                    )}
                  </form.Subscribe>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <Button
                className="h-auto p-0 text-emerald-400 transition-colors hover:text-emerald-300"
                onClick={onSwitchToSignIn}
                variant="link"
              >
                Sign in
              </Button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
