import { ZodCustomIssue, ZodError, ZodIssue, ZodObject, ZodType, z } from "zod";

type ErrorMessage<T extends string> = T;

type Simplify<T> = {
  [P in keyof T]: T[P];
} & {};

type Impossible<T extends Record<string, any>> = Partial<
  Record<keyof T, never>
>;

type ClientOptions<
  TPrefix extends string,
  TClient extends Record<string, ZodType>
> = {
  clientPrefix: TPrefix;
  client: Partial<{
    [K in keyof TClient]: K extends `${TPrefix}${string}`
      ? TClient[K]
      : ErrorMessage<`${K extends string
          ? K
          : never} is not prefixed with ${TPrefix}.`>;
  }>;
};

type ServerOptions<
  TPrefix extends string,
  TServer extends Record<string, ZodType>
> = {
  server: Partial<{
    [TKey in keyof TServer]: TPrefix extends ""
      ? TServer[TKey]
      : TKey extends `${TPrefix}${string}`
      ? ErrorMessage<`${TKey extends `${TPrefix}${string}`
          ? TKey
          : never} should not be prefixed with ${TPrefix}.`>
      : TServer[TKey];
  }>;
};

type TransformOptions<
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>,
  TTransformOutput extends Record<string, unknown>
> = {
  transform: (
    envs: Simplify<z.infer<ZodObject<TClient>> & z.infer<ZodObject<TServer>>>
  ) => TTransformOutput;
};

type FeatureFlagsOptions<
  TShared extends Record<string, ZodType>,
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>,
  TTransformOutput extends Record<string, unknown>,
  TFeatureFlags extends FeatureFlagsExtend<
    TShared,
    TClient,
    TServer,
    TTransformOutput
  >
> = {
  featureFlags: TFeatureFlags;
};

type SubType<Base, Condition> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
  }[keyof Base]
>;

type FeatureFlagsExtend<
  TShared extends Record<string, ZodType>,
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>,
  TTransformOutput extends Record<string, unknown>
> = {
  [K in keyof SubType<
    EnvBaseReturn<TShared, TClient, TServer, TTransformOutput>,
    boolean
  >]?: {
    [X in Exclude<
      keyof Simplify<
        TTransformOutput &
          z.infer<ZodObject<TShared>> &
          z.infer<ZodObject<TClient>> &
          z.infer<ZodObject<TServer>>
      >,
      K
    >]?: true;
  };
};

type EnvBaseReturn<
  TShared extends Record<string, ZodType>,
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>,
  TTransformOutput extends Record<string, unknown>
> = Simplify<
  TTransformOutput &
    z.infer<ZodObject<TShared>> &
    z.infer<ZodObject<TClient>> &
    z.infer<ZodObject<TServer>>
>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type EnvReturnAux<
  TShared extends Record<string, ZodType>,
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>,
  TTransformOutput extends Record<string, unknown>,
  TFeatureFlags extends FeatureFlagsExtend<
    TShared,
    TClient,
    TServer,
    TTransformOutput
  >
> = UnionToIntersection<
  | {
      [K in keyof TFeatureFlags]: {
        __flags:
          | ({
              [D in keyof TFeatureFlags[K]]: D extends keyof EnvBaseReturn<
                TShared,
                TClient,
                TServer,
                TTransformOutput
              >
                ? NonNullable<
                    EnvBaseReturn<
                      TShared,
                      TClient,
                      TServer,
                      TTransformOutput
                    >[D]
                  >
                : never;
            } & { [x in K]: true })
          | ({ [x in K]: false } & {
              [D in keyof TFeatureFlags[K]]: D extends keyof EnvBaseReturn<
                TShared,
                TClient,
                TServer,
                TTransformOutput
              >
                ? EnvBaseReturn<TShared, TClient, TServer, TTransformOutput>[D]
                : never;
            });
      };
    }[keyof TFeatureFlags]
>;

type EnvReturn<
  TShared extends Record<string, ZodType>,
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>,
  TTransformOutput extends Record<string, unknown>,
  TFeatureFlags extends FeatureFlagsExtend<
    TShared,
    TClient,
    TServer,
    TTransformOutput
  >
> = keyof EnvReturnAux<
  TShared,
  TClient,
  TServer,
  TTransformOutput,
  TFeatureFlags
