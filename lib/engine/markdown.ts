/**
 * Markdown → sanitised HTML for case documents. Runs at compile time only.
 *
 * Case-specific syntax:
 *   {{uv: hidden text}}   ink that only shows under the UV torch (hidden from
 *                         screen readers until found; see UVDocument)
 *   [[redacted]]          a black redaction bar (screen readers hear "redacted")
 *   [[stamp: TEXT]]       a rubber stamp
 */
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

// `breaks`: single newlines are line breaks, which suits typed reports and forms.
const marked = new Marked({ gfm: true, breaks: true, async: false });

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function preprocess(md: string): string {
  return md
    .replace(/\{\{uv:\s*([^}]+?)\s*\}\}/g, (_, t: string) => `<span class="uv-ink" data-uv="" aria-hidden="true">${escapeHtml(t)}</span>`)
    .replace(/\[\[redacted\]\]/g, '<span class="redacted" role="img" aria-label="redacted">██████</span>')
    .replace(/\[\[stamp:\s*([^\]]+?)\s*\]\]/g, (_, t: string) => `<span class="stamp">${escapeHtml(t)}</span>`);
}

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "del", "blockquote", "code", "pre",
    "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "span", "a", "small", "sup", "sub",
  ],
  allowedAttributes: {
    span: ["class", "data-uv", "role", "aria-label", "aria-hidden"],
    a: ["href", "rel", "target"],
    th: ["align", "scope"],
    td: ["align"],
  },
  allowedClasses: { span: ["uv-ink", "redacted", "stamp"] },
  allowedSchemes: ["https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

export function renderMarkdown(md: string): string {
  return sanitizeHtml(marked.parse(preprocess(md)) as string, SANITIZE);
}

export function renderInline(md: string): string {
  return sanitizeHtml(marked.parseInline(preprocess(md)) as string, SANITIZE);
}
