import { marked } from 'marked';

export class ChatUI {
  constructor() {
    this.messagesContainer = document.getElementById('messages');
    this.userInput = document.getElementById('user-input');
    this.sendButton = document.getElementById('send-button');
    this.statusText = document.getElementById('status-text');
    this.loadingSpinner = document.getElementById('loading-spinner');

    this.messages = [];
    this.currentAssistantMessage = null;

    this.setupEventListeners();
    this.configureMarked();
  }

  configureMarked() {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  setupEventListeners() {
    this.sendButton.addEventListener('click', () => this.handleSend());

    this.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
  }

  handleSend() {
    const message = this.userInput.value.trim();
    if (message && this.onSend) {
      this.onSend(message);
      this.userInput.value = '';
      this.adjustTextareaHeight();
    }
  }

  adjustTextareaHeight() {
    this.userInput.style.height = 'auto';
    this.userInput.style.height = this.userInput.scrollHeight + 'px';
  }

  setStatus(text, loading = false) {
    this.statusText.textContent = text;
    if (loading) {
      this.loadingSpinner.classList.remove('hidden');
    } else {
      this.loadingSpinner.classList.add('hidden');
    }
  }

  enableInput() {
    this.userInput.disabled = false;
    this.sendButton.disabled = false;
    this.userInput.focus();
  }

  disableInput() {
    this.userInput.disabled = true;
    this.sendButton.disabled = true;
  }

  addUserMessage(content) {
    const message = { role: 'user', content };
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  }

  startAssistantMessage() {
    const message = { role: 'assistant', content: '' };
    this.messages.push(message);
    this.currentAssistantMessage = message;

    const messageElement = this.createMessageElement(message);
    messageElement.classList.add('streaming');
    this.messagesContainer.appendChild(messageElement);

    const contentElement = messageElement.querySelector('.message-content');
    const cursor = document.createElement('span');
    cursor.className = 'streaming-cursor';
    contentElement.appendChild(cursor);

    this.scrollToBottom();
    return messageElement;
  }

  updateAssistantMessage(content) {
    if (this.currentAssistantMessage) {
      this.currentAssistantMessage.content = content;

      const streamingMessage = this.messagesContainer.querySelector('.message.streaming');
      if (streamingMessage) {
        const contentElement = streamingMessage.querySelector('.message-content');
        const cursor = contentElement.querySelector('.streaming-cursor');

        // Render markdown
        const html = marked.parse(content);
        contentElement.innerHTML = html;

        // Re-add cursor
        if (cursor) {
          contentElement.appendChild(cursor);
        }

        this.scrollToBottom();
      }
    }
  }

  finishAssistantMessage() {
    const streamingMessage = this.messagesContainer.querySelector('.message.streaming');
    if (streamingMessage) {
      streamingMessage.classList.remove('streaming');
      const cursor = streamingMessage.querySelector('.streaming-cursor');
      if (cursor) {
        cursor.remove();
      }
    }
    this.currentAssistantMessage = null;
    this.scrollToBottom();
  }

  renderMessage(message) {
    const messageElement = this.createMessageElement(message);
    this.messagesContainer.appendChild(messageElement);
  }

  createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.role === 'user' ? 'U' : 'A';

    const content = document.createElement('div');
    content.className = 'message-content';

    if (message.role === 'user') {
      content.textContent = message.content;
    } else {
      const html = marked.parse(message.content);
      content.innerHTML = html;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    return messageDiv;
  }

  scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
  }

  clearMessages() {
    this.messages = [];
    this.messagesContainer.innerHTML = '';
    this.currentAssistantMessage = null;
  }

  getMessages() {
    return this.messages;
  }

  addSearchIndicator(resultCount, results = null) {
    const indicator = document.createElement('div');
    indicator.className = 'search-indicator';

    let html = `<div class="search-header">🔍 Found ${resultCount} search result${resultCount !== 1 ? 's' : ''}</div>`;

    // Add expandable search results details
    if (results && results.length > 0) {
      html += '<details class="search-details">';
      html += '<summary>View search results</summary>';
      html += '<div class="search-results-list">';

      results.forEach((result, index) => {
        html += `<div class="search-result-item">`;
        html += `<div class="search-result-title">${index + 1}. ${result.title}</div>`;
        html += `<div class="search-result-snippet">${result.snippet}</div>`;
        html += `<div class="search-result-source">Source: ${result.source}`;
        if (result.url) {
          html += ` • <a href="${result.url}" target="_blank" rel="noopener">Link</a>`;
        }
        html += `</div>`;
        html += `</div>`;
      });

      html += '</div></details>';
    }

    indicator.innerHTML = html;
    this.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
  }

  onSend(message) {
    // Override this method
  }
}
