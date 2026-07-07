/* eslint-disable @next/next/no-img-element */
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MermaidBlock } from "@/components/markdown/mermaid-block";
import { idFromHeading } from "@/lib/content/heading-id";

function textFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(textFromChildren).join("");
  return "";
}

export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }], rehypeHighlight]}
      components={{
        h1({ children, ...props }) {
          return (
            <h1 id={idFromHeading(textFromChildren(children))} {...props}>
              {children}
            </h1>
          );
        },
        h2({ children, ...props }) {
          return (
            <h2 id={idFromHeading(textFromChildren(children))} {...props}>
              {children}
            </h2>
          );
        },
        h3({ children, ...props }) {
          return (
            <h3 id={idFromHeading(textFromChildren(children))} {...props}>
              {children}
            </h3>
          );
        },
        img({ alt, ...props }) {
          return <img loading="lazy" alt={alt ?? ""} {...props} />;
        },
        code({ className, children, ...props }) {
          const language = /language-(\w+)/.exec(className ?? "")?.[1];
          const code = String(children).replace(/\n$/, "");

          if (language === "mermaid") {
            return <MermaidBlock code={code} />;
          }

          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
