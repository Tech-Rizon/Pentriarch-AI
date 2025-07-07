import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Base ESLint configuration
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "prefer-const": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "react/jsx-key": "off",
      "react/display-name": "off",
      "jsx-a11y/alt-text": "off",
    },
  },
];

export default eslintConfig;
