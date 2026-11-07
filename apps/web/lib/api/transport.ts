import { getFirebase } from "@/lib/firebase/client";

/** Address of the server. Empty when the server also serves the web app (the normal case): requests stay on the same origin. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** The full address of a path on the server, for links that leave the app (a calendar app reads them, not the browser). */
export function serverUrl(path: string): string {
  return `${API_URL || window.location.origin}${path}`;
}

interface ErrorBody {
  error?: { code?: string; reason?: string; message?: string };
}

/** An error answered by the server: `code` is its kind (`permission-denied`, ...), `reason` the stable cause the app translates. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly reason: string | undefined,
    message: string,
  ) {
    super(message);
  }

  static from(body: ErrorBody | null, status: number): ApiError {
    return new ApiError(body?.error?.code ?? "internal", body?.error?.reason, body?.error?.message ?? `HTTP ${status}`);
  }
}

async function authorization(): Promise<Record<string, string>> {
  const user = getFirebase().auth.currentUser;
  return user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
}

/** Sends a request with the signed-in user's Firebase ID token. Rejects with an ApiError when the server refuses. */
async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...(await authorization()), ...init.headers } });
  if (!res.ok) throw ApiError.from((await res.json().catch(() => null)) as ErrorBody | null, res.status);
  return res;
}

function postJson(name: string, input: unknown): Promise<Response> {
  return send(`/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input ?? {}) });
}

export async function post<O>(name: string, input: unknown): Promise<O> {
  return ((await (await postJson(name, input)).json()) as { data: O }).data;
}

interface StreamLine<O> extends ErrorBody {
  chunk?: string;
  data?: O;
}

/**
 * Calls an endpoint that answers piece by piece (newline-delimited JSON): `stream` yields the text as it
 * arrives and `data` resolves to the final result. `data` rejects when the stream fails.
 */
export async function postStream<O>(name: string, input: unknown): Promise<{ stream: AsyncIterable<string>; data: Promise<O> }> {
  const res = await postJson(name, input);
  let resolve!: (value: O) => void;
  let reject!: (reason: unknown) => void;
  const data = new Promise<O>((ok, ko) => {
    resolve = ok;
    reject = ko;
  });

  async function* chunks(): AsyncGenerator<string> {
    const reader = res.body?.pipeThrough(new TextDecoderStream()).getReader();
    let pending = "";
    try {
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += value;
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const message = JSON.parse(line) as StreamLine<O>;
          if (message.error) throw ApiError.from(message, 200);
          if (message.chunk !== undefined) yield message.chunk;
          if ("data" in message) resolve(message.data as O);
        }
      }
      reject(new Error("The stream ended without a result"));
    } catch (err) {
      reject(err);
      throw err;
    }
  }
  return { stream: chunks(), data };
}

/** Uploads a photo (at most 5 MB) and returns its id. */
export async function uploadPhoto(file: Blob): Promise<string> {
  const res = await send("/api/uploads/photos", { method: "POST", headers: { "Content-Type": file.type }, body: file });
  return ((await res.json()) as { data: { photoId: string } }).data.photoId;
}

/** The photo as a local URL an <img> can show. The caller owns the URL (URL.revokeObjectURL). */
export async function photoUrl(id: string): Promise<string> {
  const res = await send(`/api/uploads/photos/${id}`);
  return URL.createObjectURL(await res.blob());
}
