# Perplexity Web Search Citations

## Feature

When Perplexity web search is used to answer a query, the chat response now includes clickable citations to the source websites.

## Changes Made

### Backend: Extract Web Search Citations

**File:** `services/backend/src/services/llmService.ts` (Lines 610-633)

**Updated `extractSources` method:**

```typescript
private extractSources(content: string, context: any): string[] {
  const sources: string[] = [];

  // Add web search citations if available
  if (context?.webSearch?.citations && context.webSearch.citations.length > 0) {
    sources.push(...context.webSearch.citations);
  }

  // Look for document references in the response
  if (context?.documents) {
    context.documents.forEach((doc: any) => {
      if (content.toLowerCase().includes(doc.title.toLowerCase().substring(0, 20))) {
        sources.push(doc.id);
      }
    });
  }

  // If no specific documents were referenced, include general account data
  if (sources.length === 0 && context?.account) {
    sources.push('account-data');
  }

  return sources;
}
```

**What changed:**
- ✅ Added check for `context.webSearch.citations`
- ✅ Pushes all Perplexity citation URLs to sources array
- ✅ Web search citations take priority (added first)
- ✅ Falls back to document sources and account data if no web search

### Frontend: Display Citations as Clickable Links

**File:** `frontend/src/components/chat/ChatMessage.tsx` (Lines 47-94)

**Enhanced sources display:**

```typescript
{/* Sources */}
{message.sources && message.sources.length > 0 && (
  <div className="mt-3 pt-3 border-t border-gray-600">
    <p className="text-xs text-gray-300 mb-2 font-semibold">
      {message.sources.some(s => s.startsWith('http')) ? '🔗 Web Sources:' : 'Sources:'}
    </p>
    <div className="space-y-1">
      {message.sources.map((source, index) => {
        // Check if source is a URL
        const isUrl = source.startsWith('http://') || source.startsWith('https://');

        if (isUrl) {
          // Extract domain for display
          let displayText = source;
          try {
            const url = new URL(source);
            displayText = url.hostname.replace('www.', '');
          } catch (e) {
            displayText = source;
          }

          return (
            <div key={index} className="text-xs">
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
              >
                <span>[{index + 1}]</span>
                <span>{displayText}</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          );
        } else {
          return (
            <div key={index} className="text-xs text-gray-400">
              • {source}
            </div>
          );
        }
      })}
    </div>
  </div>
)}
```

**What changed:**
- ✅ Detects if sources are URLs (start with `http://` or `https://`)
- ✅ Shows "🔗 Web Sources:" label when web sources present
- ✅ Extracts domain name for cleaner display (e.g., "abcnews.go.com" instead of full URL)
- ✅ Renders URLs as clickable links with:
  - Blue color (text-blue-400)
  - Hover underline effect
  - External link icon (opens in new tab)
  - Numbered citation format `[1]`, `[2]`, etc.
- ✅ Opens links in new tab with `target="_blank"` and `rel="noopener noreferrer"` for security
- ✅ Falls back to plain text for non-URL sources

## Visual Design

### Web Search Citations Display

```
┌─────────────────────────────────────────────┐
│ AI Response:                                │
│                                             │
│ Based on recent news, here are the         │
│ latest developments...                      │
│                                             │
│ ─────────────────────────────────────      │
│ 🔗 Web Sources:                            │
│ [1] abcnews.go.com ↗                       │
│ [2] cbsnews.com ↗                          │
│ [3] youtube.com ↗                          │
│ [4] dailyherald.com ↗                      │
└─────────────────────────────────────────────┘
```

**Link appearance:**
- Default: Blue text
- Hover: Lighter blue with underline
- Includes external link icon (↗)
- Numbered for easy reference

### Regular (Non-Web) Sources Display

```
┌─────────────────────────────────────────────┐
│ AI Response:                                │
│                                             │
│ Based on the account data...                │
│                                             │
│ ─────────────────────────────────────      │
│ Sources:                                    │
│ • account-data                              │
│ • priorities.pdf                            │
└─────────────────────────────────────────────┘
```

