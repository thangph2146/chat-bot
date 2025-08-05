/**
 * Utility functions for text processing and manipulation
 */

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Extract plain text from markdown
 */
export const extractPlainText = (markdown: string): string => {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

/**
 * Count words in text
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Count characters in text
 */
export const countCharacters = (text: string): number => {
  return text.length;
};

/**
 * Estimate reading time in minutes
 */
export const estimateReadingTime = (text: string, wordsPerMinute: number = 200): number => {
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
};

/**
 * Highlight search terms in text
 */
export const highlightSearchTerms = (text: string, searchTerms: string[]): string => {
  if (!searchTerms.length) return text;
  
  let highlightedText = text;
  searchTerms.forEach(term => {
    if (term.trim()) {
      const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    }
  });
  
  return highlightedText;
};

/**
 * Escape special regex characters
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Convert text to slug (URL-friendly string)
 */
export const toSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Generate a random ID
 */
export const generateId = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if text contains code blocks
 */
export const hasCodeBlocks = (text: string): boolean => {
  return /```[\s\S]*?```/.test(text) || /`[^`\n]+`/.test(text);
};

/**
 * Extract code blocks from text
 */
export const extractCodeBlocks = (text: string): Array<{ language: string; code: string; inline: boolean }> => {
  const codeBlocks: Array<{ language: string; code: string; inline: boolean }> = [];
  
  // Extract fenced code blocks
  const fencedRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  while ((match = fencedRegex.exec(text)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2],
      inline: false,
    });
  }
  
  // Extract inline code
  const inlineRegex = /`([^`\n]+)`/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    codeBlocks.push({
      language: 'text',
      code: match[1],
      inline: true,
    });
  }
  
  return codeBlocks;
};

/**
 * Format file size in bytes to human readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extract URLs from text
 */
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

/**
 * Extract mentions from text (e.g., @username)
 */
export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
};

/**
 * Extract hashtags from text (e.g., #hashtag)
 */
export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }
  return hashtags;
};

/**
 * Clean HTML tags from text
 */
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Escape HTML characters
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Unescape HTML characters
 */
export const unescapeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

/**
 * Convert line breaks to HTML br tags
 */
export const nl2br = (text: string): string => {
  return text.replace(/\n/g, '');
};

/**
 * Convert HTML br tags to line breaks
 */
export const br2nl = (html: string): string => {
  return html.replace(/<br\s*\/?>/gi, '\n');
};

/**
 * Capitalize first letter of each word
 */
export const titleCase = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Convert camelCase to kebab-case
 */
export const camelToKebab = (text: string): string => {
  return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * Convert kebab-case to camelCase
 */
export const kebabToCamel = (text: string): string => {
  return text.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Check if text is empty or only whitespace
 */
export const isEmpty = (text: string): boolean => {
  return !text || text.trim().length === 0;
};

/**
 * Remove extra whitespace and normalize line breaks
 */
export const normalizeWhitespace = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n') // Normalize line breaks
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\n\s*\n/g, '\n\n') // Replace multiple line breaks with double line break
    .trim();
};

/**
 * Split text into sentences
 */
export const splitIntoSentences = (text: string): string[] => {
  return text
    .split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
};

/**
 * Split text into paragraphs
 */
export const splitIntoParagraphs = (text: string): string[] => {
  return text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0);
};

/**
 * Get text similarity score (0-1) using Levenshtein distance
 */
export const getTextSimilarity = (text1: string, text2: string): number => {
  const longer = text1.length > text2.length ? text1 : text2;
  const shorter = text1.length > text2.length ? text2 : text1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};