import { useEffect } from "react";

export function useBootstrapCss() {
  useEffect(() => {
    if (document.getElementById("bs-css")) return;
    const link = document.createElement("link");
    link.id = "bs-css";
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    document.head.appendChild(link);
  }, []);
}
