import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AuthLoadingButton } from "./auth/AuthLoadingButton";
import { AuthErrorAlert } from "./auth/AuthErrorAlert";
import { useState } from "react";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const [error, setError] = useState("");

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setError("");
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/dashboard",
		});
						toast.success("Sign in successful");
					},
					onError: (err) => {
						const errorMessage =
							err.error.message || err.error.statusText || "An error occurred";
						setError(errorMessage);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	return (
		<div className="relative isolate min-h-screen bg-gray-900 flex items-center justify-center overflow-y-auto overflow-x-hidden">
			{/* Background pattern */}
			<svg
				aria-hidden="true"
				className="absolute inset-0 -z-10 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
			>
				<defs>
					<pattern
						id="auth-grid-pattern"
						width={200}
						height={200}
						x="50%"
						y={-1}
						patternUnits="userSpaceOnUse"
					>
						<path d="M.5 200V.5H200" fill="none" />
					</pattern>
				</defs>
				<svg x="50%" y={-1} className="overflow-visible fill-gray-800/20">
					<path
						d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
						strokeWidth={0}
					/>
				</svg>
				<rect
					width="100%"
					height="100%"
					strokeWidth={0}
					fill="url(#auth-grid-pattern)"
				/>
			</svg>

			{/* Gradient orb */}
			<div
				aria-hidden="true"
				className="absolute left-[calc(50%-30rem)] top-0 -z-10 -translate-x-1/2 transform-gpu blur-3xl"
			>
				<div
					className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20"
					style={{
						clipPath:
							"polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
					}}
				/>
			</div>

			{/* Content */}
			<div className="w-full px-6 py-8">
				<motion.div
					className={cn("w-full max-w-md mx-auto")}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
				>
					{/* Logo at top */}
					<div className="block text-center mb-8">
						<h1 className="relative inline-flex items-baseline font-bold text-3xl">
							<span className="tracking-tight text-white">
								spectral
								<span className="bg-gradient-to-tr from-indigo-600 to-purple-900 bg-clip-text text-transparent">
									notify
								</span>
							</span>
						</h1>
					</div>

					<Card className="overflow-hidden rounded-xl bg-gray-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
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
										<h2 className="text-2xl font-bold tracking-tight text-white">
											Welcome back
										</h2>
										<p className="text-gray-400 mt-2">Sign in to your account</p>
									</div>

									<div className="space-y-4">
										<form.Field name="email">
											{(field) => (
												<div className="grid gap-2">
													<Label
														htmlFor={field.name}
														className="text-sm font-medium text-gray-200"
													>
														Email
													</Label>
													<Input
														id={field.name}
														name={field.name}
														type="email"
														placeholder="m@example.com"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														required
														autoComplete="email"
														className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-base min-h-[44px]"
													/>
													{field.state.meta.errors.map((err) => (
														<p key={err?.message} className="text-sm text-red-400">
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
														htmlFor={field.name}
														className="text-sm font-medium text-gray-200"
													>
														Password
													</Label>
													<Input
														id={field.name}
														name={field.name}
														type="password"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														required
														autoComplete="current-password"
														className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-base min-h-[44px]"
													/>
													{field.state.meta.errors.map((err) => (
														<p key={err?.message} className="text-sm text-red-400">
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
												type="submit"
												className="w-full bg-indigo-600 hover:bg-indigo-600/90 text-white font-semibold min-h-[44px]"
												isLoading={state.isSubmitting}
												loadingText="Signing in..."
												disabled={!state.canSubmit || state.isSubmitting}
											>
												Sign In
											</AuthLoadingButton>
										)}
									</form.Subscribe>
								</div>
							</form>
						</CardContent>
					</Card>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-400">
							Don&apos;t have an account?{" "}
							<Button
								variant="link"
								onClick={onSwitchToSignUp}
								className="text-indigo-400 hover:text-indigo-300 transition-colors p-0 h-auto"
							>
								Sign up
							</Button>
						</p>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
