import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const external = [
  "@auth0/auth0-spa-js",
  "crypto",
  "jwk-to-pem",
  "jwt-decode",
  "pem-jwk",
  "axios",
  "process",
  "util",
  "base64-js",
  "buffer",
];

const plugins = [
  commonjs(),
  typescript({
    declaration: false,
  }),
  terser(),
];

const inputs = {
  index: "src/index.ts",
};

export default {
  input: inputs,
  output: [
    {
      dir: "dist",
      format: "cjs",
      sourcemap: true,
      entryFileNames: "[name].js",
    },
    {
      dir: "dist",
      format: "esm",
      sourcemap: true,
      entryFileNames: "[name].mjs",
    },
  ],
  plugins,
  external,
};
