import { IndustryIntelligence } from '../types';

interface BIInsight {
  title: string;
  content: string;
  source: string;
  relevance: number;
}

interface BITrend {
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  timeframe: string;
}

class BIService {
  async fetchIndustryInsights(industry: string): Promise<IndustryIntelligence> {
    try {
      // For MVP, return mock data
      // In production, this would call actual BI APIs
      const insights = this.getMockInsights(industry);
      const trends = this.getMockTrends(industry);

      return {
        id: `bi-${industry.toLowerCase().replace(/\s+/g, '-')}`,
        accountId: '', // Will be set per account
        industry,
        insights: insights.map(i => i.content),
        trends: trends.map(t => `${t.title}: ${t.description}`),
        lastUpdated: new Date().toISOString(),
        source: 'Mock BI Service'
      };

    } catch (error) {
      console.error(`Error fetching BI insights for ${industry}:`, error);
      throw error;
    }
  }

  private getMockInsights(industry: string): BIInsight[] {
    const commonInsights = [
      {
        title: 'Digital Transformation Acceleration',
        content: 'Organizations are accelerating digital transformation initiatives, with 78% reporting increased investment in cloud infrastructure.',
        source: 'Industry Research 2024',
        relevance: 0.9
      },
      {
        title: 'Security Investment Priority',
        content: 'Cybersecurity spending has increased by 12% year-over-year, with focus on zero-trust architecture and endpoint protection.',
        source: 'Security Trends Report',
        relevance: 0.85
      }
    ];

    const industrySpecific = this.getIndustrySpecificInsights(industry);

    return [...commonInsights, ...industrySpecific];
  }

  private getIndustrySpecificInsights(industry: string): BIInsight[] {
    switch (industry.toLowerCase()) {
      case 'technology':
        return [
          {
            title: 'AI/ML Adoption Surge',
            content: 'Technology companies are investing heavily in AI/ML capabilities, with 65% planning to integrate AI into core products within 12 months.',
            source: 'Tech Industry Analysis',
            relevance: 0.95
          },
          {
            title: 'Edge Computing Growth',
            content: 'Edge computing investments have grown 40% in the tech sector, driven by IoT and real-time processing requirements.',
            source: 'Computing Infrastructure Report',
            relevance: 0.8
          }
        ];

      case 'healthcare':
        return [
          {
            title: 'Telehealth Expansion',
            content: 'Healthcare organizations are maintaining telehealth investments post-pandemic, with 85% planning to expand virtual care services.',
            source: 'Healthcare Technology Survey',
            relevance: 0.9
          },
          {
            title: 'Data Privacy Compliance',
            content: 'HIPAA compliance and patient data protection remain top priorities, with increased investment in healthcare-specific security solutions.',
            source: 'Healthcare Security Study',
            relevance: 0.88
          }
        ];

      case 'finance':
      case 'financial services':
        return [
          {
            title: 'Fintech Integration',
            content: 'Financial institutions are accelerating fintech partnerships and API-first architectures to improve customer experience.',
            source: 'Financial Services Technology Report',
            relevance: 0.92
          },
          {
            title: 'Regulatory Technology (RegTech)',
            content: 'Investment in regulatory compliance technology has increased 30%, focusing on automated reporting and risk management.',
            source: 'RegTech Market Analysis',
            relevance: 0.87
          }
        ];

      default:
        return [
          {
            title: 'Cloud-First Strategy',
            content: `${industry} organizations are adopting cloud-first strategies, with 70% migrating core applications to public cloud platforms.`,
            source: 'Cross-Industry Cloud Study',
            relevance: 0.75
          }
        ];
    }
  }

  private getMockTrends(industry: string): BITrend[] {
    const commonTrends = [
      {
        title: 'Hybrid Work Infrastructure',
        description: 'Continued investment in hybrid work technologies and security solutions',
        impact: 'positive' as const,
        timeframe: 'Next 6-12 months'
      },
      {
        title: 'Supply Chain Resilience',
        description: 'Focus on supply chain visibility and risk management solutions',
        impact: 'positive' as const,
        timeframe: 'Next 12-18 months'
      }
    ];

    const industryTrends = this.getIndustrySpecificTrends(industry);

    return [...commonTrends, ...industryTrends];
  }

  private getIndustrySpecificTrends(industry: string): BITrend[] {
    switch (industry.toLowerCase()) {
      case 'technology':
        return [
          {
            title: 'Quantum Computing Readiness',
            description: 'Early quantum computing research and quantum-safe cryptography preparation',
            impact: 'neutral',
            timeframe: 'Next 2-3 years'
          },
          {
            title: 'Sustainability Tech',
            description: 'Increased focus on green technology and carbon footprint reduction',
            impact: 'positive',
            timeframe: 'Next 12 months'
          }
        ];

      case 'healthcare':
        return [
          {
            title: 'Personalized Medicine',
            description: 'Growth in genomics and personalized treatment technologies',
            impact: 'positive',
            timeframe: 'Next 18-24 months'
          }
        ];

      case 'finance':
        return [
          {
            title: 'Central Bank Digital Currencies (CBDCs)',
            description: 'Preparation for digital currency infrastructure and compliance',
            impact: 'neutral',
            timeframe: 'Next 2-5 years'
          }
        ];

      default:
        return [];
    }
  }

  // Real API integration method (placeholder)
  private async callBIAPI(industry: string): Promise<any> {
    const apiKey = process.env.BI_API_KEY;
    const baseUrl = process.env.BI_BASE_URL;

    if (!apiKey || !baseUrl) {
      throw new Error('BI API not configured');
    }

    const response = await fetch(`${baseUrl}/insights/${encodeURIComponent(industry)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`BI API error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const biService = new BIService();