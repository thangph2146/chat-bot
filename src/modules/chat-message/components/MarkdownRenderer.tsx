import React, { useState, useCallback } from 'react';
import { MarkdownOptions, CodeBlock, MarkdownTheme } from '../types/markdown';
import { cn } from '@/lib/utils';
import { FaCopy, FaCheck, FaCode, FaExpand } from 'react-icons/fa';

interface MarkdownRendererProps {
  content: string;
  options?: Partial<MarkdownOptions>;
  theme?: Partial<MarkdownTheme>;
  className?: string;
  onCodeCopy?: (code: string, language: string) => void;
}



const defaultTheme: MarkdownTheme = {
  codeTheme: 'github',
  fontSize: 'medium',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  lineHeight: 1.6,
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  theme = {},
  className,
  onCodeCopy,
}) => {
  const [copiedBlocks, setCopiedBlocks] = useState<Record<string, boolean>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});


  const finalTheme = { ...defaultTheme, ...theme };

  const handleCopyCode = useCallback(async (code: string, language: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBlocks(prev => ({ ...prev, [blockId]: true }));
      onCodeCopy?.(code, language);
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopiedBlocks(prev => ({ ...prev, [blockId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [onCodeCopy]);

  const toggleBlockExpansion = useCallback((blockId: string) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  }, []);

  const renderCodeBlock = useCallback((block: CodeBlock, index: number) => {
    const blockId = `code-${index}`;
    const isExpanded = expandedBlocks[blockId];
    const isCopied = copiedBlocks[blockId];
    const shouldTruncate = block.code.split('\n').length > 10;
    const displayCode = shouldTruncate && !isExpanded 
      ? block.code.split('\n').slice(0, 10).join('\n') + '\n...'
      : block.code;

    return (
      <div key={blockId} className="relative group my-4">
        {/* Code block header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-800 text-white px-4 py-2 rounded-t-lg text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <FaCode className="w-3 h-3" />
            <span className="font-medium">
              {block.language || 'text'}
            </span>
            {block.filename && (
              <span className="text-blue-200">• {block.filename}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {shouldTruncate && (
              <button
                onClick={() => toggleBlockExpansion(blockId)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition-all duration-200 shadow-sm"
              >
                <FaExpand className="w-3 h-3" />
                {isExpanded ? 'Thu gọn' : 'Mở rộng'}
              </button>
            )}
            
            <button
              onClick={() => handleCopyCode(block.code, block.language, blockId)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition-all duration-200 shadow-sm"
            >
              {isCopied ? (
                <>
                  <FaCheck className="w-3 h-3 text-blue-200" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <FaCopy className="w-3 h-3" />
                  Sao chép
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Code content */}
        <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-b-lg overflow-hidden border border-blue-200">
          <pre className="p-4 overflow-x-auto text-sm">
            <code className={`language-${block.language} text-gray-100`}>
              {displayCode}
            </code>
          </pre>
        </div>
      </div>
    );
  }, [expandedBlocks, copiedBlocks, handleCopyCode, toggleBlockExpansion]);



  const renderContent = useCallback(() => {
    const elements = [];

    // Simple markdown parsing for streaming content
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';
    let codeBlockIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim();
          codeBlockContent = '';
        } else {
          // End of code block
          inCodeBlock = false;
          elements.push(
            renderCodeBlock({
              language: codeBlockLanguage,
              code: codeBlockContent,
            }, codeBlockIndex++)
          );
          codeBlockContent = '';
          codeBlockLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += (codeBlockContent ? '\n' : '') + line;
        continue;
      }

      // Handle other markdown elements
      let processedLine = line;
      
      // Inline code
      processedLine = processedLine.replace(/`([^`]+)`/g, (match, code) => {
        return `<code class="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-sm font-mono border border-blue-200">${code}</code>`;
      });
      
      // Bold text
      processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Italic text
      processedLine = processedLine.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      
      // Links
      processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
        '<a href="$2" class="text-blue-700 hover:text-blue-800 underline hover:bg-blue-50 px-1 py-0.5 rounded transition-all duration-200" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      // Headers
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const headerClass = {
          1: 'text-2xl font-bold mt-6 mb-4',
          2: 'text-xl font-bold mt-5 mb-3',
          3: 'text-lg font-bold mt-4 mb-2',
          4: 'text-base font-bold mt-3 mb-2',
          5: 'text-sm font-bold mt-2 mb-1',
          6: 'text-xs font-bold mt-2 mb-1',
        }[level] || 'text-base font-bold mt-2 mb-1';
        
        elements.push(
          <div key={`header-${i}`} className={headerClass} dangerouslySetInnerHTML={{ __html: text }} />
        );
        continue;
      }

      // Lists
      if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
        elements.push(
          <li key={`list-${i}`} className="ml-4 mb-1" dangerouslySetInnerHTML={{ __html: processedLine.replace(/^\s*(?:[-*+]|\d+\.)\s*/, '') }} />
        );
        continue;
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <p key={`para-${i}`} className="mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: processedLine }} />
        );
      } else {
        elements.push(<br key={`br-${i}`} />);
      }
    }

    // Handle unclosed code block
    if (inCodeBlock && codeBlockContent) {
      elements.push(
        renderCodeBlock({
          language: codeBlockLanguage,
          code: codeBlockContent,
        }, codeBlockIndex)
      );
    }

    return elements;
  }, [content, renderCodeBlock]);

  return (
    <div 
      className={cn(
        'markdown-content',
        {
          'text-sm': finalTheme.fontSize === 'small',
          'text-base': finalTheme.fontSize === 'medium',
          'text-lg': finalTheme.fontSize === 'large',
        },
        className
      )}
      style={{
        fontFamily: finalTheme.fontFamily,
        lineHeight: finalTheme.lineHeight,
        maxWidth: finalTheme.maxWidth,
      }}
    >
      {renderContent()}
    </div>
  );
};

// Helper function to parse markdown content


export default MarkdownRenderer;