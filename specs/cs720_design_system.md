# Design System Spec - CS720

**Project:** CS720  
**Agent:** Aria Patterns  
**Created:** 2025-10-04 15:22:00  
**Source:** NayaWire-CS720-20251004-151500.md

---

## Design Tokens

### Typography

#### Font Families
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
```

#### Type Scale
```css
--font-size-display: 32px;    /* Page titles, welcome screens */
--font-size-h1: 24px;          /* Dashboard section headers */
--font-size-h2: 18px;          /* Card headers */
--font-size-body: 14px;        /* Default text, card content */
--font-size-caption: 12px;     /* Timestamps, metadata, badges */
--font-size-micro: 10px;       /* Small labels, ultra-compact */
```

#### Font Weights
```css
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

#### Line Heights
```css
--line-height-tight: 1.2;      /* Headings */
--line-height-normal: 1.5;     /* Body text */
--line-height-relaxed: 1.75;   /* Long-form content */
```

---

### Color System (Semantic Roles)

#### Base Colors (Dark Theme)
```css
/* Backgrounds */
--color-bg-primary: #0F0F0F;           /* Main background */
--color-bg-secondary: #1A1A1A;         /* Card backgrounds */
--color-bg-tertiary: #252525;          /* Elevated elements */
--color-bg-overlay: rgba(0,0,0,0.7);   /* Modal overlay */

/* Surfaces */
--color-surface-base: #1E1E1E;
--color-surface-raised: #2A2A2A;
--color-surface-elevated: #353535;
```

#### Brand & Accent (Purple-Blue Gradient)
```css
--color-primary: #7C3AED;              /* Violet-600 */
--color-primary-light: #8B5CF6;        /* Violet-500 */
--color-primary-dark: #6D28D9;         /* Violet-700 */

--color-accent: #6366F1;               /* Indigo-500 */
--color-accent-light: #818CF8;         /* Indigo-400 */
--color-accent-dark: #4F46E5;          /* Indigo-600 */

/* Gradient */
--gradient-primary: linear-gradient(135deg, #7C3AED 0%, #6366F1 100%);
--gradient-primary-hover: linear-gradient(135deg, #8B5CF6 0%, #818CF8 100%);
```

#### Text Colors
```css
--color-text-primary: #FFFFFF;         /* High emphasis */
--color-text-secondary: #A3A3A3;       /* Medium emphasis (neutral-400) */
--color-text-tertiary: #737373;        /* Low emphasis (neutral-500) */
--color-text-disabled: #525252;        /* Disabled state (neutral-600) */
--color-text-on-primary: #FFFFFF;      /* Text on purple backgrounds */
```

#### Status Colors
```css
/* Success / On-Track */
--color-success: #22C55E;              /* Green-500 */
--color-success-bg: rgba(34, 197, 94, 0.15);
--color-success-border: rgba(34, 197, 94, 0.3);

/* Error / Critical */
--color-error: #EF4444;                /* Red-500 */
--color-error-bg: rgba(239, 68, 68, 0.15);
--color-error-border: rgba(239, 68, 68, 0.3);

/* Warning / At-Risk */
--color-warning: #F59E0B;              /* Amber-500 */
--color-warning-bg: rgba(245, 158, 11, 0.15);
--color-warning-border: rgba(245, 158, 11, 0.3);

/* Info / In-Progress */
--color-info: #3B82F6;                 /* Blue-500 */
--color-info-bg: rgba(59, 130, 246, 0.15);
--color-info-border: rgba(59, 130, 246, 0.3);
```

#### Border Colors
```css
--color-border-default: rgba(255, 255, 255, 0.1);
--color-border-focus: var(--color-primary);
--color-border-hover: rgba(255, 255, 255, 0.2);
--color-border-disabled: rgba(255, 255, 255, 0.05);
```

---

### Spacing Scale
```css
--space-xs: 4px;               /* Tight spacing, badge padding */
--space-sm: 8px;               /* Compact elements */
--space-md: 16px;              /* Default spacing, card padding */
--space-lg: 24px;              /* Section spacing */
--space-xl: 32px;              /* Major sections */
--space-2xl: 48px;             /* Screen margins */
--space-3xl: 64px;             /* Large separations */
```

