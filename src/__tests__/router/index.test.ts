import { describe, it, expect } from "vitest";
import router from "../../router/index";

describe("router", () => {
  it("has a route for / mapped to Dashboard", () => {
    const route = router.getRoutes().find((r) => r.path === "/");
    expect(route).toBeDefined();
    expect(route?.name).toBe("Dashboard");
  });

  it("has a route for /projects mapped to Projects", () => {
    const route = router.getRoutes().find((r) => r.path === "/projects");
    expect(route).toBeDefined();
    expect(route?.name).toBe("Projects");
  });

  it("has a route for /projects/:id mapped to ProjectDetail", () => {
    const route = router.getRoutes().find((r) => r.path === "/projects/:id");
    expect(route).toBeDefined();
    expect(route?.name).toBe("ProjectDetail");
  });

  it("has a route for /entries mapped to Entries", () => {
    const route = router.getRoutes().find((r) => r.path === "/entries");
    expect(route).toBeDefined();
    expect(route?.name).toBe("Entries");
  });

  it("has a route for /reports mapped to Reports", () => {
    const route = router.getRoutes().find((r) => r.path === "/reports");
    expect(route).toBeDefined();
    expect(route?.name).toBe("Reports");
  });

  it("has exactly 5 routes", () => {
    expect(router.getRoutes()).toHaveLength(5);
  });
});
