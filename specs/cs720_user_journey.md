# User Journey Map - CS720

**Project:** CS720  
**Agent:** Lyra Path  
**Created:** 2025-10-04 15:05:00  
**Source:** MaraFocus-CS720-20251004-145200.md

---

## Flow 1: Account Transition Onboarding

**Context:** SE receives new account assignment, needs to ramp up quickly (hours → minutes goal)  
**Entry Point:** Manager assigns account verbally  
**Success Criteria:** SE feels confident to engage customer in first call

---

### Stage 1: Receive Assignment
- **User Action:** Manager says "You're taking over the CloudWorks account from Sarah"
- **System Response:** N/A (happens outside app)
- **Emotion:** 😰 **Overwhelmed** - Thinking about 400-500 sites of unknown complexity
- **Edge Cases:**
  - Manager provides incomplete context
  - Previous SE unavailable for handoff

---

### Stage 2: Open CS720 First Time
- **User Action:** Launches local web app from desktop
- **System Response:** Shows account list on left sidebar (synced from Salesforce), empty dashboard center, AI Assistant panel on right
- **Emotion:** 😌 **Slightly relieved** - "At least I can see my accounts organized"
- **Edge Cases:**
  - Daily sync failed → Show "Data may be stale" warning with manual sync button
  - First-time user → Show quick onboarding tooltip

---

### Stage 3: Select New Account (CloudWorks)
- **User Action:** Clicks "CloudWorks" from left sidebar account list
- **System Response:** Dashboard populates with 6 cards:
  - Key Priorities (upsell cloud storage)
  - Upcoming Dates (QBR in 3 weeks)
  - In-Flight Projects (Security Audit 60%)
  - Customer Sat Issues (2 critical, 3 high)
  - Open Tickets (3 urgent)
  - Industry Intelligence (cloud spending trends)
- **Emotion:** 👀 **Scanning** - "Whoa, lots of information... where do I start?"
- **Edge Cases:**
  - Account has minimal data → Show "Limited data available" message

---

### Stage 4: Scan Dashboard Overview
- **User Action:** Eyes move across cards, absorbing high-level status
- **System Response:** Cards display:
  - Severity indicators (critical/high/medium with color coding)
  - SLA timers (3 weeks, 1 hour, 1 day)
  - Progress bars (60% complete)
  - Status badges (opportunity, on-track, escalated)
- **Emotion:** 🤔 **Processing** - "Getting the picture, but need deeper context on these issues"
- **Edge Cases:**
  - Too many critical items → Prioritization view available
  - No critical items → Highlight opportunities instead

---

### Stage 5: Ask NL Questions About Priorities
- **User Action:** Types in AI Assistant: "What are this customer's top 3 priorities?"
- **System Response:** AI queries underlying markdown knowledge base (OneDrive docs + Salesforce notes):
  1. "Upsell cloud storage plan (mentioned in 3 recent sales notes, executive sponsor: CTO)"
  2. "Security audit completion (flagged in technical architecture docs, deadline Oct 25)"
  3. "Dashboard performance optimization (raised in last exec meeting, impacting daily ops)"
- **Emotion:** ✅ **Confident** - "Okay, now I understand what actually matters to them"
- **Edge Cases:**
  - AI can't find answer → "I couldn't find specific priority information. This might indicate limited documentation. Would you like to see general account activity instead?"
  - No recent documents → "No recent notes found. Here's what industry trends suggest for similar enterprises..." (leans on BI data)

---

### Stage 6: Deep Dive on Critical Issues
- **User Action:** Sees "Critical" customer sat issue on dashboard → asks AI: "Tell me about the slow dashboard load times issue"
- **System Response:** AI synthesizes from support tickets + meeting notes:
  "Issue raised 2 hours ago by TechCorp Inc contact (Emily Rodriguez). Daily CloudWorks dashboard loads taking 30+ seconds (normal: <5s). Performance SLA breach. Customer escalated to VP level. Engineering investigating database query optimization."
- **Emotion:** 🚨 **Alert** - "This is urgent, I need the full story"
- **Edge Cases:**
  - Issue lacks detail → AI states: "Limited technical details available. Last update: 2 hours ago. Recommend direct follow-up with support team."

---

