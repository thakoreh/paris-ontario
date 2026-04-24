import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow any for Leaflet window.L typing
      "@typescript-eslint/no-explicit-any": "off",
      // Allow setState in effects for localStorage hydration
      "react-hooks/set-state-in-effect": "off",
      // Allow unused vars in components (sometimes needed for future use)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Allow img tags for external URLs
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
