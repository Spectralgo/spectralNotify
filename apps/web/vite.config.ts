import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import alchemy from "alchemy/cloudflare/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [alchemy(), tailwindcss(), tanstackRouter({}), react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		hmr: {
			protocol: "ws",
			host: "localhost",
			port: 3014,
			clientPort: 3014,
		},
		watch: {
			usePolling: false,
		},
	},
});