---

### Elevation (Box Shadows)
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 
             0 2px 4px -1px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 
             0 4px 6px -2px rgba(0, 0, 0, 0.3);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 
             0 10px 10px -5px rgba(0, 0, 0, 0.3);

/* Special: Purple glow for interactive elements */
--shadow-glow: 0 0 20px rgba(124, 58, 237, 0.4);
--shadow-glow-strong: 0 0 30px rgba(124, 58, 237, 0.6);
```

---

### Border Radius
```css
--radius-sm: 4px;              /* Badges, small elements */
--radius-md: 8px;              /* Buttons, inputs, cards */
--radius-lg: 12px;             /* Modals, large containers */
--radius-xl: 16px;             /* Feature cards */
--radius-full: 9999px;         /* Circular elements */
```

---

### Motion & Animation

#### Duration
```css
--duration-fast: 150ms;        /* Micro-interactions */
--duration-normal: 300ms;      /* Default transitions */
--duration-slow: 500ms;        /* Complex animations */
```

#### Easing
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

#### Transitions
```css
--transition-default: all var(--duration-normal) var(--ease-in-out);
--transition-fast: all var(--duration-fast) var(--ease-out);
--transition-color: color var(--duration-fast) var(--ease-in-out),
                    background-color var(--duration-fast) var(--ease-in-out);
```

---

## Component Inventory

### 1. Button

**Purpose:** Primary interactive element for actions

**Variants:**
- **primary:** Purple gradient fill, high emphasis
- **secondary:** Transparent with purple border, medium emphasis
- **tertiary:** Text-only, low emphasis
- **danger:** Red fill for destructive actions
- **ghost:** Minimal style for subtle actions

**Props:**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}
```

**Sizes:**
- **sm:** Height 32px, padding 8px 16px, font-size 12px
- **md:** Height 40px, padding 12px 24px, font-size 14px
- **lg:** Height 48px, padding 16px 32px, font-size 16px

**States:**
- **default:** Base styling per variant
- **hover:** Lighter gradient (primary), border opacity increase (secondary), text color shift (tertiary)
- **active:** Darker gradient, scale 0.98
- **focus:** Purple outline (2px), shadow-glow
- **disabled:** 50% opacity, no pointer events
- **loading:** Spinner icon, disabled interaction

**Accessibility:**
- Role: `button` (implicit)
- Keyboard: Enter/Space activation
- Focus: Visible outline (--color-primary, 2px)
- Screen reader: Announce loading state with aria-busy="true"
- Disabled: aria-disabled="true", visual + functional disable

**CSS Example:**
```css
.button-primary {
  background: var(--gradient-primary);
  color: var(--color-text-on-primary);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  transition: var(--transition-default);
}

.button-primary:hover {
  background: var(--gradient-primary-hover);
  box-shadow: var(--shadow-glow);
}

.button-primary:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

### 2. Card

**Purpose:** Container for dashboard information modules

**Props:**
```typescript
interface CardProps {
  title?: string;
  elevation?: 'none' | 'sm' | 'md';
  interactive?: boolean;
  loading?: boolean;
  empty?: boolean;
  error?: boolean;
}
```

**Dimensions:**
- **Min height:** 280px
- **Padding:** var(--space-lg) (24px)
- **Border:** 1px solid var(--color-border-default)
- **Background:** var(--color-bg-secondary)

**States:**
- **default:** Base styling, subtle border
- **hover (if interactive):** Elevation increase (shadow-md), border opacity 0.2
- **loading:** Skeleton shimmer animation
- **empty:** Display empty state message with muted text
- **error:** Red border accent, error icon

**Accessibility:**
- Semantic: `<article>` or `<section>` tag
- ARIA: aria-label for title if not visually present
- Interactive cards: role="button" or proper link semantics
- Loading: aria-busy="true", aria-live="polite"

**CSS Example:**
```css
.card {
  min-height: 280px;
  padding: var(--space-lg);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  transition: var(--transition-default);
}

.card.interactive:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
}

