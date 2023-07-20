import { describe, it, expect } from "vitest";
import { createEnv } from "../index";
import { z } from "zod";
describe("createEnv", () => {
  it("Should fail when server env doesn't match runtimeEnv on server", () => {
    expect(() =>
      createEnv({
        isServer: true,
        server: {
          TEST: z.string(),
        },
        runtimeEnv: {
          TEST: 1 as unknown as string,
        },
      })
    ).toThrowError("Invalid environment variables");
  });

  it("Should fail when client env doesn't match runtimeEnv on client", () => {
    expect(() =>
      createEnv({
        isServer: false,
        clientPrefix: "NEXT_PUBLIC_" as const,
        client: {
          NEXT_PUBLIC_TEST: z.string(),
        },
        runtimeEnv: {
          NEXT_PUBLIC_TEST: 1 as unknown as string,
        },
      })
    ).toThrowError("Invalid environment variables");
  });

  it("should retrun envs when only client is provided", () => {
    const env = createEnv({
      clientPrefix: "NEXT_PUBLIC_",
      isServer: false,
      client: {
        NEXT_PUBLIC_TEST: z.string().optional(),
      },
      runtimeEnv: {
        NEXT_PUBLIC_TEST: "TEST",
      },
    });

    expect(env.NEXT_PUBLIC_TEST).toBe("TEST");
  });

  it("should retrun envs when only server is provided", () => {
    const env = createEnv({
      isServer: true,
      server: {
        TEST: z.string().optional(),
      },
      runtimeEnv: {
        TEST: "TEST",
      },
    });

    expect(env.TEST).toBe("TEST");
  });

  it("should retrun envs when both client and server are provided", () => {
    const env = createEnv({
      clientPrefix: "NEXT_PUBLIC_",
      isServer: true,
      client: {
        NEXT_PUBLIC_TEST: z.string().optional(),
      },
      server: {
        TEST: z.string().optional(),
      },
      runtimeEnv: {
        NEXT_PUBLIC_TEST: "TEST",
        TEST: "TEST",
      },
    });

    expect(env.TEST).toBe("TEST");
    expect(env.NEXT_PUBLIC_TEST).toBe("TEST");
  });

  it("should return transformed envs when transform is provided", () => {
    const env = createEnv({
      clientPrefix: "NEXT_PUBLIC_",
      isServer: true,
      client: {
        NEXT_PUBLIC_TEST: z.string().optional(),
      },
      server: {
        TEST: z.string().optional(),
      },
      runtimeEnv: {
        NEXT_PUBLIC_TEST: "TEST",
        TEST: "TEST",
      },
      transform: (env) => ({
        ...env,
        TEST: env.TEST + "TEST",
      }),
    });

    expect(env.TEST).toBe("TESTTEST");
    expect(env.NEXT_PUBLIC_TEST).toBe("TEST");
  });

  it("should fail if flag is set and env is not provided", () => {
    expect(() =>
      createEnv({
        isServer: true,
        server: {
          FLAG: z
            .enum(["true", "false"])
            .default("false")
            .transform((v) => v === "true"),
          VALUE: z.string().optional(),
        },
        runtimeEnv: {
          FLAG: "true",
          VALUE: undefined,
        },
        featureFlags: {
          FLAG: { VALUE: true },
        },
      })
    ).toThrowError("Invalid feature flags");
  });

  it("should pass flags if flag is set and env is provided without client", () => {
    const env = createEnv({
      isServer: true,
      server: {
        FLAG: z
          .enum(["true", "false"])
          .default("false")
          .transform((v) => v === "true"),
        VALUE1: z.string().optional(),
      },
      shared: {
        VALUE2: z.string().optional(),
      },
      runtimeEnv: {
        FLAG: "true",
        VALUE1: "TEST",
        VALUE2: "TEST",
      },
      featureFlags: {
        FLAG: { VALUE1: true, VALUE2: true },
      },
    });

    expect(env.FLAG).toBe(true);
    expect(env.VALUE1).toBe("TEST");
    expect(env.VALUE2).toBe("TEST");
  });

  it("should pass with everything set and only default values on server", () => {
    const env = createEnv({
      isServer: true,
      server: {
        FLAG: z
          .enum(["true", "false"])
          .default("false")
          .transform((v) => v === "true"),
        VALUE1: z.string().optional(),
      },
      shared: {
        VALUE2: z.string().optional(),
      },
      client: {
        NEXT_PUBLIC_FLAG: z
          .enum(["true", "false"])
          .default("false")
          .transform((v) => v === "true"),
        NEXT_PUBLIC_VALUE1: z.string().optional(),
      },
      clientPrefix: "NEXT_PUBLIC_",
      runtimeEnv: {
        FLAG: undefined,
        VALUE1: undefined,
        VALUE2: undefined,
        NEXT_PUBLIC_FLAG: undefined,
        NEXT_PUBLIC_VALUE1: undefined,
      },
      featureFlags: {
        FLAG: { VALUE1: true, VALUE2: true },
        NEXT_PUBLIC_FLAG: {
          NEXT_PUBLIC_VALUE1: true,
        },
      },
    });

    expect(env.FLAG).toBe(false);
    expect(env.VALUE1).toBe(undefined);
    expect(env.VALUE2).toBe(undefined);
    expect(env.NEXT_PUBLIC_FLAG).toBe(false);
    expect(env.NEXT_PUBLIC_VALUE1).toBe(undefined);
  });

  it("should pass with everything set and only default values on client", () => {
    const env = createEnv({
      isServer: false,
      server: {
        FLAG: z
          .enum(["true", "false"])
          .default("false")
          .transform((v) => v === "true"),
        VALUE1: z.string().optional(),
      },
      shared: {
        VALUE2: z.string().optional(),
      },
      client: {
        NEXT_PUBLIC_FLAG: z
          .enum(["true", "false"])
          .default("false")
          .transform((v) => v === "true"),
        NEXT_PUBLIC_VALUE1: z.string().optional(),
      },
      clientPrefix: "NEXT_PUBLIC_",
      runtimeEnv: {
        FLAG: undefined,
        VALUE1: undefined,
        VALUE2: undefined,
        NEXT_PUBLIC_FLAG: "false",
        NEXT_PUBLIC_VALUE1: "TEST",
      },
      featureFlags: {
        FLAG: { VALUE1: true, VALUE2: true },
        NEXT_PUBLIC_FLAG: {
          NEXT_PUBLIC_VALUE1: true,
        },
      },
    });

    expect(env.NEXT_PUBLIC_FLAG).toBe(false);
    expect(env.NEXT_PUBLIC_VALUE1).toBe("TEST");
  });

  it("should fail if flag is set and env is not provided", () => {
    expect(() =>
      createEnv({
        isServer: true,
        server: {
          FLAG: z
            .enum(["true", "false"])
            .default("false")
            .transform((v) => v === "true"),
          VALUE: z.string().optional(),
        },
        // @ts-expect-error
        runtimeEnv: {
          FLAG: "true",
        },
        featureFlags: {
          FLAG: { VALUE: true },
        },
      })
    ).toThrowError("Invalid feature flags");
  });

  describe.skip("types", () => {
    it("should fail when runtimeEnv doesn't contain shared keys", () => {
      createEnv({
        isServer: true,
        clientPrefix: "PREFIX_" as const,
        client: {
          PREFIX_TEST: z.string(),
        },
        shared: {
          SUT: z.string(),
        },
        server: {
          TEST: z.string(),
        },
        // @ts-expect-error
        runtimeEnv: {
          PREFIX_TEST: "",
        },
      });
    });

    it("Should fail when server env contain client prefixed env", () => {
      createEnv({
        isServer: true,
        clientPrefix: "PREFIX_" as const,
        client: {
          PREFIX_TEST: z.string(),
        },
        server: {
          // @ts-expect-error
          PREFIX_TEST: z.string(),
        },
        runtimeEnv: {
          PREFIX_TEST: "",
        },
      });
    });

    it("should support passing feature flags", () => {
      const env = createEnv({
        isServer: true,
        clientPrefix: "PREFIX_" as const,
        client: {
          PREFIX_FLAG: z
            .enum(["true", "false"])
            .default("false")
            .transform((v) => v === "true"),
          PREFIX_TEST2: z.string().optional(),
        },
        server: {
          FLAG: z
            .enum(["true", "false"])
            .default("false")
            .transform((v) => v === "true"),

          FLAG_VALUE: z
            .string()
            .transform((v) => parseInt(v))
            .optional(),

          FLAG_VALUE2: z.string().optional(),

          REGULAR_VALUE: z.string().optional(),
        },
        runtimeEnv: {
          PREFIX_FLAG: "TEST",
          PREFIX_TEST2: "TEST",
          FLAG: "true",
          FLAG_VALUE: "1",
          FLAG_VALUE2: "TEST@",
          REGULAR_VALUE: "TEST",
        },
        featureFlags: {
          PREFIX_FLAG: { PREFIX_TEST2: true },
          FLAG: { FLAG_VALUE: true, FLAG_VALUE2: true },
        },
      });

      const noError = env.REGULAR_VALUE;
      const noError2: number | undefined = env.FLAG_VALUE;

      if (env.PREFIX_FLAG) {
        const expectNoError: string = env.PREFIX_TEST2;

        expect(expectNoError).toBe("TEST");
      } else {
        // @ts-expect-error
        const nonExisting: string = env.PREFIX_TEST2;
      }

      if (env.FLAG) {
        const expectNoError: number = env.FLAG_VALUE;
        const expectNoError2: string = env.FLAG_VALUE2;
      } else {
        // @ts-expect-error
        const nonExisting: string = env.FLAG_VALUE;
        // @ts-expect-error
        const nonExisting2: string = env.FLAG_VALUE2;
      }
    });
  });
});
