import { Account, Priority, UpcomingDate, CustomerIssue, Ticket } from '../types';
import { readDataFile } from '../utils/storage';
import { decryptTokens } from '../utils/encryption';
import fs from 'fs-extra';
import path from 'path';

class SalesforceService {
  private async getAccessToken(): Promise<{ token: string; instanceUrl: string } | null> {
    try {
      const tokenPath = path.join('.cs720', 'auth', 'tokens.enc');

      if (!await fs.pathExists(tokenPath)) {
        return null;
      }

      const encryptedTokens = await fs.readFile(tokenPath, 'utf8');
      const tokens = decryptTokens(encryptedTokens);

      if (!tokens.salesforce?.accessToken) {
        return null;
      }

      // Check if token is expired
      if (tokens.salesforce.expiresAt && tokens.salesforce.expiresAt < Date.now()) {
        // TODO: Implement token refresh
        return null;
      }

      return {
        token: tokens.salesforce.accessToken,
        instanceUrl: tokens.salesforce.instanceUrl
      };

    } catch (error) {
      console.error('Error getting Salesforce access token:', error);
      return null;
    }
  }

  async fetchAccounts(accountIds?: string[]): Promise<Account[]> {
    const auth = await this.getAccessToken();
    if (!auth) {
      throw new Error('Not authenticated with Salesforce');
    }

    try {
      let query = `SELECT Id, Name, Industry, AccountStatus__c, SiteCount__c, LastModifiedDate FROM Account`;

      if (accountIds && accountIds.length > 0) {
        const idList = accountIds.map(id => `'${id}'`).join(',');
        query += ` WHERE Id IN (${idList})`;
      }

      query += ` ORDER BY LastModifiedDate DESC LIMIT 100`;

      const response = await fetch(`${auth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.statusText}`);
      }

      const data: any = await response.json();

      return data.records.map((record: any) => ({
        id: record.Id,
        name: record.Name,
        industry: record.Industry || 'Unknown',
        status: this.mapAccountStatus(record.AccountStatus__c),
        siteCount: record.SiteCount__c || 0,
        lastModified: record.LastModifiedDate,
        salesforceId: record.Id
      }));

    } catch (error) {
      console.error('Error fetching Salesforce accounts:', error);
      throw error;
    }
  }

  async fetchAccountDetails(accountId: string): Promise<any> {
    const auth = await this.getAccessToken();
    if (!auth) {
      throw new Error('Not authenticated with Salesforce');
    }

    try {
      // Fetch account details, opportunities, cases, etc.
      const [account, opportunities, cases] = await Promise.all([
        this.fetchSingleAccount(accountId, auth),
        this.fetchOpportunities(accountId, auth),
        this.fetchCases(accountId, auth)
      ]);

      return {
        account,
        opportunities,
        cases,
        priorities: this.extractPriorities(opportunities, cases),
        upcomingDates: this.extractUpcomingDates(opportunities),
        customerIssues: this.mapCasesToIssues(cases),
        tickets: this.mapCasesToTickets(cases)
      };

    } catch (error) {
      console.error(`Error fetching details for account ${accountId}:`, error);
      throw error;
    }
  }

  private async fetchSingleAccount(accountId: string, auth: { token: string; instanceUrl: string }): Promise<any> {
    const query = `SELECT Id, Name, Industry, AccountStatus__c, SiteCount__c, Description, Website, Phone FROM Account WHERE Id = '${accountId}'`;

    const response = await fetch(`${auth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Salesforce API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.records[0];
  }

  private async fetchOpportunities(accountId: string, auth: { token: string; instanceUrl: string }): Promise<any[]> {
    const query = `SELECT Id, Name, StageName, Amount, CloseDate, Description, Probability FROM Opportunity WHERE AccountId = '${accountId}' AND IsClosed = false ORDER BY CloseDate ASC`;

    const response = await fetch(`${auth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Salesforce API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.records;
  }

  private async fetchCases(accountId: string, auth: { token: string; instanceUrl: string }): Promise<any[]> {
    const query = `SELECT Id, CaseNumber, Subject, Description, Status, Priority, CreatedDate, ClosedDate FROM Case WHERE AccountId = '${accountId}' ORDER BY CreatedDate DESC LIMIT 50`;

    const response = await fetch(`${auth.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Salesforce API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.records;
  }

  private mapAccountStatus(status: string): 'active' | 'at-risk' | 'churned' {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'active';
      case 'at risk':
      case 'at-risk':
        return 'at-risk';
      case 'churned':
      case 'closed':
        return 'churned';
      default:
        return 'active';
    }
  }

  private extractPriorities(opportunities: any[], cases: any[]): Priority[] {
    const priorities: Priority[] = [];

    // Extract priorities from opportunities
    opportunities.forEach(opp => {
      if (opp.Description && opp.Description.toLowerCase().includes('priority')) {
        priorities.push({
          id: `opp-${opp.Id}`,
          accountId: opp.AccountId,
          title: opp.Name,
          description: opp.Description,
          priority: this.determinePriorityLevel(opp.Amount, opp.Probability),
          status: 'in-progress',
          dueDate: opp.CloseDate,
          extractedFrom: [`sf-opp-${opp.Id}`]
        });
      }
    });

    // Extract priorities from high-priority cases
    cases.filter(c => c.Priority === 'High' || c.Priority === 'Critical').forEach(case_ => {
      priorities.push({
        id: `case-${case_.Id}`,
        accountId: case_.AccountId,
        title: case_.Subject,
        description: case_.Description || '',
        priority: case_.Priority.toLowerCase() as any,
        status: case_.Status === 'Closed' ? 'completed' : 'open',
        extractedFrom: [`sf-case-${case_.Id}`]
      });
    });

    return priorities;
  }

  private extractUpcomingDates(opportunities: any[]): UpcomingDate[] {
    return opportunities.map(opp => ({
      id: `opp-date-${opp.Id}`,
      accountId: opp.AccountId,
      title: opp.Name,
      date: opp.CloseDate,
      type: 'renewal' as const,
      description: `${opp.StageName} - $${opp.Amount?.toLocaleString() || 0}`,
      salesforceId: opp.Id
    }));
  }

  private mapCasesToIssues(cases: any[]): CustomerIssue[] {
    return cases.filter(c => c.Status !== 'Closed').map(case_ => ({
      id: case_.Id,
      accountId: case_.AccountId,
      title: case_.Subject,
      description: case_.Description || '',
      severity: this.mapCasePriorityToSeverity(case_.Priority),
      status: this.mapCaseStatus(case_.Status),
      createdDate: case_.CreatedDate,
      resolvedDate: case_.ClosedDate,
      salesforceId: case_.Id
    }));
  }

  private mapCasesToTickets(cases: any[]): Ticket[] {
    return cases.map(case_ => ({
      id: case_.Id,
      accountId: case_.AccountId,
      ticketNumber: case_.CaseNumber,
      subject: case_.Subject,
      description: case_.Description || '',
      priority: this.mapCasePriorityToTicketPriority(case_.Priority),
      status: this.mapCaseStatusToTicketStatus(case_.Status),
      createdDate: case_.CreatedDate,
      resolvedDate: case_.ClosedDate,
      salesforceId: case_.Id
    }));
  }

  private determinePriorityLevel(amount: number, probability: number): 'critical' | 'high' | 'medium' | 'low' {
    if (amount > 100000 && probability > 70) return 'critical';
    if (amount > 50000 && probability > 50) return 'high';
    if (amount > 10000) return 'medium';
    return 'low';
  }

  private mapCasePriorityToSeverity(priority: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low':
      default:
        return 'low';
    }
  }

  private mapCaseStatus(status: string): 'open' | 'in-progress' | 'resolved' | 'closed' {
    switch (status?.toLowerCase()) {
      case 'new': return 'open';
      case 'working':
      case 'in progress': return 'in-progress';
      case 'resolved': return 'resolved';
      case 'closed': return 'closed';
      default: return 'open';
    }
  }

  private mapCasePriorityToTicketPriority(priority: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low':
      default:
        return 'low';
    }
  }

  private mapCaseStatusToTicketStatus(status: string): 'new' | 'open' | 'pending' | 'resolved' | 'closed' {
    switch (status?.toLowerCase()) {
      case 'new': return 'new';
      case 'working':
      case 'in progress': return 'open';
      case 'pending': return 'pending';
      case 'resolved': return 'resolved';
      case 'closed': return 'closed';
      default: return 'new';
    }
  }
}

export const salesforceService = new SalesforceService();