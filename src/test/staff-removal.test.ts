import { describe, expect, it } from "vitest";
import { HELD_VIDEO_FEEDS, removalPermission } from "../../supabase/functions/_shared/staffRemovalRules";

describe("removed staff rules", () => {
  it("holds both Long Game and Quick Spark uploads", () => {
    expect(HELD_VIDEO_FEEDS).toEqual(["long_game", "calm_state", "quick_spark"]);
  });
  it("allows super admins to remove admins", () => {
    expect(removalPermission(["super_admin"], ["admin"], "admin")).toBeNull();
  });
  it("prevents admins bypassing admin protection through an uploader role", () => {
    expect(removalPermission(["admin"], ["admin", "uploader"], "uploader")).toBe("Only the super-admin can remove admins");
  });
  it("protects super admins regardless of requested removal role", () => {
    expect(removalPermission(["super_admin"], ["super_admin", "uploader"], "uploader")).toBe("Super-admin cannot be removed");
  });
  it("denies ordinary members access to removal", () => {
    expect(removalPermission(["user"], ["uploader"], "uploader")).toBe("Only admins can remove staff");
  });
});