import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-background">
      {/* Background pattern */}
      <svg
        aria-hidden="true"
        className="-z-10 absolute inset-0 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
      >
        <defs>
          <pattern
            height={200}
            id="loading-grid-pattern"
            patternUnits="userSpaceOnUse"
            width={200}
            x="50%"
            y={-1}
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <svg className="overflow-visible fill-gray-800/20" x="50%" y={-1}>
          <title>Background grid pattern decoration</title>
          <path
            d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          fill="url(#loading-grid-pattern)"
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
          className="aspect-[1108/632] w-[69.25rem] bg-primary opacity-20"
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
