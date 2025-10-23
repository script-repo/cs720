# Wireframe Blueprint - CS720

**Project:** CS720  
**Agent:** Naya Wire  
**Created:** 2025-10-04 15:15:00  
**Source:** LyraPath-CS720-20251004-150500.md

---

## Design System Foundation

### Theme
- **Color Scheme:** Dark theme with purple gradient highlights
- **Primary Accent:** Purple gradient (for CTAs, highlights, active states)
- **Status Colors:** Green (success/on-track), Red (critical), Yellow (warning), Blue (info)

### Layout Grid
- **Sidebar:** Fixed 280px width
- **Main Content:** Fluid center area (min 800px)
- **AI Panel:** Fixed 380px width
- **Spacing:** 16px base unit (8px, 16px, 24px, 32px scale)

---

## Persistent UI Patterns

### Global Header
- **Top-left:** CS720 logo with purple gradient
- **Top-right:** User avatar, settings icon, sync status indicator
- **Height:** 64px
- **Background:** Dark with subtle gradient

### Account Sidebar (Left - Persistent)
- **Header:** "Customer Accounts" label + account count
- **Account List Items:**
  - Account name
  - Status badge (active/at-risk/churned)
  - Star icon (favorites)
  - Active state: Purple gradient background
- **Scroll:** Vertical scroll if >10 accounts
- **Search:** Filter input at top of list

### AI Assistant Panel (Right - Persistent)
- **Header:** "AI Assistant" with purple gradient icon
- **Chat Area:** Scrollable message history
- **Input:** Text input at bottom with send button
- **Auto-suggestions:** Recent queries as quick-tap chips
- **Typing Indicator:** Animated dots when AI is processing

### Footer
- **Data Sync Status:** "Last synced: 2 hours ago" + "Sync Now" button
- **Connection Status:** Online/Offline indicator
- **Help Link:** Documentation access

---

## Screen 1: Main Dashboard

### Purpose
Primary workspace where SEs view customer context and interact with data

### Layout Structure

```
+--------------------------------------------------+
|  [Logo]                    [User] [Settings] [⟳] |
+----------+----------------------------+-----------+
|          |                            |           |
| Account  |     Dashboard Cards        |    AI     |
|  List    |      (6-card grid)         | Assistant |
|          |                            |           |
| - Acct1  | +--------+  +--------+     | Chat...   |
| - Acct2  | | Card 1 |  | Card 2 |     |           |
| - Acct3  | +--------+  +--------+     | [Input]   |
|          | +--------+  +--------+     |           |
|          | | Card 3 |  | Card 4 |     |           |
|          | +--------+  +--------+     |           |
|          | +--------+  +--------+     |           |
|          | | Card 5 |  | Card 6 |     |           |
|          | +--------+  +--------+     |           |
+----------+----------------------------+-----------+
| Last synced: 2h ago  [Sync Now]       | [Help]    |
+--------------------------------------------------+
```

### Key Elements

#### Center Dashboard Area (6 Cards)

**Card 1: Key Priorities**
- **Header:** "Key Priorities" label
- **Content:** List of 2-4 priority items
  - Priority text (truncated if long)
  - Source badge (CloudWorks, opportunity badge)
  - Timing indicator (This week, Today)
- **Interaction:** Click item → Priority Detail Modal
- **Empty State:** "No priorities defined" with suggestion to check AI Assistant

**Card 2: Upcoming Dates**
- **Header:** "Upcoming Dates"
- **Content:** Timeline list of important dates
  - Event name (QBR, Renewal, EOL)
  - Date + countdown badge (3 weeks, 5 days)
  - Severity indicator (urgent: red, soon: yellow)
- **Interaction:** Click item → Date Detail Modal
- **Empty State:** "No upcoming dates scheduled"

**Card 3: In-Flight Projects**
- **Header:** "In-Flight Projects"
- **Content:** Project cards (2-3 visible, scroll for more)
  - Project name + status badge (on-track, at-risk)
  - Progress bar with percentage
  - Due date
- **Interaction:** Click project → Project Detail Modal (like your mockup)
- **Empty State:** "No active projects"

