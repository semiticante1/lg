export type AppPage = "dashboard" | "devices" | "groups" | "audit" | "settings" | "notfound";

export function getActivePage(pathname: string): AppPage {
  switch (pathname) {
    case "/":
      return "dashboard";
    case "/devices":
      return "devices";
    case "/groups":
      return "groups";
    case "/audit":
      return "audit";
    case "/settings":
      return "settings";
    default:
      return "notfound";
  }
}
