import ReactDOM from "react-dom/client";
import "../../index.css";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { ChatGalleryPage } from "./ChatGalleryPage";
import "./chat-gallery.css";

type GalleryTauriInternals = {
  invoke?: (command: string, args?: unknown, options?: unknown) => Promise<unknown>;
  [key: string]: unknown;
};

const galleryWindow = window as unknown as {
  __TAURI_INTERNALS__?: GalleryTauriInternals;
};

// Keep the gallery entirely local: satisfy the one native capability probe used
// by the real composer, and reject every other native command.
galleryWindow.__TAURI_INTERNALS__ = {
  ...galleryWindow.__TAURI_INTERNALS__,
  invoke: async (command) => {
    if (command === "system_sandbox_capability") {
      return {
        supported: true,
        mechanism: "gallery-mock",
        platform: "browser",
        network_control: true,
      };
    }
    throw new Error(`[Chat Gallery] Native command is disabled: ${command}`);
  },
};

const root = document.getElementById("root");

if (!root) {
  throw new Error("Chat gallery root element is missing.");
}

ReactDOM.createRoot(root).render(
  import.meta.env.DEV ? (
    <ChatGalleryPage />
  ) : (
    <main className="flex h-full items-center justify-center bg-background p-8 text-foreground">
      <p>This UI gallery is available only in development mode.</p>
    </main>
  ),
);
