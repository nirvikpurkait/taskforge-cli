// allowed configuration files
export const validConfigFilesOrder = [
  "tf.config.ts",
  "tf.config.js",
  "tf.config.mjs",
  "tf.config.cjs",
];

export const productionEnvFileLoadingOrder = [
  ".env.production.local",
  ".env.production",
  ".env.local",
  ".env",
];

export const developmentEnvFileLoadingOrder = [
  ".env.development.local",
  ".env.development",
  ".env.local",
  ".env",
];

export const testEnvFileLoadingOrder = [
  ".env.test.local",
  ".env.test",
  ".env.local",
  ".env",
];
