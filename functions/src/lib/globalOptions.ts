import { setGlobalOptions } from "firebase-functions/v2";
import { MONGODB_URI, REGION, RESEND_API_KEY } from "./config";

// Imported first by index.ts: function options are captured when each function is
// defined, so this must run before any module that defines a function is loaded.
// Every function reads Mongo (see lib/rateLimit.ts), and any function may send a notification
// email (see lib/notify.ts), so all of them need both secrets.
// A function that sets its own `secrets` replaces this list: it must list MONGODB_URI too.
setGlobalOptions({ region: REGION, maxInstances: 10, secrets: [MONGODB_URI, RESEND_API_KEY] });
