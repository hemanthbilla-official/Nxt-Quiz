"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export default function MarkdownViewer({ content, className = "" }: MarkdownViewerProps) {
  return (
    <div className={`prose prose-slate prose-sm dark:prose-invert max-w-none md-viewer ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-foreground tracking-tight" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-8 text-foreground border-b border-border pb-2 uppercase tracking-wide" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-6 text-foreground" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 leading-7 text-foreground/80" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-5 space-y-2 text-foreground/80" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-5 space-y-2 text-foreground/80" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            return !match ? (
              <code className="bg-muted/60 px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground font-semibold border border-border/40" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-muted/30 p-4 rounded overflow-x-auto my-6 border border-border">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-muted pl-4 italic my-6 text-muted-foreground" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
