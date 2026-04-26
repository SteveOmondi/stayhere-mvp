import type { PortalConfig } from "./config";

/** Active property-owner id for scoped views and PropertyService <c>X-User-Id</c>. */
export function effectiveOwnerId(config: PortalConfig): string {
  return config.defaultOwnerUserId?.trim() ?? "";
}
