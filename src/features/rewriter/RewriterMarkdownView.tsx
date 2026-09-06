import React, { useId } from 'react';
import {
  ParsedRewrite,
  RewriteBlock,
  RewriteListItem,
  RewriteSection,
  formatInlineMarkdown,
  parseRewriteMarkdown,
  sectionStartsOpen,
} from './rewrite-markdown';
import { IconChevronDown } from '@/components/icons';

interface RewriterMarkdownViewProps {
  content: string;
}

export const RewriterMarkdownView: React.FC<RewriterMarkdownViewProps> = ({ content }) => {
  const parsed: ParsedRewrite = React.useMemo(() => parseRewriteMarkdown(content), [content]);

  if (!parsed.sections.length && !parsed.polished) {
    return (
      <div className="p-4 text-xs text-content-muted rounded-xl border border-dashed border-border">
        No structured rewrite content found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parsed.sections.map((section) => (
        <SectionAccordion key={section.id} section={section} />
      ))}
    </div>
  );
};

const SectionAccordion: React.FC<{ section: RewriteSection }> = ({ section }) => {
  const [isOpen, setIsOpen] = React.useState(() => sectionStartsOpen(section));
  const headingId = useId();

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-2xs transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={headingId}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <span className="text-[12.5px] font-semibold text-content">
          {section.title}
        </span>
        <span
          className={`text-content-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <IconChevronDown className="w-3.5 h-3.5" />
        </span>
      </button>

      {isOpen ? (
        <div id={headingId} className="px-3.5 pb-3.5 pt-1 border-t border-border/40 space-y-2.5">
          {section.blocks.map((block, idx) => (
            <BlockRenderer key={idx} block={block} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const BlockRenderer: React.FC<{ block: RewriteBlock }> = ({ block }) => {
  switch (block.type) {
    case 'heading': {
      const sizeClass =
        block.level <= 2
          ? 'text-sm font-bold text-content pt-2'
          : block.level === 3
          ? 'text-xs font-bold text-accent uppercase tracking-wider pt-1.5'
          : 'text-xs font-semibold text-content-secondary pt-1';
      return <div className={sizeClass}>{block.text}</div>;
    }
    case 'hr':
      return <hr className="border-border/60 my-2" />;
    case 'quote':
      return (
        <blockquote className="my-1.5 pl-3 py-1.5 border-l-2 border-accent/70 bg-accent-subtle/30 text-content text-xs rounded-r leading-relaxed whitespace-pre-wrap">
          {block.lines.map((line, idx) => (
            <p
              key={idx}
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
            />
          ))}
        </blockquote>
      );
    case 'table':
      return (
        <div className="overflow-x-auto my-2 rounded-lg border border-border">
          <table className="w-full text-left text-xs border-collapse">
            {block.headers.length ? (
              <thead className="bg-muted/60 text-content-secondary border-b border-border">
                <tr>
                  {block.headers.map((h, idx) => (
                    <th key={idx} className="px-2.5 py-1.5 font-semibold text-[11px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody className="divide-y divide-border/40 bg-surface">
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-muted/30">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-2.5 py-1.5 text-content text-[11.5px] leading-snug align-top"
                      dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'list':
      return (
        <ul
          className={`space-y-1 text-xs text-content leading-relaxed my-1 ${
            block.ordered ? 'list-decimal list-inside' : 'list-disc list-inside'
          }`}
        >
          {block.items.map((item, idx) => (
            <ListItemRenderer key={idx} item={item} ordered={block.ordered} />
          ))}
        </ul>
      );
    case 'paragraph':
      return (
        <p
          className="text-xs text-content-secondary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(block.text) }}
        />
      );
    default:
      return null;
  }
};

const ListItemRenderer: React.FC<{ item: RewriteListItem; ordered: boolean }> = ({ item, ordered }) => {
  return (
    <li>
      <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.text) }} />
      {item.children?.length ? (
        <ul className={`pl-4 mt-1 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {item.children.map((child, idx) => (
            <ListItemRenderer key={idx} item={child} ordered={ordered} />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

export default RewriterMarkdownView;
