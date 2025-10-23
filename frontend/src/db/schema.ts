import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Document,
  Priority,
  UpcomingDate,
  Project,
  CustomerIssue,
  Ticket,
  IndustryIntelligence,
  ChatMessage,
  SyncJob,
  UserPreferences
} from '@/types';

export class CS720Database extends Dexie {
  // Tables
  accounts!: Table<Account>;
  documents!: Table<Document>;
  priorities!: Table<Priority>;
  upcomingDates!: Table<UpcomingDate>;
  projects!: Table<Project>;
  customerIssues!: Table<CustomerIssue>;
  tickets!: Table<Ticket>;
  industryIntelligence!: Table<IndustryIntelligence>;
  chatMessages!: Table<ChatMessage>;
  syncJobs!: Table<SyncJob>;
  preferences!: Table<UserPreferences & { id: string }>;

  constructor() {
    super('CS720Database');

    this.version(1).stores({
      accounts: 'id, name, industry, status, lastModified, salesforceId',
      documents: 'id, accountId, title, type, source, lastModified, [accountId+type]',
      priorities: 'id, accountId, priority, status, dueDate, [accountId+priority]',
      upcomingDates: 'id, accountId, date, type, [accountId+date]',
      projects: 'id, accountId, status, startDate, dueDate, [accountId+status]',
      customerIssues: 'id, accountId, severity, status, createdDate, [accountId+severity]',
      tickets: 'id, accountId, priority, status, createdDate, [accountId+priority]',
      industryIntelligence: 'id, accountId, industry, lastUpdated',
      chatMessages: 'id, accountId, timestamp, model, [accountId+timestamp]',
      syncJobs: 'id, type, status, startTime, endTime',
      preferences: 'id'
    });
  }
}

// Create and export database instance
export const db = new CS720Database();

