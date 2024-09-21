// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    camelcase: ["warn", { ignoreDestructuring: true }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "vue/html-self-closing": ["off"], // Avoid conflicts with Prettier
    "@typescript-eslint/ban-types": ["off"],
  },
});
