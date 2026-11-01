import { setGlobalOptions } from "firebase-functions/v2";
import { REGION, RESEND_API_KEY } from "./config";

// Imported first by index.ts: function options are captured when each function is
// defined, so this must run before any module that defines a function is loaded.
// Any function may send a notification email (see lib/notify.ts), so all of them need the Resend key.
// A function that sets its own `secrets` replaces this list, so it must not send notifications.
setGlobalOptions({ region: REGION, maxInstances: 10, secrets: [RESEND_API_KEY] });
