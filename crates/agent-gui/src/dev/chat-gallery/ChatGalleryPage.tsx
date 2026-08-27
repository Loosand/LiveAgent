import { LocaleContext, useLocaleContextValue } from "@liveagent/ui/i18n/index";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { Locale } from "../../i18n/config";
import { ChatGalleryPreview } from "./ChatGalleryPreview";
import {
  CHAT_GALLERY_SCENARIOS,
  type ChatGalleryScenarioGroup,
  type ChatGalleryScenarioId,
  DEFAULT_CHAT_GALLERY_SCENARIO,
  isChatGalleryScenarioId,
} from "./scenarios";

type GalleryTheme = "light" | "dark";
type GalleryViewport = "fluid" | "390" | "768" | "1280";

const VIEWPORT_OPTIONS: Array<{ value: GalleryViewport; label: string }> = [
  { value: "fluid", label: "Fluid" },
  { value: "390", label: "390 px" },
  { value: "768", label: "768 px" },
  { value: "1280", label: "1280 px" },
];

const GROUP_LABELS: Record<ChatGalleryScenarioGroup, Record<Locale, string>> = {
  conversation: { "zh-CN": "会话与消息", "en-US": "Conversation & messages" },
  tooling: { "zh-CN": "工具与操作", "en-US": "Tools & operations" },
  interactive: { "zh-CN": "交互决策", "en-US": "Interactive decisions" },
  composer: { "zh-CN": "输入区组合", "en-US": "Composer combinations" },
};

function readInitialState() {
  const query = new URLSearchParams(window.location.search);
  const scenarioValue = query.get("scenario");
  const localeValue = query.get("locale");
  const themeValue = query.get("theme");
  const viewportValue = query.get("width");
  const viewport: GalleryViewport =
    viewportValue === "390" || viewportValue === "768" || viewportValue === "1280"
      ? viewportValue
      : "fluid";
  return {
    scenario: isChatGalleryScenarioId(scenarioValue)
      ? scenarioValue
      : DEFAULT_CHAT_GALLERY_SCENARIO,
    locale: localeValue === "en-US" ? ("en-US" as const) : ("zh-CN" as const),
    theme:
      themeValue === "dark" ||
      (themeValue !== "light" && document.documentElement.classList.contains("dark"))
        ? ("dark" as const)
        : ("light" as const),
    viewport,
  };
}

