import { z } from "zod";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

export function failure(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Collapse a ZodError into one readable sentence for the form banner. */
export function zodMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(". ");
}

export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ValidationError(zodMessage(parsed.error));
  return parsed.data;
}

export class ValidationError extends Error {}

/** Wrap an action body so expected failures surface as a result, not a crash. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data } as ActionResult<T>;
  } catch (error) {
    if (error instanceof ValidationError) return failure(error.message);
    const message = error instanceof Error ? error.message : "Something went wrong";
    if (message.includes("Unique constraint")) {
      return failure("That value is already taken. Keys must be unique.");
    }
    if (message.includes("Foreign key constraint")) {
      return failure("That record is still referenced by something else.");
    }
    console.error(error);
    return failure(message);
  }
}
