import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL,
  plugins: [
    oneTapClient({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      // Disable FedCM to avoid CORS issues in development
      // FedCM becomes mandatory in August 2025
      fedCM: false,
      // Don't auto-select account - let user choose
      autoSelect: false,
      // Cancel if user clicks outside the popup
      cancelOnTapOutside: true,
    }),
  ],
});