export function ChatGalleryPage() {
  const [initialState] = useState(readInitialState);
  const [scenarioId, setScenarioId] = useState<ChatGalleryScenarioId>(initialState.scenario);
  const [locale, setLocale] = useState<Locale>(initialState.locale);
  const [theme, setTheme] = useState<GalleryTheme>(initialState.theme);
  const [viewport, setViewport] = useState<GalleryViewport>(initialState.viewport);
  const [search, setSearch] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const localeContext = useLocaleContextValue(locale);
  const activeScenario = useMemo(
    () =>
      CHAT_GALLERY_SCENARIOS.find((scenario) => scenario.id === scenarioId) ??
      CHAT_GALLERY_SCENARIOS[0],
    [scenarioId],
  );
  const filteredScenarios = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return CHAT_GALLERY_SCENARIOS;
    return CHAT_GALLERY_SCENARIOS.filter((scenario) =>
      [scenario.id, scenario.title[locale], scenario.description[locale]]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [locale, search]);
  const isTranscriptScenario = activeScenario.group === "conversation";
  const viewportStyle = {
    "--chat-gallery-viewport-width": viewport === "fluid" ? "60rem" : `${viewport}px`,
  } as CSSProperties;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = locale;
    const query = new URLSearchParams(window.location.search);
    query.set("scenario", scenarioId);
    query.set("theme", theme);
    query.set("locale", locale);
    if (viewport === "fluid") query.delete("width");
    else query.set("width", viewport);
    window.history.replaceState(null, "", `${window.location.pathname}?${query.toString()}`);
  }, [locale, scenarioId, theme, viewport]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus(locale === "zh-CN" ? "已复制" : "Copied");
    } catch {
      window.prompt("Copy this URL", window.location.href);
    }
  };

  return (
    <LocaleContext.Provider value={localeContext}>
      <div className="chat-gallery-root">
        <header className="chat-gallery-topbar">
          <div className="chat-gallery-brand">
            <span className="chat-gallery-brand-mark" aria-hidden="true">
              LA
            </span>
            <div className="chat-gallery-brand-copy">
              <p className="chat-gallery-eyebrow">Developer surface</p>
              <h1 className="chat-gallery-title">Chat UI Gallery</h1>
            </div>
          </div>

          <fieldset className="chat-gallery-toolbar" aria-label="Preview controls">
            <label className="chat-gallery-control-group">
              <span className="chat-gallery-control-label">
                {locale === "zh-CN" ? "主题" : "Theme"}
              </span>
              <select
                className="chat-gallery-select"
                value={theme}
                onChange={(event) => setTheme(event.target.value as GalleryTheme)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="chat-gallery-control-group">
              <span className="chat-gallery-control-label">
                {locale === "zh-CN" ? "语言" : "Locale"}
              </span>
              <select
                className="chat-gallery-select"
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
              >
                <option value="zh-CN">中文</option>
                <option value="en-US">English</option>
              </select>
            </label>
            <label className="chat-gallery-control-group">
              <span className="chat-gallery-control-label">
                {locale === "zh-CN" ? "宽度" : "Width"}
              </span>
              <select
                className="chat-gallery-select"
                value={viewport}
                onChange={(event) => setViewport(event.target.value as GalleryViewport)}
              >
                {VIEWPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="chat-gallery-button" onClick={() => void copyLink()}>
              {copyStatus || (locale === "zh-CN" ? "复制链接" : "Copy link")}
            </button>
          </fieldset>
        </header>

        <div className="chat-gallery-layout">
          <aside className="chat-gallery-sidebar" aria-label="Chat UI scenarios">
            <div className="chat-gallery-sidebar-header">
              <h2 className="chat-gallery-sidebar-heading">
                {locale === "zh-CN" ? "场景" : "Scenarios"}
              </h2>
              <label className="chat-gallery-search">
                <span className="chat-gallery-search-icon" aria-hidden="true">
                  ⌕
                </span>
                <span className="chat-gallery-sr-only">
                  {locale === "zh-CN" ? "搜索场景" : "Search scenarios"}
                </span>
                <input
                  className="chat-gallery-search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={locale === "zh-CN" ? "搜索状态…" : "Search states…"}
                />
              </label>
            </div>
            <nav className="chat-gallery-sidebar-scroll">
              {(["conversation", "tooling", "interactive", "composer"] as const).map((group) => {
                const scenarios = filteredScenarios.filter((scenario) => scenario.group === group);
                if (scenarios.length === 0) return null;
                return (
                  <section key={group} className="chat-gallery-scenario-group">
                    <h3 className="chat-gallery-section-title">{GROUP_LABELS[group][locale]}</h3>
                    <ul className="chat-gallery-scenario-list">
                      {scenarios.map((scenario) => (
                        <li key={scenario.id}>
                          <button
                            type="button"
                            aria-current={scenario.id === scenarioId ? "page" : undefined}
                            className="chat-gallery-scenario-button"
                            onClick={() => setScenarioId(scenario.id)}
                          >
                            <span className="chat-gallery-scenario-indicator" aria-hidden="true" />
                            <span className="chat-gallery-scenario-label">
                              {scenario.title[locale]}
                            </span>
                            <span className="chat-gallery-scenario-meta">
                              {scenario.group === "conversation" ? "real" : "state"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </nav>
          </aside>

          <main className="chat-gallery-main">
            <section className="chat-gallery-preview" aria-label={activeScenario.title[locale]}>
              <header className="chat-gallery-preview-header">
                <div className="chat-gallery-preview-copy">
                  <p className="chat-gallery-eyebrow">
                    {GROUP_LABELS[activeScenario.group][locale]}
                  </p>
                  <h2 className="chat-gallery-preview-title">{activeScenario.title[locale]}</h2>
                  <p className="chat-gallery-preview-description">
                    {activeScenario.description[locale]}
                  </p>
                  <div className="chat-gallery-tags">
                    <span className="chat-gallery-tag" data-tone="success">
                      production components
                    </span>
                    <span className="chat-gallery-tag">isolated input</span>
                    {scenarioId === "streaming-run" ? (
                      <span className="chat-gallery-tag" data-tone="running">
                        live store
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="chat-gallery-preview-actions">
                  <span className="chat-gallery-badge">
                    {viewport === "fluid" ? "resizable" : `${viewport}px`}
                  </span>
                </div>
              </header>

              <div className="chat-gallery-canvas">
                <div className="chat-gallery-viewport-ruler" aria-hidden="true">
                  <span>0</span>
                  <span>
                    {viewport === "fluid" ? "drag the lower-right edge" : `${viewport} px`}
                  </span>
                  <span>100%</span>
                </div>
                <div
                  className="chat-gallery-viewport-frame"
                  data-resizable={viewport === "fluid" ? "true" : undefined}
                  data-surface={isTranscriptScenario ? "transcript" : "components"}
                  style={viewportStyle}
                >
                  <span className="chat-gallery-viewport-label" aria-hidden="true">
                    {viewport === "fluid" ? "fluid" : `${viewport}px`}
                  </span>
                  <div
                    className="chat-gallery-viewport-content"
                    data-scrollable={isTranscriptScenario ? undefined : "true"}
                  >
                    <ChatGalleryPreview
                      key={`${scenarioId}-${locale}`}
                      scenarioId={scenarioId}
                      locale={locale}
                    />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </LocaleContext.Provider>
  );
}
