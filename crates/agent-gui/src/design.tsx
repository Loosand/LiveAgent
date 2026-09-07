import "./index.css";

// This entry is served by Vite development only; it is not a production build input.
if (import.meta.env.DEV) {
  Promise.all([import("react-dom/client"), import("@liveagent/ui/dev/DesignSystemPreview")]).then(
    ([{ createRoot }, { DesignSystemPreview }]) => {
      const root = document.getElementById("root");
      if (root) createRoot(root).render(<DesignSystemPreview />);
    },
  );
}
