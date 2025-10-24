import { SyncJob, SyncStartRequest, Account, Document } from '../types';
import { salesforceService } from './salesforceService';
import { onedriveService } from './onedriveService';
import { biService } from './biService';
import { documentProcessor } from './documentProcessor';
import { writeDataFile, appendToLogFile } from '../utils/storage';

class SyncOrchestrator {
  private activeJobs: Map<string, { job: SyncJob; controller: AbortController }> = new Map();

  async executeSync(job: SyncJob, scope?: SyncStartRequest['scope']): Promise<void> {
    const controller = new AbortController();
    this.activeJobs.set(job.id, { job, controller });

    try {
      await appendToLogFile('sync', {
        jobId: job.id,
        action: 'start',
        type: job.type,
        scope
      });

      job.status = 'in-progress';

      // Determine what to sync
      const sources = scope?.sources || ['salesforce', 'onedrive', 'bi'];
      const accountIds = scope?.accountIds;

      // Phase 1: Sync Salesforce data
      if (sources.includes('salesforce')) {
        await this.syncSalesforce(job, accountIds);
      }

      // Phase 2: Sync OneDrive documents
      if (sources.includes('onedrive')) {
        await this.syncOneDrive(job, accountIds);
      }

      // Phase 3: Sync Business Intelligence
      if (sources.includes('bi')) {
        await this.syncBusinessIntelligence(job, accountIds);
      }

      job.status = 'completed';
      job.endTime = new Date().toISOString();

      await appendToLogFile('sync', {
        jobId: job.id,
        action: 'complete',
        accountsProcessed: job.accountsProcessed.length,
        errors: job.errors.length
      });

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      job.errors.push({
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown sync error',
        timestamp: new Date().toISOString()
      });

      await appendToLogFile('sync', {
        jobId: job.id,
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  async cancelSync(jobId: string): Promise<void> {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.controller.abort();
      this.activeJobs.delete(jobId);

      await appendToLogFile('sync', {
        jobId,
        action: 'cancel'
      });
    }
  }

  private async syncSalesforce(job: SyncJob, accountIds?: string[]): Promise<void> {
    try {
      job.progress.salesforce.status = 'in-progress';

      // Fetch accounts
      const accounts = await salesforceService.fetchAccounts(accountIds);
      job.progress.salesforce.total = accounts.length;

      // Process each account
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];

        try {
          // Fetch account details
          const accountData = await salesforceService.fetchAccountDetails(account.id);

          // Store account data
          await this.storeAccountData(account.id, accountData);

          job.accountsProcessed.push(account.id);
          job.progress.salesforce.processed = i + 1;

        } catch (error) {
          job.errors.push({
            type: 'unknown',
            message: `Failed to sync Salesforce account ${account.id}: ${error}`,
            accountId: account.id,
            timestamp: new Date().toISOString()
          });
        }
      }

      job.progress.salesforce.status = 'completed';

    } catch (error) {
      job.progress.salesforce.status = 'failed';
      job.errors.push({
        type: 'auth-failed',
        message: `Salesforce sync failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async syncOneDrive(job: SyncJob, accountIds?: string[]): Promise<void> {
    try {
      job.progress.onedrive.status = 'in-progress';

      // Get accounts to sync documents for
      const targetAccounts = accountIds || job.accountsProcessed;
      job.progress.onedrive.total = targetAccounts.length;

      for (let i = 0; i < targetAccounts.length; i++) {
        const accountId = targetAccounts[i];

        try {
          // Fetch documents for this account
          const documents = await onedriveService.fetchAccountDocuments(accountId);

          // Process each document
          for (const doc of documents) {
            const processedDoc = await documentProcessor.processDocument(doc);
            await this.storeDocument(accountId, processedDoc);
          }

          job.progress.onedrive.processed = i + 1;

        } catch (error) {
          job.errors.push({
            type: 'unknown',
            message: `Failed to sync OneDrive for account ${accountId}: ${error}`,
            accountId,
            timestamp: new Date().toISOString()
          });
        }
      }

      job.progress.onedrive.status = 'completed';

    } catch (error) {
      job.progress.onedrive.status = 'failed';
      job.errors.push({
        type: 'auth-failed',
        message: `OneDrive sync failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async syncBusinessIntelligence(job: SyncJob, accountIds?: string[]): Promise<void> {
    try {
      job.progress.businessIntelligence.status = 'in-progress';

      // Get unique industries from synced accounts
      const accounts = await this.getStoredAccounts();
      const industries = [...new Set(accounts.map(a => a.industry))];

      job.progress.businessIntelligence.total = industries.length;

      for (let i = 0; i < industries.length; i++) {
        const industry = industries[i];

        try {
          const insights = await biService.fetchIndustryInsights(industry);
          await this.storeIndustryInsights(industry, insights);

          job.progress.businessIntelligence.processed = i + 1;

        } catch (error) {
          job.errors.push({
            type: 'unknown',
            message: `Failed to sync BI for industry ${industry}: ${error}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      job.progress.businessIntelligence.status = 'completed';

    } catch (error) {
      job.progress.businessIntelligence.status = 'failed';
      job.errors.push({
        type: 'unknown',
        message: `Business Intelligence sync failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async storeAccountData(accountId: string, data: any): Promise<void> {
    await writeDataFile(`accounts/${accountId}.json`, data);
  }

  private async storeDocument(accountId: string, document: Document): Promise<void> {
    const existingDocs = await this.getStoredDocuments(accountId);
    const updatedDocs = [...existingDocs.filter(d => d.id !== document.id), document];
    await writeDataFile(`documents/${accountId}.json`, updatedDocs);
  }

  private async storeIndustryInsights(industry: string, insights: any): Promise<void> {
    await writeDataFile(`bi/${industry.toLowerCase().replace(/\s+/g, '-')}.json`, insights);
  }

  private async getStoredAccounts(): Promise<Account[]> {
    // Implement reading stored accounts
    return [];
  }

  private async getStoredDocuments(accountId: string): Promise<Document[]> {
    // Implement reading stored documents
    return [];
  }
}

export const syncOrchestrator = new SyncOrchestrator();