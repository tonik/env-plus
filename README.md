# Env+

Toolkit for managing type-safe environment variables with the feature flags built-in support. Heavily influenced by [t3-env](https://github.com/t3-oss/t3-env).

## Features

- Full type safety
- API compatible with @t3-oss/env-core
- Built-in feature flags support
- Full schema transformation support

## Installation

```
pnpm add @tonik/env-plus zod
```

## How to define env schema

```ts
import { createEnv } from "@tonik/env-plus";
import { z } from "zod";

export const env = createEnv({
  /**
   * Example settings for Next.js
   */
  isServer: typeof window === "undefined"
  clientPrefix: "NEXT_PUBLIC_"
  /**
   * All envs here will be avaliable to read when isServer is true
   */
  server: {
    DATABASE_URL: z.string().url(),
    SERVER_ENV: z.string(),
    /**
     * You can define feature flag schema here.
     * You can use any input here as long it returns boolean.
     */
    GOOGLE_AUTH_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((e) => e === "true"),

    /**
     * Here are variables that will become required when flag is set to "true".
     * For now define them as optionals.
     */
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional()
  },
  /**
   * All envs here will be avaliable to read when isServer is false.
   *
   * You can set here anything prefixed with value in `clientPrefix`
   */
  client: {
    NEXT_PUBLIC_PLASMIC_PUBLIC_KEY: z.string().min(1),
    NEXT_PUBLIC_CLIENT_ENV: z.string().min(1)
  },
  transform: (env) => {
    return {
        CUSTOM_FLAG: true,
        SOME_DYNAMIC_ENV: `${env.NEXT_PUBLIC_CLIENT_ENV}${env.SERVER_ENV}`
    }
  },
  /**
   * Define relations between envs here.
   * 1st level - boolean returning envs.
   * 2nd level - all envs that will drop `optional` when 1st level env is set to true.
   *
   * Only `true` as a value allows droping `optional` schema right now
   */
  featureFlags: {
    CUSTOM_FLAG: {
        SOME_DYNAMIC_ENV: true
    },
    GOOGLE_AUTH_ENABLED: {
        GOOGLE_CLIENT_ID: true,
        GOOGLE_CLIENT_SECRET: true
    }
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SERVER_ENV: process.env.SERVER_ENV,
    NEXT_PUBLIC_PLASMIC_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_PLASMIC_PUBLIC_KEY,
    NEXT_PUBLIC_CLIENT_ENV: process.env.NEXT_PUBLIC_CLIENT_ENV,
    GOOGLE_AUTH_ENABLED: process.env.GOOGLE_AUTH_ENABLED,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
  },
});
```

## How to use env in the application

```ts
import { env } from "@tonik/env-plus";

// all defined envs are typed and avalable
env.DATABASE_URL; // type string
env.CUSTOM_FLAG; // type boolean
env.SOME_DYNAMIC_VALUE; // type string

env.GOOGLE_CLIENT_ID; // type string | undefined
env.GOOGLE_CLIENT_SECRET; // type string | undefined

if (env.GOOGLE_AUTH_ENABLED) {
  env.GOOGLE_CLIENT_ID; // type string (undefined dropped)
  env.GOOGLE_CLIENT_SECRET; // type string (undefined dropped)
}
```

## License

Licensed under the [MIT license](https://github.com/tonik/env-plus/blob/main/LICENSE).