import type { ReactNode } from "react";

export function GalleryComponentCard(props: {
  title: string;
  description: string;
  children: ReactNode;
  badge?: string;
  tone?: "running" | "success" | "error";
  fullWidth?: boolean;
  footer?: string;
  flush?: boolean;
}) {
  const { title, description, children, badge, tone, fullWidth, footer, flush } = props;
  return (
    <article className="chat-gallery-component-card" data-span={fullWidth ? "full" : undefined}>
      <header className="chat-gallery-card-header">
        <div className="chat-gallery-card-heading">
          <h3 className="chat-gallery-card-title">{title}</h3>
          <p className="chat-gallery-card-description">{description}</p>
        </div>
        {badge ? (
          <span className="chat-gallery-badge" data-tone={tone}>
            {badge}
          </span>
        ) : null}
      </header>
      <div className="chat-gallery-card-body" data-padding={flush ? "none" : undefined}>
        {children}
      </div>
      {footer ? <footer className="chat-gallery-card-footer">{footer}</footer> : null}
    </article>
  );
}
