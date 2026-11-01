import { createServer, type Server } from "node:http";

interface FakeIntent {
  id: string;
  object: "payment_intent";
  amount: number;
  amount_received: number;
  currency: string;
  status: "requires_payment_method" | "succeeded";
  client_secret: string;
  metadata: Record<string, string>;
}

/**
 * A stand-in for the part of Stripe's API that the server uses (create and read a PaymentIntent), so the
 * payment tests need no Stripe account and no network. The tests mark a payment as paid through
 * `POST /__test/succeed/<id>`, which is what Stripe does once a card is charged.
 */
export function startFakeStripe(port: number): Promise<Server> {
  const intents = new Map<string, FakeIntent>();
  let counter = 0;

  const send = (res: import("node:http").ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://fake");
      const form = new URLSearchParams(Buffer.concat(chunks).toString());

      if (req.method === "POST" && url.pathname === "/v1/payment_intents") {
        counter += 1;
        const id = `pi_fake_${Date.now()}_${counter}`;
        const metadata: Record<string, string> = {};
        for (const [key, value] of form) {
          const match = key.match(/^metadata\[(.+)\]$/);
          if (match) metadata[match[1]!] = value;
        }
        const intent: FakeIntent = {
          id,
          object: "payment_intent",
          amount: Number(form.get("amount")),
          amount_received: 0,
          currency: form.get("currency") ?? "eur",
          status: "requires_payment_method",
          client_secret: `${id}_secret_fake`,
          metadata,
        };
        intents.set(id, intent);
        return send(res, 200, intent);
      }

      const read = url.pathname.match(/^\/v1\/payment_intents\/(pi_[A-Za-z0-9_]+)$/);
      if (req.method === "GET" && read) {
        const intent = intents.get(read[1]!);
        if (intent) return send(res, 200, intent);
        return send(res, 404, { error: { type: "invalid_request_error", code: "resource_missing", message: "No such payment_intent" } });
      }

      const succeed = url.pathname.match(/^\/__test\/succeed\/(pi_[A-Za-z0-9_]+)$/);
      if (req.method === "POST" && succeed) {
        const intent = intents.get(succeed[1]!);
        if (!intent) return send(res, 404, { error: "unknown" });
        intent.status = "succeeded";
        intent.amount_received = intent.amount;
        return send(res, 200, intent);
      }

      send(res, 404, { error: { message: "Not handled by the fake" } });
    });
  });

  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