**Plain text appearance:**
- Gray text
- Bullet point prefix
- No link (not clickable)

## Example Flow

### Query with Web Search

**User asks:** "What are the latest AI trends?"

**Perplexity searches and returns:**
```json
{
  "answer": "Recent AI trends include...",
  "citations": [
    "https://techcrunch.com/ai-trends",
    "https://www.theverge.com/ai-news",
    "https://www.wired.com/ai-developments"
  ]
}
```

**Backend extracts sources:**
```typescript
sources = [
  "https://techcrunch.com/ai-trends",
  "https://www.theverge.com/ai-news",
  "https://www.wired.com/ai-developments"
]
```

**Frontend displays:**
```
🔗 Web Sources:
[1] techcrunch.com ↗
[2] theverge.com ↗
[3] wired.com ↗
```

**User clicks `[1]`:**
- Opens https://techcrunch.com/ai-trends in new tab
- Original chat remains open

## Benefits

1. **Source Transparency:**
   - Users can see exactly where information came from
   - Builds trust in AI responses

2. **Verification:**
   - Users can click to verify claims
   - Read full articles for more context

3. **Research Efficiency:**
   - Jump directly to source material
   - No need to search for sources manually

4. **Professional Presentation:**
   - Clean, numbered citation format
   - Academic-style referencing

5. **Visual Distinction:**
   - Web sources clearly marked with 🔗 emoji
   - Blue links stand out from gray text

## Accessibility

- ✅ Links open in new tab (doesn't lose chat context)
- ✅ `rel="noopener noreferrer"` for security
- ✅ External link icon indicates new tab behavior
- ✅ Hover state provides visual feedback
- ✅ Numbered citations for easy reference in conversation

## Testing

### Test with Web Search Query

1. **Ask a question that triggers web search:**
   - "What are the latest tech news?"
   - "Tell me recent AI developments"
   - "What's happening in the market today?"

2. **Verify citations appear:**
   - Look for "🔗 Web Sources:" label
   - See numbered links `[1]`, `[2]`, etc.
   - Links should be blue and clickable

3. **Test link functionality:**
   - Hover over link → Should turn lighter blue and underline
   - Click link → Opens in new tab
   - Original chat remains open

### Test with Non-Web Query

1. **Ask about account data:**
   - "What are the priorities for this account?"
   - "Show me project status"

2. **Verify regular sources appear:**
   - Look for "Sources:" label (no emoji)
   - See bullet points
   - Text should be gray and not clickable

## Edge Cases Handled

1. **Mixed sources:**
   - Web URLs and account data both present
   - Shows "🔗 Web Sources:" since at least one URL present
   - URLs clickable, other sources plain text

2. **Invalid URLs:**
   - Try-catch handles URL parsing errors
   - Falls back to displaying full text if URL parse fails

3. **No sources:**
   - Sources section not displayed at all
   - No empty state shown

4. **YouTube URLs:**
   - Properly handled like any other URL
   - Displays "youtube.com" as domain

## Related Features

- **Web Search Detection:** Automatic keyword-based triggering
- **Perplexity Integration:** Sonar model for current information
- **Response Streaming:** Citations appear when response completes
- **Dynamic Prompts:** Instructions tell LLM to cite sources

## Status

✅ **Implemented** - Citations now displayed for Perplexity web search results
✅ **Tested** - Links are clickable and open in new tab
✅ **Styled** - Clean, professional citation format
✅ **Accessible** - Proper link attributes and visual feedback

## Files Modified

1. `services/backend/src/services/llmService.ts` (Lines 610-633)
   - Updated `extractSources()` to include web search citations

2. `frontend/src/components/chat/ChatMessage.tsx` (Lines 47-94)
   - Enhanced sources display with clickable links
   - Added URL detection and formatting
   - Added external link icon

## Next Steps

The feature is fully implemented and ready to use. When you ask a question that triggers Perplexity web search:
- Response will include the answer
- Citations will appear below the answer
- Click any citation to read the full article