**Card 4: Customer Satisfaction Issues**
- **Header:** "Customer Satisfaction Issues"
- **Content:** Issue list with severity
  - Issue title (truncated)
  - Severity badge (critical/high/medium with color coding)
  - Time indicator (2 hours ago, 1 day)
  - SLA timer (green: safe, red: breach risk)
- **Interaction:** Click issue → Ticket Detail Modal
- **Empty State:** "No customer sat issues" (positive state)

**Card 5: Open Tickets**
- **Header:** "Open Tickets"
- **Content:** Ticket list
  - Ticket title + ID
  - Status badge (urgent/escalated/normal)
  - Category icon (Bug, Feature, Performance)
  - Assigned team/person
- **Interaction:** Click ticket → Ticket Detail Modal
- **Empty State:** "No open tickets"

**Card 6: Industry Intelligence**
- **Header:** "Industry Intelligence"
- **Content:** BI insight cards
  - Insight headline
  - Source + timestamp (TechCrunch, 2 hours ago)
  - Impact tags (market, positive impact)
  - Relevance indicator (related to customer priorities)
- **Interaction:** Click insight → Industry Intelligence Detail Modal
- **Empty State:** "No recent industry insights"

#### Delta Indicators (Flow B - Returning Users)
- **"Last viewed 5 days ago"** banner at top of dashboard
- **"New" badges** on updated cards
- **Updated timestamp** on cards with changes
- **Change highlights:** Subtle purple glow on modified items

### Interactions

1. **Account Selection (Sidebar)**
   - Click account → Load dashboard for that account
   - Purple gradient highlight on active account
   - Smooth transition animation (fade cards in)

2. **Dashboard Card Items**
   - Click any item → Open Detail Modal (overlay)
   - Hover: Subtle elevation, cursor pointer
   - Long text: Tooltip on hover with full content

3. **AI Assistant**
   - Type query → Send on Enter or click Send button
   - Auto-complete suggestions appear as you type
   - Click suggestion chip → Auto-fill query
   - AI response streams in (typing effect)
   - Click source citations in AI responses → Open source document

4. **Data Sync**
   - Click "Sync Now" in footer → Show sync progress indicator
   - Auto-refresh dashboard when sync completes
   - Show "New data available" toast notification

### States

#### Loading State
- **Dashboard cards:** Skeleton loaders (shimmer effect)
- **AI Assistant:** "Analyzing customer data..." message
- **Sidebar:** Account list loads progressively

#### Empty State (No Account Selected)
- **Center area:** Welcome message
  - "Select an account to view dashboard"
  - Onboarding tooltip (first-time users): "Click an account from the sidebar to get started"
- **AI Assistant:** "I'm ready to help once you select an account"

#### Error State
- **Sync failed:** Red banner "Data sync failed. Last successful sync: 18 hours ago" + "Retry" button
- **AI query error:** "I encountered an error. Please try rephrasing your question."
- **Missing data:** Warning icon on affected cards + "Data unavailable - last sync incomplete"

#### Stale Data Warning
- **Banner:** "⚠ Data may be stale (last sync: 18 hours ago)" with orange background
- **Force Sync CTA:** Prominent "Update Now" button

---

## Screen 2: Detail Modal (Overlay)

### Purpose
Provide deep-dive information for dashboard items without leaving context

### Layout Structure (Adaptive based on content type)

```
+------------------------------------------------+
|                    [Dark Overlay 70%]           |
|                                                 |
|     +-------------------------------------+     |
|     | [Title]          [Status] [×]       |     |
|     +-------------------------------------+     |
|     |                                     |     |
|     |  [Content Area - Left Column]      |     |
|     |                                     |     |
|     |  [Content Area - Right Column]     |     |
|     |                                     |     |
|     +-------------------------------------+     |
|                                                 |
+------------------------------------------------+
```

### Modal Variants

#### Project Detail Modal (Reference: Cloud Migration Phase 2)

**Header:**
- Project name + status badge (on-track/at-risk/completed)
- Close button (×) top-right

**Left Column:**
- **Project Details Section:**
  - Started date
  - Due date
  - Lead person
  - Budget
- **Description:** Project overview text
- **Project Milestones:** Checklist with completion dates
  - Completed (green check): Infrastructure Setup - Sep 10, 2025
  - Completed (green check): Data Migration - Sep 25, 2025
  - In Progress: Application Migration - Oct 8, 2025
  - Pending: Testing & Validation - Oct 15, 2025

