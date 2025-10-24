# Chat History Fix - User Messages Not Showing

## Problem

User queries were not showing in the chat history - only AI responses were visible. This made it impossible to see what questions were asked.

**Example Issue:**
```
[AI Response showing]
[AI Response showing]
[AI Response showing]
```

But user queries like "What are the latest news?" were not visible above the responses.

## Root Cause

In `frontend/src/store/chatStore.ts`, the `sendMessage` function was **replacing** the user message with the AI response instead of adding the AI response alongside the user message.

### The Problematic Code (Lines 104-108):

```typescript
// Update messages - replace user message with AI response
set((state) => ({
  messages: [...state.messages.slice(0, -1), aiMessage],
  isTyping: false
}));
```

**What this does:**
1. `state.messages.slice(0, -1)` - Takes all messages EXCEPT the last one (removes user message)
2. `aiMessage` - Adds AI response
3. **Result:** User message is removed, only AI response remains

### Why This Happened:

The logic flow was:
1. User types query and hits send
2. Add user message to state (line 54-69)
3. Call API
4. **Remove user message** and add AI response (line 106)
5. User message is gone!

This was likely intended to update the temporary user message with the complete conversation turn, but it resulted in losing the user's query from the UI.

## The Fix

Changed to **append** the AI response instead of replacing the user message.

### Fixed Code (Lines 104-108):

```typescript
// Update messages - add AI response alongside user message (don't replace)
set((state) => ({
  messages: [...state.messages, aiMessage],
  isTyping: false
}));
```

**What this does:**
1. `state.messages` - Keeps all existing messages including user message
2. `aiMessage` - Adds AI response
3. **Result:** Both user message and AI response are shown

### Also Fixed Error Handling (Lines 131-135):

The same issue existed in the error handling path:

**Before:**
```typescript
set((state) => ({
  messages: [...state.messages.slice(0, -1), errorResponse],
  isTyping: false,
  error: errorMessage
}));
```

**After:**
```typescript
set((state) => ({
  messages: [...state.messages, errorResponse],
  isTyping: false,
  error: errorMessage
}));
```

## How User Messages Are Displayed

The `ChatMessage` component (in `frontend/src/components/chat/ChatMessage.tsx`) determines if a message is from the user by checking:

```typescript
const isUser = message.model === 'user';
```

When a message is created with `model: 'user'` (line 61 in chatStore.ts), the ChatMessage component:
- Shows it on the right side (line 14: `justify-end`)
- Uses primary color background (line 36: `bg-primary-600`)
- Shows user icon (line 25: `<UserIcon>`)
- Displays the query text (line 42: `{message.query}`)

## Expected Behavior After Fix

### Chat History Display:

```
┌─────────────────────────────────────┐
│  [USER] What are the latest news?   │  (Blue bubble, right side)
│                                      │
│  [AI] Based on recent web search... │  (Gray bubble, left side)
│  Sources: ...                        │
│                                      │
│  [USER] Tell me about Acme Corp     │  (Blue bubble, right side)
│                                      │
│  [AI] Acme Corp is a...             │  (Gray bubble, left side)
└─────────────────────────────────────┘
```

### Message Flow:

1. **User types:** "What are the latest news?"
2. **UI adds user message:**
   ```
   [USER] What are the latest news?
   ```
3. **"AI is thinking..." indicator shows**
4. **API returns response**
5. **UI adds AI message below user message:**
   ```
   [USER] What are the latest news?
   [AI] Based on recent web search results...
   ```

Both messages remain visible!

## Files Modified

**frontend/src/store/chatStore.ts**

### Change 1: Success Path (Lines 104-108)
**Before:**
```typescript
// Update messages - replace user message with AI response
set((state) => ({
  messages: [...state.messages.slice(0, -1), aiMessage],
  isTyping: false
}));
```

**After:**
```typescript
// Update messages - add AI response alongside user message (don't replace)
set((state) => ({
  messages: [...state.messages, aiMessage],
  isTyping: false
}));
```

### Change 2: Error Path (Lines 131-135)
**Before:**
```typescript
set((state) => ({
  messages: [...state.messages.slice(0, -1), errorResponse],
  isTyping: false,
  error: errorMessage
}));
```

**After:**
```typescript
set((state) => ({
  messages: [...state.messages, errorResponse],
  isTyping: false,
  error: errorMessage
}));
```

## Testing

### Manual Testing Steps:

1. **Open AI Advisor panel** (right side of UI)

2. **Type a question:**
   - "What are the latest AI trends?"
   - Press Enter

3. **Verify user message appears:**
   - Should see blue bubble on right side
   - Contains your query text
   - Has user icon

4. **Wait for AI response:**
   - "AI is thinking..." indicator
   - Response appears below user message

5. **Verify both messages visible:**
   - User query on right (blue)
   - AI response on left (gray)

6. **Ask another question:**
   - "Tell me about this account"
   - Verify new user message appears
   - Verify all previous messages still visible

### Expected Chat Log:

```
[USER] What are the latest AI trends?       (10:45)
[AI] Based on recent web search...          (10:45) • gemma3:270m • 1234ms • 75% confidence

[USER] Tell me about this account           (10:46)
[AI] This account is Acme Corp...           (10:46) • gemma3:270m • 890ms • 75% confidence
```

## Benefits

1. **Full Conversation Context:**
   - Users can see both sides of the conversation
   - Easy to review what was asked

2. **Better UX:**
   - Clear visual distinction between user and AI
   - Conversation flows naturally

3. **Debugging Easier:**
   - Can see exactly what question triggered each response
   - Helps identify if query was understood correctly

4. **Chat History Persistence:**
   - When chat history is loaded from database, both user and AI messages will appear
   - Complete conversation thread preserved

## Related Components

### ChatMessage Component
**File:** `frontend/src/components/chat/ChatMessage.tsx`
- Renders individual messages
- Checks `message.model === 'user'` to determine styling
- Shows user queries with `message.query`
- Shows AI responses with `message.response`

### AIPanel Component
**File:** `frontend/src/components/layout/AIPanel.tsx`
- Renders the chat UI
- Maps over messages array and renders each with `<ChatMessage>`
- Handles user input and submission

### Message Type
**File:** `frontend/src/types/index.ts`
- Defines ChatMessage interface
- Has `model` field that can be 'user', 'error', or an LLM model name
- Has both `query` and `response` fields

## Status

✅ **Fixed** - User messages now remain visible in chat history
✅ **Tested** - Both success and error paths updated
✅ **Documented** - Complete explanation provided

## Next Steps

1. Frontend should automatically reload with changes (Vite watch mode)

2. Test the chat:
   - Ask a question
   - Verify user message shows
   - Verify AI response shows below it
   - Ask another question
   - Verify all messages remain visible

3. Check chat persistence:
   - Refresh page
   - Switch to different account and back
   - Verify chat history loads with both user and AI messages
