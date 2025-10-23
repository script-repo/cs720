# CS720 AI Advisor

An AI-powered chat interface with web search capabilities and multi-backend support. Run language models locally with Ollama or connect to OpenAI-compatible APIs.

## Features

- **Multi-Backend Support**: Use local Ollama or OpenAI-compatible APIs (OpenAI, vLLM, LocalAI, etc.)
- **Web Search Integration**: Real-time web search powered by Perplexity AI
- **Streaming Responses**: Token-by-token streaming for responsive UX
- **Markdown Support**: Rich text rendering for formatted responses
- **Customizable System Prompts**: Configure AI behavior and personality
- **CORS Proxy**: Built-in proxy server to bypass CORS restrictions
- **Privacy Options**: Keep conversations local with Ollama or use cloud APIs

## Prerequisites

Depending on your chosen backend:

### For Ollama (Local):
You need to have Ollama installed and running:

1. **Install Ollama**: Download from [ollama.com](https://ollama.com)
2. **Pull a model**: Run `ollama pull llama3.2` (or any other model)
3. **Start Ollama**: Ollama runs automatically after installation on port 11434

Verify Ollama is running by visiting http://localhost:11434 in your browser.

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cs720-ai-advisor
```

2. Install dependencies:
```bash
npm install
```

3. Make sure Ollama is running with a model:
```bash
ollama pull llama3.2
ollama serve  # Usually starts automatically
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory. You can serve them with any static file server:

```bash
npm run preview
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│              Web Browser                │
├─────────────────────────────────────────┤
│  Chat UI (HTML/CSS/JS)                  │
│  ├─ Message history                     │
│  ├─ Markdown rendering                  │
│  └─ Streaming output                    │
├─────────────────────────────────────────┤
│  Ollama Integration                     │
│  ├─ HTTP API calls                      │
│  ├─ Chat completion API                 │
│  └─ Streaming interface                 │
└─────────────────────────────────────────┘
              ↕ (HTTP)
┌─────────────────────────────────────────┐
│         Ollama Server (Local)           │
│         http://localhost:11434          │
├─────────────────────────────────────────┤
│  LLM Inference Engine                   │
│  └─ Model: llama3.2 (or any model)     │
└─────────────────────────────────────────┘
```

### Technology Stack

- **Ollama**: Local LLM inference server
- **Marked.js**: Markdown parsing and rendering
- **Vite**: Build tool and dev server
- **Vanilla JavaScript**: Minimal dependencies, no heavy frameworks

### Models

CS720 AI Advisor works with any Ollama model. By default, it uses `gemma3:270m`. Popular options:

- **llama3.2** (3B): Fast, good quality, recommended
- **llama3.2:1b**: Smaller, even faster
- **mistral**: High quality, larger
- **gemma2:2b**: Google's efficient model
- **phi3**: Microsoft's compact model

Change the model by editing `src/ollama-integration.js`:

```javascript
this.modelId = 'llama3.2:latest';
// Or use any other model you've pulled
```

Or pull a specific model:
```bash
ollama pull llama3.2
ollama pull mistral
ollama pull gemma2:2b
```

## Project Structure

```
cs720-ai-advisor/
├── index.html                # Main HTML file
├── styles.css                # UI styles
├── proxy-server.js           # CORS proxy for OpenAI APIs
├── src/
│   ├── main.js               # Application entry point
│   ├── chat-ui.js            # Chat interface logic
│   ├── ollama-integration.js # Ollama API wrapper
│   ├── openai-integration.js # OpenAI-compatible API wrapper
│   └── web-search.js         # Perplexity web search integration
├── package.json
├── vite.config.js
└── README.md
```

## Usage

1. Ensure Ollama is running and you have a model installed
2. Start the development server (`npm run dev`)
3. Open http://localhost:5173 in your browser
4. Type your message in the input box
5. Press Enter or click Send
6. Watch as the AI responds with streaming output
7. Continue the conversation naturally

## Limitations

- **Requires Ollama**: Must have Ollama installed and running locally
- **Local Only**: Designed for local use (not for deployment to web servers)
- **No Persistence**: Conversations are not saved (in-memory only)
- **CORS**: Requires Ollama to allow requests from localhost

## Performance Tips

- **Model Selection**: Smaller models (1B-3B) are faster but less capable
- **GPU**: Ollama automatically uses GPU if available for faster inference
- **RAM**: Ensure sufficient RAM for your chosen model (4GB+ for small models)
- **Close Other Apps**: Free up resources for better performance

## Troubleshooting

### "Failed to connect to Ollama" Error

- Verify Ollama is installed: `ollama --version`
- Check if Ollama is running: Visit http://localhost:11434
- On Windows: Ollama should start automatically
- On Mac/Linux: Run `ollama serve` manually if needed

### "No models found" Error

- Pull a model first: `ollama pull llama3.2`
- List available models: `ollama list`
- Check model is downloaded completely

### Slow Performance

- Use a smaller model (e.g., `llama3.2:1b` instead of `llama3.2`)
- Close other applications to free up RAM
- Check CPU/GPU usage with Ollama
- Consider upgrading your hardware for larger models

### CORS Issues

Ollama should allow localhost by default. If you have issues:
- Check Ollama version is up to date
- Restart Ollama service
- Check browser console for specific CORS errors

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts Vite's development server with hot module reloading.

### Code Structure

- **`main.js`**: Application initialization, Ollama connection, conversation management
- **`chat-ui.js`**: UI management, message rendering, markdown support
- **`ollama-integration.js`**: Ollama API wrapper with streaming support

## Future Enhancements

Potential features for future versions:

- [ ] Multiple model selection (UI dropdown)
- [ ] Conversation persistence (localStorage)
- [ ] System prompt customization
- [ ] Export conversation history
- [ ] Advanced settings (temperature, max tokens)
- [ ] Model management (pull/delete models from UI)
- [ ] Custom Ollama server URL configuration

## License

MIT

## Credits

- **Ollama**: [ollama.com](https://ollama.com)
- **Marked.js**: [marked](https://github.com/markedjs/marked)
- **Models**: Various open-source LLMs (Llama, Mistral, Gemma, etc.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

This project demonstrates how to build privacy-focused AI chat interfaces using local inference, eliminating the need for cloud APIs and external services.
