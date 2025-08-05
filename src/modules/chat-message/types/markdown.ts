// ===== MARKDOWN TYPES =====

/**
 * Markdown rendering options
 */
export interface MarkdownOptions {
  enableSyntaxHighlighting: boolean;
  enableMath: boolean;
  enableTables: boolean;
  enableTaskLists: boolean;
  enableEmoji: boolean;
  sanitize: boolean;
  breaks: boolean;
}

/**
 * Code block information
 */
export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  highlighted?: boolean;
}

/**
 * Markdown element types
 */
export type MarkdownElementType = 
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'blockquote'
  | 'list'
  | 'table'
  | 'link'
  | 'image'
  | 'math';

/**
 * Parsed markdown element
 */
export interface MarkdownElement {
  type: MarkdownElementType;
  content: string;
  metadata?: Record<string, unknown>;
  children?: MarkdownElement[];
}

/**
 * Markdown parsing result
 */
export interface ParsedMarkdown {
  elements: MarkdownElement[];
  hasCode: boolean;
  hasMath: boolean;
  hasImages: boolean;
  wordCount: number;
}

/**
 * Markdown theme configuration
 */
export interface MarkdownTheme {
  codeTheme: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  lineHeight: number;
  maxWidth?: string;
}

/**
 * Copy code functionality
 */
export interface CodeCopyState {
  [blockId: string]: {
    copied: boolean;
    timestamp: number;
  };
}