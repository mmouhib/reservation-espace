import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "./lib/config";

setGlobalOptions({ region: REGION, maxInstances: 10 });

export { bootstrapProfile } from "./auth/bootstrapProfile";
export { setUserRole } from "./auth/setUserRole";
export { directorySyncScheduled, runDirectorySyncNow } from "./auth/directorySync";