> extends never
  ? EnvBaseReturn<TShared, TClient, TServer, TTransformOutput>
  : {
      [K in keyof EnvReturnAux<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >]: EnvReturnAux<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >[K];
    }[keyof EnvReturnAux<
      TShared,
      TClient,
      TServer,
      TTransformOutput,
      TFeatureFlags
    >] &
      EnvBaseReturn<TShared, TClient, TServer, TTransformOutput>;

type RuntimeOptions<
  TPrefix extends string,
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>
> = {
  runtimeEnv: Record<
    | {
        [TKey in keyof TClient]: TKey extends `${TPrefix}${string}`
          ? TKey
          : never;
      }[keyof TClient]
    | {
        [TKey in keyof TServer]: TKey extends `${TPrefix}${string}`
          ? never
          : TKey;
      }[keyof TServer],
    string | boolean | number | undefined
  >;
};

type CommonOptions<TShared extends Record<string, ZodType>> = {
  /**
   * How to determine whether the app is running on the server or the client.
   * @default typeof window === "undefined"
   */
  isServer?: boolean;

  /**
   * Shared variables, often those that are provided by build tools and is available to both client and server,
   * but isn't prefixed and doesn't require to be manually supplied. For example `NODE_ENV`, `VERCEL_URL` etc.
   */
  shared?: TShared;

  /**
   * Called when validation fails. By default the error is logged,
   * and an error is thrown telling what environment variables are invalid.
   */
  onValidationError?: (error: ZodError) => never;

  /**
   * Called when a server-side environment variable is accessed on the client.
   * By default an error is thrown.
   */
  onInvalidAccess?: (variable: string) => never;

  /**
   * Whether to skip validation of environment variables.
   * @default false
   */
  skipValidation?: boolean;
};

type EnvOptions<
  TPrefix extends string,
  TShared extends Record<string, ZodType>,
  TClient extends Record<string, ZodType>,
  TServer extends Record<string, ZodType>,
  TTransformOutput extends Record<string, unknown>,
  TFeatureFlags extends FeatureFlagsExtend<
    TShared,
    TClient,
    TServer,
    TTransformOutput
  >
> = (
  | (ClientOptions<TPrefix, TClient> &
      ServerOptions<TPrefix, TServer> &
      TransformOptions<TClient, TServer, TTransformOutput> &
      FeatureFlagsOptions<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >)
  | (ClientOptions<TPrefix, TClient> &
      ServerOptions<TPrefix, TServer> &
      TransformOptions<TClient, TServer, TTransformOutput> &
      Impossible<FeatureFlagsOptions<never, never, never, never, never>>)
  | (ClientOptions<TPrefix, TClient> &
      ServerOptions<TPrefix, TServer> &
      Impossible<TransformOptions<never, never, never>> &
      FeatureFlagsOptions<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >)
  | (ClientOptions<TPrefix, TClient> &
      Impossible<ServerOptions<never, never>> &
      TransformOptions<TClient, TServer, TTransformOutput> &
      FeatureFlagsOptions<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >)
  | (Impossible<ClientOptions<never, never>> &
      ServerOptions<TPrefix, TServer> &
      TransformOptions<TClient, TServer, TTransformOutput> &
      FeatureFlagsOptions<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >)
  | (ClientOptions<TPrefix, TClient> &
      ServerOptions<TPrefix, TServer> &
      Impossible<TransformOptions<never, never, never>> &
      Impossible<FeatureFlagsOptions<never, never, never, never, never>>)
  | (ClientOptions<TPrefix, TClient> &
      Impossible<ServerOptions<never, never>> &
      TransformOptions<TClient, TServer, TTransformOutput> &
      Impossible<FeatureFlagsOptions<never, never, never, never, never>>)
  | (Impossible<ClientOptions<never, never>> &
      ServerOptions<TPrefix, TServer> &
      TransformOptions<TClient, TServer, TTransformOutput> &
      Impossible<FeatureFlagsOptions<never, never, never, never, never>>)
  | (ClientOptions<TPrefix, TClient> &
      Impossible<ServerOptions<never, never>> &
      Impossible<TransformOptions<never, never, never>> &
      FeatureFlagsOptions<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >)
  | (Impossible<ClientOptions<never, never>> &
      ServerOptions<TPrefix, TServer> &
      Impossible<TransformOptions<never, never, never>> &
      FeatureFlagsOptions<
        TShared,
        TClient,
        TServer,
        TTransformOutput,
        TFeatureFlags
      >)
  | (ClientOptions<TPrefix, TClient> &
      Impossible<ServerOptions<never, never>> &
      Impossible<TransformOptions<never, never, never>> &
      Impossible<FeatureFlagsOptions<never, never, never, never, never>>)
  | (ServerOptions<TPrefix, TServer> &
      Impossible<ClientOptions<never, never>> &
      Impossible<TransformOptions<never, never, never>> &
      Impossible<FeatureFlagsOptions<never, never, never, never, never>>)
) &
  RuntimeOptions<TPrefix, TClient, TServer> &
  CommonOptions<TShared>;