.card-header {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
  border-bottom: 2px solid transparent;
  background: var(--gradient-primary);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

### 3. Badge

**Purpose:** Status indicators and labels

**Variants:**
- **status:** Color-coded for status (success/error/warning/info)
- **opportunity:** Purple gradient for upsell/opportunity
- **severity:** Indicates issue severity (critical/high/medium/low)
- **default:** Neutral grey badge

**Props:**
```typescript
interface BadgeProps {
  variant: 'status' | 'opportunity' | 'severity' | 'default';
  status?: 'success' | 'error' | 'warning' | 'info';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}
```

**Sizes:**
- **sm (tag):** Height 20px, padding 4px 8px, font-size 10px
- **md (status):** Height 24px, padding 6px 12px, font-size 12px

**States:**
- Color-coded backgrounds with matching text
- Icon + text combination
- Uppercase, bold text

**Accessibility:**
- Semantic: `<span>` with appropriate role
- Screen reader: Announce full status (not just color)
- Not focusable (informational only)
- Status via aria-label: "Critical priority" not just red color

**CSS Example:**
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-error {
  background: var(--color-error-bg);
  color: var(--color-error);
  border: 1px solid var(--color-error-border);
}

.badge-opportunity {
  background: var(--gradient-primary);
  color: var(--color-text-on-primary);
}
```

---

### 4. Input

**Purpose:** Text input fields for search, queries, and forms

**Variants:**
- **text:** Standard text input
- **search:** Search-specific with icon
- **textarea:** Multi-line input (AI chat)

**Props:**
```typescript
interface InputProps {
  variant: 'text' | 'search' | 'textarea';
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}
```

**Dimensions:**
- **Height:** 40px (text), auto (textarea)
- **Padding:** 12px 16px
- **Border:** 1px solid var(--color-border-default)

**States:**
- **default:** Dark background, subtle border
- **focus:** Purple border (2px), shadow-glow
- **error:** Red border, error message below
- **disabled:** Reduced opacity, no interaction
- **filled:** Maintain focus styling if has value

**Accessibility:**
- Associated `<label>` with htmlFor
- Error announcement: aria-describedby pointing to error message
- aria-invalid="true" when error present
- Keyboard navigation: Tab to focus, Shift+Tab to reverse
- Placeholder not a replacement for label

**CSS Example:**
```css
.input {
  width: 100%;
  height: 40px;
  padding: 12px 16px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  transition: var(--transition-default);
}

.input:focus {
  outline: none;
  border: 2px solid var(--color-primary);
  box-shadow: var(--shadow-glow);
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input-error {
  border-color: var(--color-error);
}

.input-error-message {
  margin-top: var(--space-xs);
  font-size: var(--font-size-caption);
  color: var(--color-error);
}
```

---

### 5. Modal

**Purpose:** Overlay for detailed information and focused interactions

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}
```

**Sizes:**
- **sm:** Max-width 480px
- **md:** Max-width 800px (default)
- **lg:** Max-width 1200px

**States:**
- **closed:** Not rendered or display: none
- **opening:** Fade in overlay (200ms) + slide up content (200ms)
- **open:** Full visibility, focus trapped
- **closing:** Fade out animation (200ms)

**Accessibility:**
- Role: `dialog`, aria-modal="true"
- Focus trap: First focusable element receives focus on open
- Close methods: × button, Esc key, overlay click (if enabled)
- Return focus: Return to trigger element on close
- Screen reader: Announce modal title on open
- Scroll lock: Prevent background scroll when modal open

**CSS Example:**
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

.modal-content {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp var(--duration-normal) var(--ease-out);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border-default);
}

.modal-close {
  /* Close button styles */
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

### 6. Avatar

**Purpose:** Visual representation of users and team members

**Props:**
```typescript
interface AvatarProps {
  src?: string;
  alt: string;
  initials?: string;
  size: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away';
}
```

**Sizes:**
- **xs:** 24px (compact lists)
- **sm:** 32px (team member grids)
- **md:** 40px (default)
- **lg:** 64px (profile views)

**States:**
- **with-image:** Display image with fallback
- **initials:** Display text initials if no image
- **status-indicator:** Small dot overlay for online status

**Accessibility:**
- Alt text required for images
- Initials announced for screen readers
- Not focusable (decorative)

**CSS Example:**
```css
.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-on-primary);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-caption);
  position: relative;
}

.avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-bg-secondary);
}

.avatar-status.online {
  background: var(--color-success);
}
```

---

### 7. Progress Bar

**Purpose:** Visual indicator of completion or loading

**Props:**
```typescript
interface ProgressBarProps {
  value: number; // 0-100
  variant: 'determinate' | 'indeterminate';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
}
```

**Sizes:**
- **sm:** Height 4px
- **md:** Height 8px
- **lg:** Height 12px

**States:**
- **determinate:** Shows specific percentage (0-100%)
- **indeterminate:** Animated loading state
- **color variants:** Matches status colors

**Accessibility:**
- Role: `progressbar`
- aria-valuenow: Current value
- aria-valuemin: 0
- aria-valuemax: 100
- aria-label: Descriptive label (e.g., "Project completion")

**CSS Example:**
```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  transition: width var(--duration-normal) var(--ease-out);
  border-radius: var(--radius-full);
}

.progress-indeterminate .progress-fill {
  width: 30%;
  animation: progressIndeterminate 1.5s infinite var(--ease-in-out);
}

@keyframes progressIndeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```

---

### 8. Tooltip

**Purpose:** Contextual help text on hover/focus

**Props:**
```typescript
interface TooltipProps {
  content: string | ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
}
```

**Dimensions:**
- **Max-width:** 280px (configurable)
- **Padding:** 8px 12px
- **Arrow:** 6px triangle pointer

**States:**
- **hidden:** display: none, opacity: 0
- **visible:** Fade in after delay (default 300ms)

**Accessibility:**
- Role: `tooltip`
- Triggered by hover + focus
- aria-describedby on trigger element
- Not for critical information (should be in main content)
- Keyboard: Visible on focus, dismissed on blur/Esc

**CSS Example:**
```css
.tooltip {
  position: absolute;
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-caption);
  max-width: 280px;
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
  pointer-events: none;
}

.tooltip.visible {
  opacity: 1;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}
```

---

### 9. Skeleton Loader

**Purpose:** Loading placeholder that maintains layout

**Props:**
```typescript
interface SkeletonProps {
  variant: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}
```

**Variants:**
- **text:** Single line text placeholder
- **circular:** Avatar/icon placeholder
- **rectangular:** Card/image placeholder

**States:**
- **pulse:** Opacity animation
- **wave:** Shimmer gradient animation

**Accessibility:**
- aria-busy="true" on parent container
- aria-label="Loading" or similar
- Not focusable

**CSS Example:**
```css
.skeleton {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

.skeleton-pulse {
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

.skeleton-wave {
  background: linear-gradient(
    90deg,
    var(--color-bg-tertiary) 25%,
    var(--color-bg-elevated) 50%,
    var(--color-bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: skeletonWave 1.5s linear infinite;
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes skeletonWave {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 10. Toast Notification

**Purpose:** Brief feedback messages

**Props:**
```typescript
interface ToastProps {
  message: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // ms, default 3000
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
}
```

**Dimensions:**
- **Min-width:** 320px
- **Max-width:** 480px
- **Padding:** 16px
- **Position:** Bottom-right of screen (default)

**States:**
- **entering:** Slide in from right
- **visible:** Full opacity
- **exiting:** Slide out + fade

**Accessibility:**
- Role: `status` or `alert` (for errors)
- aria-live="polite" (status) or "assertive" (alert)
- Screen reader announces message
- Focus: Not focused automatically (non-intrusive)
- Keyboard: Dismiss with action button or auto-dismiss

**CSS Example:**
```css
.toast {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  min-width: 320px;
  padding: var(--space-md);
  background: var(--color-bg-elevated);
  border-left: 4px solid var(--color-success);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  animation: toastSlideIn var(--duration-normal) var(--ease-out);
}

.toast-error {
  border-left-color: var(--color-error);
}

@keyframes toastSlideIn {
  from {
    transform: translateX(calc(100% + var(--space-lg)));
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

### 11. Sidebar (Account List)

**Purpose:** Persistent navigation for account selection

**Props:**
```typescript
interface SidebarProps {
  accounts: Account[];
  activeAccountId?: string;
  onAccountSelect: (accountId: string) => void;
  collapsible?: boolean;
}
```

**Dimensions:**
- **Width:** 280px (expanded), 60px (collapsed)
- **Item height:** 48px
- **Padding:** 16px

**States:**
- **expanded:** Full account names visible
- **collapsed:** Icons only, tooltip on hover
- **item-active:** Purple gradient background
- **item-hover:** Border highlight

**Accessibility:**
- Role: `navigation`
- aria-label="Customer accounts"
- Keyboard: Arrow keys to navigate, Enter to select
- Active item: aria-current="page"
- Search input: aria-label="Filter accounts"

**CSS Example:**
```css
.sidebar {
  width: 280px;
  height: 100vh;
  background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border-default);
  display: flex;
  flex-direction: column;
  transition: width var(--duration-normal) var(--ease-in-out);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  color: var(--color-text-secondary);
  border-left: 3px solid transparent;
  transition: var(--transition-default);
  cursor: pointer;
}

.sidebar-item:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

.sidebar-item.active {
  background: var(--gradient-primary);
  color: var(--color-text-on-primary);
  border-left-color: var(--color-accent);
}
```

---

### 12. Chat Message (AI Assistant)

**Purpose:** Display conversation in AI panel

**Props:**
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string | ReactNode;
  timestamp?: Date;
  loading?: boolean;
  sources?: Array<{title: string; url: string}>;
}
```

**Layout:**
- **User messages:** Right-aligned, purple background
- **Assistant messages:** Left-aligned, dark background
- **Max-width:** 80% of chat panel

**States:**
- **sending:** Loading indicator
- **sent:** Full opacity
- **typing (assistant):** Animated dots
- **streaming:** Text appears progressively

**Accessibility:**
- Semantic: Each message in `<article>` or proper container
- Role: `log` for chat container (auto-announces new messages)
- Timestamp: Formatted for screen readers
- Sources: Links are focusable and descriptive

**CSS Example:**
```css
.chat-message {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  max-width: 80%;
}

.chat-message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chat-message.assistant {
  align-self: flex-start;
}

.chat-bubble {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
}

.chat-bubble.user {
  background: var(--gradient-primary);
  color: var(--color-text-on-primary);
}

.chat-bubble.assistant {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.chat-typing {
  display: flex;
  gap: 4px;
}

.chat-typing span {
  width: 8px;
  height: 8px;
  background: var(--color-text-tertiary);
  border-radius: var(--radius-full);
  animation: typingDot 1.4s infinite;
}

.chat-typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingDot {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}
```

---

## Global Accessibility Standards

### Focus Management
- All interactive elements receive visible focus indicator
- Focus outline: 2px solid var(--color-primary), 2px offset
- Focus visible only on keyboard navigation (not mouse click)
- Logical tab order follows visual layout
- Skip links for keyboard users to bypass navigation

### Screen Reader Support
- Semantic HTML5 elements (`<nav>`, `<main>`, `<article>`, `<aside>`)
- ARIA landmarks for major sections
- ARIA live regions for dynamic content (AI responses, sync status)
- Alt text for all informational images
- Icon-only buttons have aria-label

### Keyboard Navigation
- Tab/Shift+Tab: Navigate interactive elements
- Enter/Space: Activate buttons and links
- Escape: Close modals, dismiss overlays
- Arrow keys: Navigate lists (account sidebar, chat history)
- Ctrl/Cmd + K: Focus AI Assistant input (global shortcut)

### Color & Contrast
- Text contrast minimum 4.5:1 (WCAG AA)
- Large text (18px+) minimum 3:1
- Status communicated via icon + text, not color alone
- High contrast mode support via CSS custom properties

### Motion & Animation
- Respect `prefers-reduced-motion` media query
- Disable animations if user prefers reduced motion
- Alternative: Instant state changes instead of transitions

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Error Handling
- Error messages announced to screen readers
- Visual error indicators (color + icon + text)
- Clear, actionable error messages
- Error prevention: Validation before submission

---

## Responsive Breakpoints

### Desktop (1440px+)
- All panels visible
- Maximum card detail and spacing

### Standard Desktop (1024px - 1440px)
- Default layout as specified
- 6-card grid (2 columns)

### Tablet (768px - 1024px)
- Collapsible sidebar (hamburger menu)
- AI panel toggleable (slide in/out)
- Cards reflow to 2 columns

### Mobile (<768px)
- **Out of scope for v1** (web-only constraint)
- Future: Full responsive mobile layout

---

## Dark Theme Optimization

### Contrast Enhancements
- Slightly lighter backgrounds for elevated elements
- Text shadows on pure white text for readability
- Gradient overlays to enhance depth perception

### Purple Gradient Usage
- **Primary actions:** Buttons, CTAs
- **Active states:** Selected items, focused inputs
- **Highlights:** Headers, important badges
- **Avoid:** Large background areas (eye strain)

### Visual Hierarchy in Dark Mode
- Use elevation (shadows) more than borders
- Lighter colors for higher emphasis
- Subtle gradients for depth without brightness

---

## Component Composition Examples

### Dashboard Card with Status Badge
```tsx
<Card title="In-Flight Projects" interactive>
  <ProjectItem 
    name="Cloud Migration Phase 2"
    status={<Badge variant="status" status="success">On Track</Badge>}
    progress={<ProgressBar value={60} color="primary" />}
    onClick={() => openModal('project-detail')}
  />
</Card>
```

### AI Chat Interface
```tsx
<div className="ai-panel">
  <div role="log" aria-live="polite">
    <ChatMessage role="user" content="What are the top priorities?" />
    <ChatMessage role="assistant" loading={true} />
    {/* or when loaded: */}
    <ChatMessage 
      role="assistant" 
      content="Based on recent documents..."
      sources={[{title: "Sales Notes", url: "..."}]}
    />
  </div>
  <Input 
    variant="textarea" 
    placeholder="Ask me anything about your accounts..."
    icon={<SendIcon />}
  />
</div>
```

### Modal with Project Details
```tsx
<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  title="Cloud Migration Phase 2"
  size="md"
>
  <ModalHeader>
    <Badge variant="status" status="success">On Track</Badge>
  </ModalHeader>
  <ModalBody>
    <Grid columns={2}>
      <Section title="Project Details">
        <DataList items={projectDetails} />
      </Section>
      <Section title="Progress">
        <ProgressBar value={60} showLabel />
        <AvatarGroup members={teamMembers} />
      </Section>
    </Grid>
  </ModalBody>
</Modal>
```

---

## Implementation Notes

### CSS Architecture
- Use CSS custom properties for all tokens
- Component-scoped CSS modules or styled-components
- Global reset with dark theme defaults
- Utility classes for common patterns (flex, grid, spacing)

### Component Library Structure
```
/components
  /Button
    - Button.tsx
    - Button.module.css
    - Button.test.tsx
    - Button.stories.tsx
  /Card
  /Badge
  ...
  /tokens
    - colors.css
    - typography.css
    - spacing.css
    - motion.css
```

### Design Token Export
- Export tokens as JSON for Figma/design tools
- Generate TypeScript types from tokens
- Document in Storybook for developer reference

---

## Decision Log

### Color System Decisions
- **Deep purple-blue gradient (#7C3AED → #6366F1)** selected for professional, tech-focused brand
- **Dark theme optimized** for extended use, reduced eye strain
- **Semantic color roles** ensure consistent status communication

### Typography Decisions
- **Inter font family** chosen for excellent readability in data-dense UIs
- **5-level type scale** provides clear hierarchy without complexity
- **14px body text** balances readability with information density

### Component Decisions
- **12 core components** cover all wireframe needs
- **Consistent sizing scales** (sm/md/lg) across components
- **Accessibility-first** design with ARIA, keyboard nav, screen reader support

### Animation Decisions
- **Fast transitions (150ms)** for micro-interactions
- **Normal transitions (300ms)** for standard UI changes
- **Reduced motion support** for accessibility compliance

---

## Next Steps

**Next Agent:** Cyrus Stack (Frontend Architecture)  
**Required Fields:** ✅ Tokens defined, ✅ Component list with props/states/a11y

---

**Filename:** `AriaPatterns-CS720-20251004-152200.md`  
**Upload to:** `/data/outputs/`  
**Commit:** "Add Design System Spec for CS720"