**Right Column:**
- **Progress:** Circular or bar chart showing overall %
- **Team Members:** Avatar grid with names/roles
- **Project Risks:** Warning cards
  - "Potential data transfer delays" (red highlight)
  - "Legacy system compatibility issues" (red highlight)
- **Project Notes:** Recent updates/comments
  - "Project is on track with 75% completion. Next milestone due Oct 8th."

**Interactions:**
- Click team member → Contact info tooltip
- Click milestone → Expand details
- Click risk → Related tickets/documentation
- Click outside modal or × → Close modal

#### Ticket Detail Modal

**Header:**
- Ticket title + ID + severity badge
- Close button

**Left Column:**
- **Ticket Info:**
  - Created date
  - Reported by
  - Category
  - SLA deadline
- **Description:** Issue details
- **Steps to Reproduce:** (if applicable)
- **Impact:** Business/user impact summary

**Right Column:**
- **Status Timeline:** Visual progress
- **Assigned To:** Team/person with avatar
- **Related Items:** Linked tickets, projects
- **Comments/Updates:** Activity feed

#### Priority Detail Modal

**Header:**
- Priority name
- Close button

**Content:**
- **Source:** Where priority identified (sales notes, exec meeting)
- **Context:** Full background and reasoning
- **Related Items:** Projects, tickets, initiatives tied to this priority
- **AI Insights:** Why this is a priority (from BI + internal data)
- **Next Actions:** Recommended steps

#### Industry Intelligence Detail Modal

**Header:**
- Insight headline
- Source + timestamp
- Close button

**Content:**
- **Full Article/Summary:** Complete BI insight text
- **Source Link:** External URL (opens in new tab)
- **Relevance Score:** Why this matters to this customer
- **Related Customer Data:** How this connects to customer priorities/projects
- **Tags:** Industry, market trends, technology categories

### Modal States

**Loading:**
- Modal opens immediately with skeleton content
- Content loads progressively

**Error:**
- "Unable to load details. Please try again." with Retry button

---

## Screen 3: Initial Load / Empty State

### Purpose
Welcome screen and first-time user onboarding

### Key Elements

**Center Area:**
- **Welcome Message:**
  - CS720 logo (large, with purple gradient)
  - "Welcome to CS720" heading
  - "Your customer intelligence platform" subheading
- **Getting Started (First-time users):**
  - "Select an account from the sidebar to begin"
  - Visual arrow pointing to sidebar
  - Quick tips carousel:
    - "Tip 1: Use natural language queries in the AI Assistant"
    - "Tip 2: Click any dashboard item for detailed information"
    - "Tip 3: Force sync for the latest data"

**Sidebar:**
- Account list populated (if accounts synced)
- Or: "No accounts synced yet" + "Sync Now" CTA

**AI Assistant:**
- Greeting message:
  - "Hello! I'm your AI assistant. I can help with account information, generate reports, analyze customer data, and answer questions about your dashboard. How can I assist you today?"
- Pre-set example queries (clickable):
  - "What are the top priorities for [Account]?"
  - "Show me critical customer issues"
  - "Summarize account status"

### Interactions

- Click account → Load to Main Dashboard
- Click example query → Execute query (if account selected) or prompt to select account first
- Dismiss onboarding tips → Show "Show tips" option in settings

### States

**No Accounts Synced:**
- Center message: "No customer accounts found"
- CTA: "Sync Salesforce Accounts" button
- Progress indicator when sync initiated

**First-time User:**
- Onboarding tooltips overlay
- Highlight interactive elements with pulsing purple glow
- "Next" button to progress through tips

---

## Screen 4: Settings/Sync Management

### Purpose
Configure data sources, manage sync, and set preferences

### Layout Structure