export function createEnv<
  TPrefix extends string = "",
  TShared extends Record<string, ZodType> = NonNullable<unknown>,
  TClient extends Record<string, ZodType> = NonNullable<unknown>,
  TServer extends Record<string, ZodType> = NonNullable<unknown>,
  TTransformOutput extends Record<string, unknown> = NonNullable<unknown>,
  TFeatureFlags extends FeatureFlagsExtend<
    TShared,
    TClient,
    TServer,
    TTransformOutput
  > = FeatureFlagsExtend<
    NonNullable<unknown>,
    NonNullable<unknown>,
    NonNullable<unknown>,
    NonNullable<unknown>
  >
>(
  opts: EnvOptions<
    TPrefix,
    TShared,
    TClient,
    TServer,
    TTransformOutput,
    TFeatureFlags
  >
): EnvReturn<TShared, TClient, TServer, TTransformOutput, TFeatureFlags> {
  const runtimeEnv = opts.runtimeEnv ?? process.env;

  const skip = !!opts.skipValidation;

  if (skip) return runtimeEnv as any;

  const _client = typeof opts.client === "object" ? opts.client : {};
  const _server = typeof opts.server === "object" ? opts.server : {};
  const _shared = typeof opts.shared === "object" ? opts.shared : {};
  const client = z.object(_client);
  const server = z.object(_server);
  const shared = z.object(_shared);
  const isServer = opts.isServer ?? typeof window === "undefined";

  const allClient = client.merge(shared);
  const allServer = server.merge(shared).merge(client);
  const parsed = isServer
    ? allServer.safeParse(runtimeEnv) // on server we can validate all env vars
    : allClient.safeParse(runtimeEnv); // on client we can only validate the ones that are exposed

  const onValidationError =
    opts.onValidationError ??
    ((error: ZodError) => {
      console.error(
        "❌ Invalid environment variables:",
        error.flatten().fieldErrors
      );
      throw new Error("Invalid environment variables");
    });

  const onFlagError = (errors: ZodCustomIssue[]) => {
    console.error(
      "❌ Invalid feature flags:",
      errors.map((e) => ({ ...e.params, message: e.message }))
    );
    throw new Error("Invalid feature flags");
  };

  if (!parsed.success) {
    onValidationError(parsed.error);
  }

  const onInvalidAccess =
    opts.onInvalidAccess ??
    ((_variable: string) => {
      throw new Error(
        "❌ Attempted to access a server-side environment variable on the client"
      );
    });

  if (parsed.success === false) {
    return onValidationError(parsed.error);
  }

  let data = parsed.data;

  if (opts.transform) {
    data = opts.transform(parsed.data as any) as any;
  }

  if (opts.featureFlags) {
    const featureFlagsSchema = z.union(
      Object.entries(opts.featureFlags).map(([flag, def]) => {
        return z.discriminatedUnion(flag, [
          z.object({
            [flag]: z.literal(true),
            ...Object.keys(def as {}).reduce(
              (acc, env) => ({
                ...acc,
                [env]: z.custom((val) => val !== undefined, {
                  message: `Expected non undefined value, received undefined`,
                  params: { env, flag },
                  fatal: true,
                }),
              }),
              {}
            ),
          }),
          z.object({
            [flag]: z.literal(false),
          }),
        ]);
      }) as any
    );

    const flagsParse = featureFlagsSchema.safeParse(data);

    if (!flagsParse.success) {
      const issues = flagsParse.error.errors.flatMap((x) =>
        x.code === "invalid_union"
          ? x.unionErrors.flatMap((xx) =>
              xx.issues.filter((xxx) => xxx.code === "custom")
            )
          : []
      );
      onFlagError(issues as ZodCustomIssue[]);
    }
  }

  const env = new Proxy(data, {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      if (
        !isServer &&
        opts.clientPrefix &&
        !prop.startsWith(opts.clientPrefix) &&
        shared.shape[prop as keyof typeof shared.shape] === undefined
      ) {
        return onInvalidAccess(prop);
      }
      return target[prop as keyof typeof target];
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  return env as any;
}
