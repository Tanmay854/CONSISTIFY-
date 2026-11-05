export type StaffRole = "admin" | "uploader";

export function removalPermission(callerRoles: string[], targetRoles: string[], role: StaffRole): string | null {
  if (!callerRoles.includes("admin") && !callerRoles.includes("super_admin")) return "Only admins can remove staff";
  if (targetRoles.includes("super_admin")) return "Super-admin cannot be removed";
  if ((role === "admin" || targetRoles.includes("admin")) && !callerRoles.includes("super_admin")) {
    return "Only the super-admin can remove admins";
  }
  return null;
}

export const HELD_VIDEO_FEEDS = ["long_game", "calm_state", "quick_spark"];