// Database utilities
export class DatabaseService {
  // Account operations
  static async getAccounts(): Promise<Account[]> {
    const accounts = await db.accounts.toArray();
    return accounts.sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getAccount(id: string): Promise<Account | undefined> {
    return await db.accounts.get(id);
  }

  static async saveAccount(account: Account): Promise<void> {
    await db.accounts.put(account);
  }

  static async saveAccounts(accounts: Account[]): Promise<void> {
    await db.accounts.bulkPut(accounts);
  }

  // Document operations
  static async getAccountDocuments(accountId: string): Promise<Document[]> {
    const documents = await db.documents
      .where('accountId')
      .equals(accountId)
      .toArray();

    return documents.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  static async getDocument(id: string): Promise<Document | undefined> {
    return await db.documents.get(id);
  }

  static async saveDocument(document: Document): Promise<void> {
    await db.documents.put(document);
  }

  static async saveDocuments(documents: Document[]): Promise<void> {
    await db.documents.bulkPut(documents);
  }

  static async searchDocuments(query: string, accountId?: string): Promise<Document[]> {
    let collection = db.documents.toCollection();

    if (accountId) {
      collection = db.documents.where('accountId').equals(accountId);
    }

    const documents = await collection.toArray();
    const lowercaseQuery = query.toLowerCase();

    return documents.filter(doc =>
      doc.title.toLowerCase().includes(lowercaseQuery) ||
      doc.content.toLowerCase().includes(lowercaseQuery) ||
      doc.keywords?.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Dashboard data operations
  static async getDashboardData(accountId: string): Promise<{
    priorities: Priority[];
    upcomingDates: UpcomingDate[];
    projects: Project[];
    customerIssues: CustomerIssue[];
    tickets: Ticket[];
    industryIntelligence: IndustryIntelligence[];
  }> {
    const [
      priorities,
      upcomingDates,
      projects,
      customerIssues,
      tickets,
      industryIntelligence
    ] = await Promise.all([
      db.priorities.where('accountId').equals(accountId).toArray(),
      db.upcomingDates.where('accountId').equals(accountId).toArray(),
      db.projects.where('accountId').equals(accountId).toArray(),
      db.customerIssues.where('accountId').equals(accountId).toArray(),
      db.tickets.where('accountId').equals(accountId).toArray(),
      db.industryIntelligence.where('accountId').equals(accountId).toArray()
    ]);

    return {
      priorities,
      upcomingDates,
      projects,
      customerIssues,
      tickets,
      industryIntelligence
    };
  }

  static async saveDashboardData(_accountId: string, data: {
    priorities?: Priority[];
    upcomingDates?: UpcomingDate[];
    projects?: Project[];
    customerIssues?: CustomerIssue[];
    tickets?: Ticket[];
    industryIntelligence?: IndustryIntelligence[];
  }): Promise<void> {
    const operations: Promise<any>[] = [];

    if (data.priorities) {
      operations.push(db.priorities.bulkPut(data.priorities));
    }
    if (data.upcomingDates) {
      operations.push(db.upcomingDates.bulkPut(data.upcomingDates));
    }
    if (data.projects) {
      operations.push(db.projects.bulkPut(data.projects));
    }
    if (data.customerIssues) {
      operations.push(db.customerIssues.bulkPut(data.customerIssues));
    }
    if (data.tickets) {
      operations.push(db.tickets.bulkPut(data.tickets));
    }
    if (data.industryIntelligence) {
      operations.push(db.industryIntelligence.bulkPut(data.industryIntelligence));
    }

    await Promise.all(operations);
  }

  // Chat operations
  static async getChatHistory(accountId: string, limit: number = 50): Promise<ChatMessage[]> {
    const messages = await db.chatMessages
      .where('accountId')
      .equals(accountId)
      .toArray();

    return messages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  static async saveChatMessage(message: ChatMessage): Promise<void> {
    await db.chatMessages.put(message);
  }

  static async clearChatHistory(accountId: string): Promise<void> {
    await db.chatMessages.where('accountId').equals(accountId).delete();
  }

  // Sync operations
  static async getRecentSyncJobs(limit: number = 10): Promise<SyncJob[]> {
    const jobs = await db.syncJobs.toArray();
    return jobs
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  static async saveSyncJob(job: SyncJob): Promise<void> {
    await db.syncJobs.put(job);
  }

  // Preferences operations
  static async getPreferences(): Promise<UserPreferences | null> {
    const prefs = await db.preferences.get('default');
    return prefs ? { ...prefs } : null;
  }

  static async savePreferences(preferences: UserPreferences): Promise<void> {
    await db.preferences.put({ id: 'default', ...preferences });
  }

  // Database maintenance
  static async clearAllData(): Promise<void> {
    await db.transaction('rw', [
      db.accounts,
      db.documents,
      db.priorities,
      db.upcomingDates,
      db.projects,
      db.customerIssues,
      db.tickets,
      db.industryIntelligence,
      db.chatMessages,
      db.syncJobs
    ], async () => {
      await Promise.all([
        db.accounts.clear(),
        db.documents.clear(),
        db.priorities.clear(),
        db.upcomingDates.clear(),
        db.projects.clear(),
        db.customerIssues.clear(),
        db.tickets.clear(),
        db.industryIntelligence.clear(),
        db.chatMessages.clear(),
        db.syncJobs.clear()
      ]);
    });
  }

  static async clearAccountData(accountId: string): Promise<void> {
    await db.transaction('rw', [
      db.accounts,
      db.documents,
      db.priorities,
      db.upcomingDates,
      db.projects,
      db.customerIssues,
      db.tickets,
      db.industryIntelligence,
      db.chatMessages
    ], async () => {
      await Promise.all([
        db.accounts.delete(accountId),
        db.documents.where('accountId').equals(accountId).delete(),
        db.priorities.where('accountId').equals(accountId).delete(),
        db.upcomingDates.where('accountId').equals(accountId).delete(),
        db.projects.where('accountId').equals(accountId).delete(),
        db.customerIssues.where('accountId').equals(accountId).delete(),
        db.tickets.where('accountId').equals(accountId).delete(),
        db.industryIntelligence.where('accountId').equals(accountId).delete(),
        db.chatMessages.where('accountId').equals(accountId).delete()
      ]);
    });
  }

  static async getStorageUsage(): Promise<{
    totalSize: number;
    tableBreakdown: Record<string, number>;
  }> {
    // Estimate storage usage
    const tables = [
      'accounts', 'documents', 'priorities', 'upcomingDates',
      'projects', 'customerIssues', 'tickets', 'industryIntelligence',
      'chatMessages', 'syncJobs', 'preferences'
    ];

    const breakdown: Record<string, number> = {};
    let totalSize = 0;

    for (const tableName of tables) {
      const count = await (db as any)[tableName].count();
      // Rough estimate: 1KB per record
      const size = count * 1024;
      breakdown[tableName] = size;
      totalSize += size;
    }

    return { totalSize, tableBreakdown: breakdown };
  }
}

// Export database instance for direct access when needed
export default db;