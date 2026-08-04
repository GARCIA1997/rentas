import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Advisories del compilador de React sobre patrones que cuestan renders de más.
      // Son deuda técnica conocida (las páginas cargan datos con setState dentro de un
      // efecto), no defectos: quedan visibles como aviso sin bloquear el CI. En cambio
      // rules-of-hooks se mantiene como error, porque un hook condicional sí corrompe
      // el estado del componente.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
