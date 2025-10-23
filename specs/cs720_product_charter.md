# Product Charter - CS720

**Project:** CS720  
**Agent:** Mara Focus  
**Created:** 2025-10-04 14:52:00  
**Source:** CallieQuest-CS720-20251004-144500.md

---

## Goal

Build a **fast handoff tool** that enables Sales Engineers to gain comprehensive customer context in minutes instead of hours during account transitions, supporting management of enterprise customers at scale.

---

## Target Users

- **Sales Engineers (SEs)** - Primary users during account transitions (year-end realignments, personnel changes)
- **Context:** Remote/distributed teams handling 400-500+ enterprise sites

---

## Platform Constraints

### Architecture
- **Local-first web application** - Runs on SE laptop (offline-capable)
- **Daily synchronization** - Batch data refresh, not real-time
- **Data sources:** Salesforce (customer data) + OneDrive (unstructured notes/files)

### Technical Decisions
- **Data format:** All ingested data cleaned and converted to markdown during processing
- **Account scope:** Subset of accounts synced (not full 400-500 initially for MVP)
- **NL inference:** External API endpoint (primary) with local LLM fallback
- **API handling:** Salesforce API limits addressed iteratively as encountered

---

## MVP Features (Core 3)

### 1. Customer Profile Dashboard
**What:** Aggregated view combining Salesforce account data with relevant OneDrive documents  
**Why:** Single source of truth eliminates system-hopping  
**Delivers:** Holistic customer view in one interface

### 2. Natural Language Query Interface  
**What:** Ask questions about customer context using conversational language  
**Why:** Fastest path to specific information without navigation  
**Delivers:** "What are this customer's top 3 priorities?" answered in seconds

### 3. Business Intelligence Integration
**What:** Merge customer technical data with external business intelligence and industry analysis  
**Why:** Enriches internal context with market/industry insights  
**Delivers:** Strategic conversation readiness with external context

---

## Out of Scope (v1)

The following features are explicitly deferred to future iterations:

- **Deployment Topology Map** - Visual representation of site infrastructure
- **Handoff Checklist Generator** - Automated transition workflow tools
- **Context Timeline** - Chronological project/initiative view
- **Real-time data sync** - Sticking with daily batch updates
- **Mobile applications** - Web-only for MVP
- **Multi-user collaboration** - Single-user experience initially
- **Email notifications** - No alerting system
- **Advanced analytics/reporting** - Basic insights only
- **Salesforce write-back** - Read-only integration

---

## Success Metrics

### Primary Metrics (Must Achieve)

1. **Time to Context: <5 minutes**  
   - New SE can answer "What are this customer's top 3 priorities?" in under 5 minutes
   - Measured from app launch to actionable answer

2. **Query Accuracy: 80%+**  
   - Natural language queries return relevant, accurate answers ≥80% of the time
   - Measured through user validation feedback

---

## Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| **Data quality:** Unstructured OneDrive notes too messy | Medium | Ingestion pipeline with markdown cleaning/normalization |
| **External BI limits:** Third-party API rate limits or costs | Medium | Subset account sync reduces volume; evaluate cost early |
| **NL performance:** Query latency on local hardware | Low | External inference endpoint (fast) + local LLM fallback |
| **Salesforce API quotas:** Daily sync hits limits | Low | Iterative approach - address when encountered in testing |

---

## Decision Log

### Scope Decisions
- **Reduced from 6 to 3 features** - Prioritized speed-to-value over comprehensive coverage
- **Focused on handoff speed** - "Fast context" over "complete tooling"
- **Deferred topology mapping** - Complex visualization moved to v2

### Technical Decisions  
- **Local-first architecture** - Balances offline access with data freshness
- **Markdown standardization** - Enables consistent querying across data sources
- **Hybrid inference** - External speed + local reliability
- **Subset sync** - Reduces complexity for MVP validation

### Metric Decisions
- **Narrowed to 2 core metrics** - Time-to-context + query accuracy are sufficient for MVP success
- **5-minute threshold** - Aggressive but achievable with NL interface

---

## Next Steps

**Next Agent:** Lyra Path (User Journey Mapping)  
**Required Fields:** ✅ mvpFeatures (3 defined), ✅ constraints (clear platform limits)

---

**Filename:** `MaraFocus-CS720-20251004-145200.md`  
**Upload to:** `/data/outputs/`  
**Commit:** "Add Product Charter for CS720"