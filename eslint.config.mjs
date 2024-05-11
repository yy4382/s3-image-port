// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    camelcase: ["warn", { ignoreDestructuring: true }],
  },
});
