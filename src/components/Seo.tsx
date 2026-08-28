import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const OWNED = "data-seo-managed";

const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string,
  created: HTMLElement[],
  restore: Array<() => void>,
) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (el) {
    const prev = el.getAttribute("content");
    restore.push(() => {
      if (prev === null) el!.removeAttribute("content");
      else el!.setAttribute("content", prev);
    });
  } else {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute(OWNED, "true");
    document.head.appendChild(el);
    created.push(el);
  }
  el.setAttribute("content", content);
};

const Seo = ({
  title,
  description,
  canonical,
  ogType = "website",
  noindex = false,
  jsonLd,
}: SeoProps) => {
  useEffect(() => {
    const created: HTMLElement[] = [];
    const restore: Array<() => void> = [];

    const prevTitle = document.title;
    document.title = title;
    restore.push(() => {
      document.title = prevTitle;
    });

    if (description) {
      upsertMeta("name", "description", description, created, restore);
      upsertMeta("property", "og:description", description, created, restore);
      upsertMeta("name", "twitter:description", description, created, restore);
    }

    upsertMeta("property", "og:title", title, created, restore);
    upsertMeta("name", "twitter:title", title, created, restore);
    upsertMeta("property", "og:type", ogType, created, restore);

    if (canonical) {
      upsertMeta("property", "og:url", canonical, created, restore);

      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (link) {
        const prev = link.getAttribute("href");
        restore.push(() => {
          if (prev === null) link!.removeAttribute("href");
          else link!.setAttribute("href", prev);
        });
      } else {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        link.setAttribute(OWNED, "true");
        document.head.appendChild(link);
        created.push(link);
      }
      link.setAttribute("href", canonical);
    }

    if (noindex) {
      let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        robots.setAttribute(OWNED, "true");
        document.head.appendChild(robots);
        created.push(robots);
      } else {
        const prev = robots.getAttribute("content");
        restore.push(() => {
          if (prev === null) robots!.removeAttribute("content");
          else robots!.setAttribute("content", prev);
        });
      }
      robots.setAttribute("content", "noindex");
    }

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      document.head
        .querySelectorAll("script[data-seo-jsonld]")
        .forEach((el) => el.remove());
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      restore.forEach((fn) => fn());
      created.forEach((el) => el.remove());
      script?.remove();
    };
  }, [title, description, canonical, ogType, noindex, JSON.stringify(jsonLd ?? null)]);

  return null;
};

export default Seo;