### Stage 7: Industry Context Check
- **User Action:** Clicks on Industry Intelligence card
- **System Response:** Shows BI insight: "Cloud Infrastructure Spending Increases 32% in Q3 2025" with source link (TechCrunch), relates to CloudWorks' cloud storage upsell opportunity
- **Emotion:** 💡 **Strategic** - "This external trend connects to their priority - good context for exec conversations"
- **Edge Cases:**
  - No relevant BI data → Show general industry trends for customer's vertical
  - BI API timeout → Show cached data with timestamp

---

### Stage 8: Synthesis & Readiness
- **User Action:** Reviews all information, asks AI: "Summarize the account status for my manager"
- **System Response:** AI generates executive brief:
  "CloudWorks Account Summary:
  - **Priorities:** Cloud storage upsell (strong opportunity), security compliance (on track), performance optimization (urgent)
  - **Risks:** 2 critical customer sat issues requiring immediate attention
  - **Opportunities:** Q3 cloud spending trends align with upsell timing
  - **Next Steps:** Address performance issue, prep QBR (3 weeks), close security audit"
- **Emotion:** 💪 **Prepared** - "I'm ready to discuss this account confidently"
- **Edge Cases:**
  - Contradictory information → AI flags inconsistencies: "Note: Sales notes suggest different priority than support tickets"

---

### Flow 1 Success Outcome
✅ **Time to Context:** <5 minutes from opening app to feeling prepared  
✅ **Query Accuracy:** Relevant answers to priority/issue questions  
✅ **Emotional State:** Overwhelmed → Confident

---

## Flow 2: Pre-Meeting Preparation

**Context:** SE has existing account knowledge, executive meeting in 30 min, needs delta updates  
**Entry Point:** Calendar/email meeting notification  
**Success Criteria:** SE enters meeting with recent updates and strategic talking points

---

### Stage 1: Meeting Reminder
- **User Action:** Sees calendar notification "CloudWorks Executive Review - 30 min"
- **System Response:** N/A (external calendar system)
- **Emotion:** ⏰ **Focused urgency** - "Need to refresh on recent developments quickly"
- **Edge Cases:**
  - Meeting in <5 minutes → Emergency quick-view mode

---

### Stage 2: Open CS720, Select Account
- **User Action:** Launches app, clicks CloudWorks (already familiar account)
- **System Response:** Dashboard loads with "Last viewed 5 days ago" indicator at top
- **Emotion:** 🔍 **Time-conscious** - "What's changed in 5 days?"
- **Edge Cases:**
  - Data sync in progress → Show partial data with "Updating..." indicator
  - Account not synced recently → Trigger immediate refresh

---

### Stage 3: Dashboard Delta Scan
- **User Action:** Eyes scan for new/updated visual indicators
- **System Response:** Dashboard highlights changes:
  - "2 new critical issues" badge on Customer Sat card
  - "Updated 2hr ago" timestamp on In-Flight Projects
  - Progress bar changed (45% → 60%) on Security Audit
  - Green "New" badge on Industry Intelligence item
- **Emotion:** 📊 **Scanning for deltas** - "What are these new critical issues?"
- **Edge Cases:**
  - No updates since last view → Show "No significant changes since Oct 1" message
  - Major changes → Highlight top 3 most important updates

---

### Stage 4: Targeted NL Query #1 (Project Status)
- **User Action:** Types specific question: "What's the status of the Security Audit project?"
- **System Response:** AI responds with delta focus:
  "Security Audit now **60% complete** (up from 45% last week). On track for Oct 25 deadline. Recent milestone: Completed vulnerability assessment (Oct 2). No blockers reported. Next phase: Remediation planning."
- **Emotion:** ✅ **Relieved** - "Good, that's progressing on schedule"
- **Edge Cases:**
  - Project stalled → AI flags: "No progress updates in 7 days - potential risk"
  - Meeting topic not in system → "I don't have specific updates on [topic]. Here's related context..."

---

### Stage 5: Targeted NL Query #2 (Critical Issues)
- **User Action:** "Tell me about the 2 new critical customer sat issues"
- **System Response:** AI details both issues:
  1. "Dashboard performance: 30+ second load times, escalated to VP, engineering investigating (2 hours ago)"
  2. "Login timeout: Affecting 15 users across Chicago office, auth service issue suspected, P1 ticket opened (4 hours ago)"
- **Emotion:** 😟 **Concerned** - "Need to address these proactively in the meeting"
- **Edge Cases:**
  - Issues already resolved → Show "Resolved 1hr ago" status
  - Insufficient detail → AI suggests: "Recommend live status check with support team before meeting"

