import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "url";
import path from "path";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const config = [
  // Ignore generated/build output — next lint did this automatically
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "public/**",
      ".vercel/**",
    ],
  },
  // Load eslint-config-next via the legacy compat layer
  ...compat.extends("next"),
  // Explicitly provide the plugins that FlatCompat can't auto-resolve in ESLint 9
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "@next/next": nextPlugin,
    },
  },
];

export default config;
