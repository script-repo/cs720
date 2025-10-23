import { Document } from '../types';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { marked } from 'marked';

class DocumentProcessor {
  async processDocument(document: Document): Promise<Document> {
    try {
      let processedContent = document.content;

      // Process based on file type
      if (document.title.endsWith('.docx')) {
        processedContent = await this.processDOCX(document.content);
      } else if (document.title.endsWith('.pdf')) {
        processedContent = await this.processPDF(document.content);
      } else if (document.title.endsWith('.html')) {
        processedContent = await this.processHTML(document.content);
      } else if (document.title.endsWith('.md')) {
        processedContent = await this.processMarkdown(document.content);
      }

      // Clean and format the content
      processedContent = this.cleanContent(processedContent);

      return {
        ...document,
        content: processedContent
      };

    } catch (error) {
      console.error(`Error processing document ${document.title}:`, error);

      // Return original document with error annotation
      return {
        ...document,
        content: `[Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}]\n\n${document.content}`
      };
    }
  }

  private async processDOCX(content: string): Promise<string> {
    try {
      // If content is a file path or buffer, we need to handle it differently
      // For now, assume it's already extracted text
      if (content.startsWith('[DOCX content from')) {
        // This is a placeholder from onedriveService
        return content;
      }

      // In a real implementation, you would use mammoth to extract from binary data
      // const result = await mammoth.extractRawText({ buffer: docxBuffer });
      // return result.value;

      return content;

    } catch (error) {
      console.error('Error processing DOCX:', error);
      return `[Error processing DOCX file: ${error}]`;
    }
  }

  private async processPDF(content: string): Promise<string> {
    try {
      // If content is a file path or buffer, we need to handle it differently
      // For now, assume it's already extracted text
      if (content.startsWith('[PDF content from')) {
        // This is a placeholder from onedriveService
        return content;
      }

      // In a real implementation, you would use pdf-parse
      // const data = await pdfParse(pdfBuffer);
      // return data.text;

      return content;

    } catch (error) {
      console.error('Error processing PDF:', error);
      return `[Error processing PDF file: ${error}]`;
    }
  }

  private async processHTML(content: string): Promise<string> {
    try {
      // Convert HTML to markdown for consistent formatting
      // This is a simple implementation - you might want to use a library like turndown
      let markdown = content
        .replace(/<h([1-6])>/gi, (match, level) => '#'.repeat(parseInt(level)) + ' ')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<p>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<strong>|<b>/gi, '**')
        .replace(/<\/strong>|<\/b>/gi, '**')
        .replace(/<em>|<i>/gi, '*')
        .replace(/<\/em>|<\/i>/gi, '*')
        .replace(/<li>/gi, '- ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]*>/g, ''); // Remove all other HTML tags

      return this.cleanContent(markdown);

    } catch (error) {
      console.error('Error processing HTML:', error);
      return content;
    }
  }

  private async processMarkdown(content: string): Promise<string> {
    try {
      // Markdown is already in the desired format, just clean it
      return this.cleanContent(content);

    } catch (error) {
      console.error('Error processing Markdown:', error);
      return content;
    }
  }

  private cleanContent(content: string): string {
    return content
      // Remove excessive whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      // Remove leading/trailing whitespace from lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Remove leading/trailing empty lines
      .trim();
  }

  extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Return top keywords
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }

  extractMentions(content: string): string[] {
    // Extract potential company/person mentions
    const mentions: string[] = [];

    // Look for capitalized words that might be names or companies
    const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

    // Filter out common words
    const commonWords = new Set(['The', 'This', 'That', 'Then', 'When', 'Where', 'How', 'Why', 'What', 'Who']);

    capitalizedWords.forEach(word => {
      if (!commonWords.has(word) && word.length > 2) {
        mentions.push(word);
      }
    });

    // Return unique mentions
    return [...new Set(mentions)];
  }

  estimateReadingTime(content: string): number {
    // Estimate reading time in minutes (average 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / 200);
  }

  summarizeContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Simple summarization - take first sentences up to maxLength
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let summary = '';

    for (const sentence of sentences) {
      if (summary.length + sentence.length + 1 <= maxLength) {
        summary += sentence.trim() + '. ';
      } else {
        break;
      }
    }

    return summary.trim() || content.substring(0, maxLength) + '...';
  }
}

export const documentProcessor = new DocumentProcessor();