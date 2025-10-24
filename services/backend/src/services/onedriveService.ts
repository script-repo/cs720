import { Document } from '../types';
import { decryptTokens } from '../utils/encryption';
import fs from 'fs-extra';
import path from 'path';

interface OneDriveFile {
  id: string;
  name: string;
  '@microsoft.graph.downloadUrl': string;
  lastModifiedDateTime: string;
  size: number;
  file?: {
    mimeType: string;
  };
}

class OneDriveService {
  private async getAccessToken(): Promise<string | null> {
    try {
      const tokenPath = path.join('.cs720', 'auth', 'tokens.enc');

      if (!await fs.pathExists(tokenPath)) {
        return null;
      }

      const encryptedTokens = await fs.readFile(tokenPath, 'utf8');
      const tokens = decryptTokens(encryptedTokens);

      if (!tokens.microsoft?.accessToken) {
        return null;
      }

      // Check if token is expired
      if (tokens.microsoft.expiresAt && tokens.microsoft.expiresAt < Date.now()) {
        // TODO: Implement token refresh
        return null;
      }

      return tokens.microsoft.accessToken;

    } catch (error) {
      console.error('Error getting Microsoft access token:', error);
      return null;
    }
  }

  async fetchAccountDocuments(accountId: string): Promise<Document[]> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated with Microsoft');
    }

    try {
      // Search for documents related to the account
      // This is a simplified approach - in reality, you'd need a mapping strategy
      const searchResults = await this.searchDocuments(accountId, accessToken);

      const documents: Document[] = [];

      for (const file of searchResults) {
        try {
          const document = await this.processFile(file, accountId, accessToken);
          if (document) {
            documents.push(document);
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }

      return documents;

    } catch (error) {
      console.error(`Error fetching OneDrive documents for account ${accountId}:`, error);
      throw error;
    }
  }

  private async searchDocuments(accountId: string, accessToken: string): Promise<OneDriveFile[]> {
    try {
      // Search for files that might be related to the account
      // This could be improved with better search terms or folder structure
      const searchQuery = encodeURIComponent(`name:${accountId} OR name:"customer"`);

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/search(q='${searchQuery}')`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.value || [];

    } catch (error) {
      console.error('Error searching OneDrive documents:', error);
      return [];
    }
  }

  private async processFile(file: OneDriveFile, accountId: string, accessToken: string): Promise<Document | null> {
    try {
      // Only process supported file types
      const supportedTypes = ['.docx', '.pdf', '.txt', '.md'];
      const fileExtension = path.extname(file.name).toLowerCase();

      if (!supportedTypes.includes(fileExtension)) {
        return null;
      }

      // Download file content
      const content = await this.downloadFileContent(file, accessToken);

      if (!content) {
        return null;
      }

      return {
        id: `od-${file.id}`,
        accountId,
        title: file.name,
        content,
        type: this.determineDocumentType(file.name),
        source: 'onedrive',
        sourceId: file.id,
        lastModified: file.lastModifiedDateTime,
        url: file['@microsoft.graph.downloadUrl']
      };

    } catch (error) {
      console.error(`Error processing OneDrive file ${file.name}:`, error);
      return null;
    }
  }

  private async downloadFileContent(file: OneDriveFile, accessToken: string): Promise<string | null> {
    try {
      const downloadUrl = file['@microsoft.graph.downloadUrl'];
      if (!downloadUrl) {
        // Fallback to Graph API download
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        return this.extractTextFromBuffer(buffer, file.name);
      }

      // Use direct download URL
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      return this.extractTextFromBuffer(buffer, file.name);

    } catch (error) {
      console.error(`Error downloading file ${file.name}:`, error);
      return null;
    }
  }

  private extractTextFromBuffer(buffer: ArrayBuffer, filename: string): string {
    const extension = path.extname(filename).toLowerCase();

    switch (extension) {
      case '.txt':
      case '.md':
        return new TextDecoder().decode(buffer);

      case '.docx':
        // TODO: Implement DOCX extraction using mammoth
        return `[DOCX content from ${filename} - processing not yet implemented]`;

      case '.pdf':
        // TODO: Implement PDF extraction using pdf-parse
        return `[PDF content from ${filename} - processing not yet implemented]`;

      default:
        return `[Unsupported file type: ${extension}]`;
    }
  }

  private determineDocumentType(filename: string): 'meeting-notes' | 'technical-doc' | 'sales-note' | 'contract' | 'other' {
    const name = filename.toLowerCase();

    if (name.includes('meeting') || name.includes('notes') || name.includes('minutes')) {
      return 'meeting-notes';
    }

    if (name.includes('technical') || name.includes('architecture') || name.includes('spec')) {
      return 'technical-doc';
    }

    if (name.includes('sales') || name.includes('proposal') || name.includes('quote')) {
      return 'sales-note';
    }

    if (name.includes('contract') || name.includes('agreement') || name.includes('sow')) {
      return 'contract';
    }

    return 'other';
  }
}

export const onedriveService = new OneDriveService();