// Centralized menu config — used by Sidebar for links and by Navbar for the page title.
// Add matching <Route> entries in App.jsx as you build out each page.

export const MENU = [
  { key: "home", label: "Dashboard", icon: "home", to: "/dashboard" },
  {
    key: "users",
    label: "Users",
    icon: "users",
    children: [
      { key: "create-user", label: "Create User", to: "/create/user" },
      { key: "all-users", label: "All Users", to: "/users/list" },
    ],
  },
];

// Flattened list (parents + children) for quick lookups like page titles.
export const FLAT_MENU = MENU.flatMap((item) =>
  item.children ? [item, ...item.children] : [item],
);

// Returns the best-matching menu entry for a given pathname.
export function findActiveMenu(pathname) {
  const candidates = FLAT_MENU.filter((item) => item.to);
  const match = candidates
    .filter(
      (item) => pathname === item.to || pathname.startsWith(item.to + "/"),
    )
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match || null;
}

// Returns the parent key that should be auto-expanded for a given pathname.
export function findParentKey(pathname) {
  const parent = MENU.find(
    (item) =>
      item.children &&
      item.children.some(
        (child) => pathname === child.to || pathname.startsWith(child.to + "/"),
      ),
  );
  return parent ? parent.key : null;
}
