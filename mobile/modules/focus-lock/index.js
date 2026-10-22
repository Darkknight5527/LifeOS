// LifeOS Focus mode (Android only). Null when the native part isn't in this build.
import { requireOptionalNativeModule } from "expo-modules-core";

export default requireOptionalNativeModule("FocusLock");