```
+--------------------------------------------------+
|  [← Back to Dashboard]                           |
+--------------------------------------------------+
|  Settings                                        |
|                                                  |
|  [Tab: Data Sources] [Tab: Sync] [Tab: Prefs]   |
|                                                  |
|  +--------------------------------------------+  |
|  | Tab Content Area                           |  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

### Key Elements

#### Tab 1: Data Sources
- **Salesforce Connection:**
  - Status indicator (Connected/Disconnected)
  - Account count synced
  - Last sync timestamp
  - "Reconnect" or "Configure" button
- **OneDrive Connection:**
  - Status indicator
  - Folder path configured
  - Document count indexed
  - "Reconnect" or "Configure" button
- **Business Intelligence APIs:**
  - Active sources list (TechCrunch, Gartner, etc.)
  - Enable/disable toggles
  - API key configuration (masked)

#### Tab 2: Sync Management
- **Sync Schedule:**
  - Current setting: "Daily at 6:00 AM"
  - Change schedule dropdown
- **Sync Scope:**
  - "All accounts" vs. "Selected accounts"
  - Account selection checklist
- **Force Sync:**
  - "Sync Now" button (prominent)
  - Last sync status
  - Sync history log (last 10 syncs with status)
- **Sync Progress (when active):**
  - Progress bar
  - Current step (Salesforce, OneDrive, BI data)
  - Cancel sync option

#### Tab 3: Preferences
- **Theme:** Dark (default) / Light toggle
- **Notifications:**
  - Desktop notifications on/off
  - Sync completion alerts on/off
- **AI Settings:**
  - Inference endpoint: External (primary) / Local only
  - Auto-suggestions on/off
  - Query history retention (30/60/90 days)
- **Dashboard Defaults:**
  - Default account on launch
  - Card order customization (drag-to-reorder)

### Interactions

- Tab switching: Instant transition
- Form inputs: Auto-save on change (with "Saved" confirmation toast)
- Force sync: Disable button during sync, show progress
- Back to Dashboard: Return to last viewed account

### States

**Configuration Required:**
- Warning banner: "⚠ Data sources not configured. Configure now to start syncing."
- Guided setup wizard flow

**Sync in Progress:**
- Disable data source disconnection
- Show real-time progress
- Allow cancellation with confirmation

**Error:**
- Connection failed: "Unable to connect to Salesforce. Check credentials." with Retry button
- Sync failed: "Last sync failed. See error log for details." with link to error details

---

## Interaction Patterns Summary

### Navigation
- **Sidebar account selection** → Load dashboard
- **Dashboard card item click** → Open detail modal
- **Modal close (× or outside click)** → Return to dashboard
- **Settings gear icon** → Open settings screen
- **Back button (Settings)** → Return to dashboard

### Data Operations
- **AI query submission** → Stream response with typing indicator
- **Force sync trigger** → Show progress, auto-refresh on completion
- **Card item hover** → Elevation + tooltip (if truncated text)

### Keyboard Shortcuts
- **Esc:** Close modal or return to dashboard
- **Ctrl/Cmd + K:** Focus AI Assistant input
- **Ctrl/Cmd + R:** Force sync
- **Arrow keys:** Navigate account list
- **Enter (on account):** Select account

---

## Edge Cases & States

### Dashboard Edge Cases

1. **No Account Selected**
   - Empty center area with welcome message
   - AI disabled until account selected

2. **Account with Minimal Data**
   - Cards show "Limited data available" message
   - AI leans on industry intelligence
   - Suggest running sync or adding documents

3. **All Cards Empty**
   - "No recent activity for this account" message
   - Suggest checking data sources or sync status

4. **Conflicting Data**
   - Show warning icon on affected card
   - AI flags: "Note: Sales and support data show different priorities"

### Modal Edge Cases

1. **Modal Content Too Long**
   - Internal scroll within modal
   - "Scroll for more" indicator at bottom

2. **Failed to Load Modal Content**
   - Show error state: "Unable to load details"
   - Retry button
   - Option to view raw data

3. **Modal on Small Screen**
   - Responsive: Modal takes 90% of screen
   - Close button always visible

### Settings Edge Cases

1. **Sync Quota Exceeded**
   - Warning: "Salesforce API quota exceeded. Next sync: 6:00 AM tomorrow"
   - Option to reduce sync scope

2. **Connection Timeout**
   - "Connection to OneDrive timed out. Retry?"
   - Fallback to cached data

3. **Invalid Configuration**
   - Validation errors inline with red highlight
   - Save button disabled until valid

### AI Assistant Edge Cases

1. **Query Too Vague**
   - AI asks clarifying question: "Which project are you asking about?"
   - Suggest related queries

2. **No Answer Available**
   - Transparent: "I don't have information about [topic]. This might not be documented."
   - Offer to search industry data instead

3. **Inference Endpoint Down**
   - Auto-failover to local LLM
   - Show "Running on local model" indicator
   - Potentially slower response time

4. **Query Queue**
   - If multiple queries submitted: Show queue indicator "2 queries ahead"

---

## Responsive Breakpoints

### Large Desktop (>1440px)
- All panels visible
- Maximum card detail

### Standard Desktop (1024-1440px)
- Default layout (as specified above)

### Small Desktop / Tablet (768-1024px)
- Collapsible sidebar (hamburger menu)
- AI panel toggleable (icon to show/hide)
- Cards reflow to 2 columns

### Mobile (<768px)
- **Out of scope for v1** (per charter: Web-only)
- Future consideration: Responsive breakpoints

---

## Component Specifications

### Card Component
- **Dimensions:** Min height 280px, fluid width
- **Padding:** 24px
- **Border:** 1px solid rgba(255,255,255,0.1)
- **Background:** Dark gradient with subtle transparency
- **Hover:** Elevation increase (box-shadow)
- **Header:** 18px bold, purple gradient underline
- **Content:** Scrollable if overflow

### Badge Component
- **Sizes:** Small (tag), Medium (status)
- **Variants:**
  - Status: Green (success), Red (critical), Yellow (warning), Blue (info)
  - Opportunity: Purple gradient
  - Severity: Color-coded with icon
- **Shape:** Rounded corners (4px)
- **Text:** 12px, uppercase, bold

### Button Component
- **Primary:** Purple gradient, white text
- **Secondary:** Transparent with purple border
- **Danger:** Red fill
- **Ghost:** Text only, purple on hover
- **States:** Default, Hover (lighter), Active (darker), Disabled (50% opacity)

### Input Component
- **Text Input:** Dark background, purple focus outline
- **Search:** With magnifying glass icon
- **AI Chat Input:** Larger (multiline), send button integrated

### Modal Component
- **Overlay:** 70% dark opacity
- **Container:** 800px max-width, centered
- **Animation:** Fade in + slide up (200ms ease-out)
- **Close:** × button + click outside + Esc key

---

## Accessibility Requirements

### Keyboard Navigation
- All interactive elements tabbable
- Focus indicators: Purple outline (2px)
- Modal traps focus until closed
- Skip links for screen readers

### Screen Reader Support
- Semantic HTML (nav, main, aside, article)
- ARIA labels for icon buttons
- ARIA live regions for AI responses and sync status
- Alt text for all visual indicators

### Color Contrast
- Text: Minimum 4.5:1 contrast ratio
- Interactive elements: Minimum 3:1
- Status indicators: Color + icon/text (not color alone)

### Motion
- Respect prefers-reduced-motion
- Option to disable animations in settings

---

## Decision Log

### Screen Architecture Decisions
- **Single-screen dashboard pattern** chosen over multi-page app for faster context switching
- **Modal overlays** for details keep users in flow without navigation
- **Persistent AI panel** ensures queries always accessible (key differentiator)

### Layout Decisions
- **Fixed sidebar width (280px)** provides consistent account list visibility
- **Fixed AI panel (380px)** balances chat usability with dashboard space
- **6-card grid** maps directly to journey stages and information priorities

### Interaction Decisions
- **Click-to-modal** pattern reduces cognitive load vs. separate detail pages
- **Hover tooltips** for truncated text avoids overwhelming cards with full content
- **Streaming AI responses** provide feedback during processing (better UX than waiting)

### Edge Case Handling
- **Transparent AI limitations** build trust vs. making up answers
- **Graceful sync failures** with manual retry keeps users productive
- **Stale data warnings** ensure users aware of potential outdated info

---

## Next Steps

**Next Agent:** Aria Patterns (Design System Architect)  
**Required Fields:** ✅ Screen list (4 screens), ✅ Persistent UI patterns, ✅ Interactions defined

---

**Filename:** `NayaWire-CS720-20251004-151500.md`  
**Upload to:** `/data/outputs/`  
**Commit:** "Add Wireframe Blueprint for CS720"