---

### Stage 6: Check Industry Context
- **User Action:** Glances at Industry Intelligence card (quick scan, not deep read)
- **System Response:** Shows Q3 cloud spending insight (32% increase), notes relevance to upsell opportunity
- **Emotion:** 💼 **Strategic alignment** - "This reinforces our cloud storage pitch"
- **Edge Cases:**
  - No new BI data → Show "No new industry updates" (not a blocker)
  - Contradictory trends → AI flags: "Note: Industry trend diverges from customer behavior"

---

### Stage 7: Final Prep Question (Anticipate)
- **User Action:** "What questions might the exec ask me about dashboard performance?"
- **System Response:** AI suggests likely questions based on past meeting notes + issue severity:
  - "What's the business impact?" (Users affected: 50+, productivity loss estimated 2hr/day)
  - "When will it be fixed?" (Engineering ETA: 48 hours)
  - "How did this happen?" (Database scaling issue during peak usage)
  - "Prevention plan?" (Implementing auto-scaling, monitoring alerts)
- **Emotion:** 😎 **Confident** - "I'm prepared for the tough questions"
- **Edge Cases:**
  - No historical meeting data → AI uses issue severity to predict questions
  - Sync happened mid-prep → Show "New data available, refresh dashboard?" notification

---

### Flow 2 Success Outcome
✅ **Time to Context:** <5 minutes from notification to meeting-ready  
✅ **Query Precision:** Specific, targeted answers to delta questions  
✅ **Emotional State:** Urgent → Confident & Strategic

---

## Cross-Flow Edge Cases

### Technical Edge Cases
1. **Daily sync failed** → Show warning banner: "Data may be stale (last sync: 18 hours ago)" + "Force Sync Now" button
2. **AI inference endpoint down** → Automatic failover to local LLM with "Running on local model" indicator
3. **Salesforce API quota exceeded** → Show cached data + "Next sync: 6:00 AM tomorrow"
4. **Account has no documents/notes** → AI states: "Limited documentation for this account. Here's industry intelligence and Salesforce data..." (lean on BI)

### User Experience Edge Cases
1. **Conflicting information across sources** → AI flags: "Note: Sales notes (Oct 1) show different priority than support tickets (Oct 3)"
2. **Query too vague** → AI asks clarifying question: "Which project are you asking about? I see 3 active projects..."
3. **Query outside knowledge base** → AI transparent: "I don't have information about [topic]. This might not be documented yet."
4. **Multiple critical items** → Dashboard offers "Priority View" filter to focus top 3 items

---

## Flow Assumptions

### Account Transition Flow (A)
- SE has Salesforce access credentials configured
- Daily sync completed successfully in last 24 hours
- Account has at least basic Salesforce data + some OneDrive documents
- AI Assistant external endpoint is available (fallback to local LLM if not)

### Pre-Meeting Flow (B)
- SE has previously viewed the account (has baseline context)
- Meeting scheduled in calendar (30-min notice minimum for optimal prep)
- Recent data changes exist to provide meaningful delta
- Account activity ongoing (projects, tickets, communications)

---

## Decision Log

### Flow Prioritization
- **Chose Flow A (Account Transition)** as primary because it maps directly to core problem statement
- **Added Flow B (Pre-Meeting Prep)** to show ongoing value beyond initial handoff
- **Deferred:** Deep Dive Discovery flow (can be variation of Flow B)

### Emotional Journey Design
- **Flow A:** Overwhelmed → Relieved → Alert → Strategic → Confident (builds confidence through stages)
- **Flow B:** Urgent → Focused → Concerned → Strategic → Confident (maintains urgency while building readiness)

### Edge Case Strategy
- **Transparency over silence:** When AI can't answer, explain why clearly
- **Graceful degradation:** Stale data/local LLM fallbacks keep system functional
- **Context awareness:** Different messages for first-time vs. returning users

---

## Next Steps

**Next Agent:** Naya Wire (Wireframe Specifications)  
**Required Fields:** ✅ Selected flows (A & B), ✅ Stages mapped, ✅ Edge cases documented

---

**Filename:** `LyraPath-CS720-20251004-150500.md`  
**Upload to:** `/data/outputs/`  
**Commit:** "Add User Journey Map for CS720"