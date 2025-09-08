/**
 * Utility functions for cleaning and formatting markdown content
 */

/**
 * Clean AI response text to fix common markdown formatting issues
 * @param {string} response - Raw AI response text
 * @returns {string} - Cleaned response text
 */
export const cleanAIResponse = (response) => {
  if (!response || typeof response !== 'string') return '';
  
  let cleaned = response;
  
  // Remove excessive line breaks (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Fix horizontal rules (normalize different dash patterns)
  cleaned = cleaned.replace(/^-{4,}$/gm, '---');
  cleaned = cleaned.replace(/^\*{4,}$/gm, '---');
  cleaned = cleaned.replace(/^_{4,}$/gm, '---');
  
  // Fix bullet points (convert asterisks to dashes for consistency)
  cleaned = cleaned.replace(/^\*\s+/gm, '- ');
  cleaned = cleaned.replace(/^\+\s+/gm, '- ');
  
  // Ensure proper spacing around headers
  cleaned = cleaned.replace(/^(#{1,6})\s*(.+)$/gm, '\n$1 $2\n');
  
  // Fix bold text (triple asterisks to double)
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, '**$1**');
  
  // Fix tables (normalize pipe characters)
  cleaned = cleaned.replace(/\|\|/g, '|');
  
  // Remove leading/trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // Remove excessive whitespace at the beginning and end
  cleaned = cleaned.trim();
  
  return cleaned;
};

/**
 * Detect if content contains markdown formatting
 * @param {string} content - Text to check
 * @returns {boolean} - True if markdown is detected
 */
export const containsMarkdown = (content) => {
  if (!content || typeof content !== 'string') return false;
  
  const markdownPatterns = [
    /\*\*[^*]+\*\*/,        // Bold text
    /\*[^*]+\*/,            // Italic text
    /#{1,6}\s+/,            // Headers
    /```[\s\S]*?```/,       // Code blocks
    /`[^`]+`/,              // Inline code
    /^\s*[-*+]\s+/m,        // Unordered lists
    /^\s*\d+\.\s+/m,        // Ordered lists
    /\[([^\]]+)\]\(([^)]+)\)/, // Links
    /^\|.*\|$/m,            // Tables
    /^>{1,}\s+/m,           // Blockquotes
    /^---$/m,               // Horizontal rules
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
};

/**
 * Extract code blocks from markdown content
 * @param {string} content - Markdown content
 * @returns {Array} - Array of code block objects
 */
export const extractCodeBlocks = (content) => {
  if (!content || typeof content !== 'string') return [];
  
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      fullMatch: match[0],
    });
  }
  
  return codeBlocks;
};

/**
 * Format a plain text response as markdown
 * @param {string} text - Plain text response
 * @returns {string} - Formatted markdown
 */
export const formatAsMarkdown = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  let formatted = text;
  
  // Detect and format JSON
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      JSON.parse(text);
      formatted = '```json\n' + text + '\n```';
      return formatted;
    } catch (e) {
      // Not valid JSON, continue with other formatting
    }
  }
  
  // Detect and format code-like content
  if (text.includes('function') || text.includes('const ') || text.includes('let ') || 
      text.includes('import ') || text.includes('export ')) {
    formatted = '```javascript\n' + text + '\n```';
    return formatted;
  }
  
  // Add paragraph breaks for better readability
  formatted = formatted.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
  
  return formatted;
};

/**
 * Convert simple formatting patterns to markdown
 * @param {string} text - Text with simple formatting
 * @returns {string} - Markdown formatted text
 */
export const convertToMarkdown = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  let converted = text;
  
  // Convert UPPERCASE headers to markdown headers
  converted = converted.replace(/^([A-Z][A-Z\s]+):$/gm, '### $1');
  
  // Convert numbered items to ordered list
  converted = converted.replace(/^(\d+)\)\s+/gm, '$1. ');
  
  // Convert common emphasis patterns
  converted = converted.replace(/\b_([^_]+)_\b/g, '*$1*');  // Underscores to italics
  converted = converted.replace(/\bIMPORTANT:\s*/g, '**IMPORTANT:** ');
  converted = converted.replace(/\bNOTE:\s*/g, '**NOTE:** ');
  converted = converted.replace(/\bWARNING:\s*/g, '**WARNING:** ');
  
  return converted;
};

/**
 * Remove all markdown formatting from text
 * @param {string} text - Markdown text
 * @returns {string} - Plain text without formatting
 */
export const stripMarkdown = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  let stripped = text;
  
  // Remove code blocks
  stripped = stripped.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  stripped = stripped.replace(/`([^`]+)`/g, '$1');
  
  // Remove bold
  stripped = stripped.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Remove italic
  stripped = stripped.replace(/\*([^*]+)\*/g, '$1');
  stripped = stripped.replace(/_([^_]+)_/g, '$1');
  
  // Remove headers
  stripped = stripped.replace(/^#{1,6}\s+/gm, '');
  
  // Remove links but keep text
  stripped = stripped.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove images
  stripped = stripped.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  
  // Remove horizontal rules
  stripped = stripped.replace(/^[-*_]{3,}$/gm, '');
  
  // Remove blockquotes
  stripped = stripped.replace(/^>\s+/gm, '');
  
  // Remove list markers
  stripped = stripped.replace(/^[-*+]\s+/gm, '');
  stripped = stripped.replace(/^\d+\.\s+/gm, '');
  
  return stripped.trim();
};

export default {
  cleanAIResponse,
  containsMarkdown,
  extractCodeBlocks,
  formatAsMarkdown,
  convertToMarkdown,
  stripMarkdown,
};
