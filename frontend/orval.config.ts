import { defineConfig } from "orval";

export default defineConfig({
  aiPlatform: {
    input: {
      target: "http://localhost:8001/openapi.json",
    },
    output: {
      target: "src/lib/api/generated.ts",
      client: "react-query",
      mode: "single",
      override: {
        mutator: {
          path: "src/lib/api/axios-instance.ts",
          name: "customInstance",
        },
        query: {
          useQuery: true,
        },
      },
    },
  },
});
