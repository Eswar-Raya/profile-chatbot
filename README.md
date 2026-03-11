# Profile AI Chatbot

An AI agent that answers questions using **your profile** as context. Ask about your name, job, skills, interests, or anything you’ve added to your profile.

## Setup

1. **Create a virtual environment (recommended)**

   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows
   # or: source venv/bin/activate   # macOS/Linux
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure your profile**

   Edit `profile.json` and fill in your details (name, email, occupation, skills, interests, etc.). The chatbot uses this file to answer questions about you.

4. **Choose a backend**

   - **OpenAI:** Copy `.env.example` to `.env` and set `OPENAI_API_KEY=sk-your-key-here` ([get a key](https://platform.openai.com/api-keys)). Add billing if you hit quota errors.
   - **Ollama (free, local):** In `.env` set `USE_OLLAMA=true`. Install [Ollama](https://ollama.com), then run `ollama run llama3.2:1b` (faster) or `ollama run llama3.2` (better quality). No API key or quota.

## Run

**Web UI (Streamlit)**

```bash
streamlit run app.py
```

**CLI**

```bash
python agent.py
```

**API + embeddable widget (for your public website)**

```bash
uvicorn api:app --reload --host 0.0.0.0
```

Then open **http://localhost:8000/demo** to see the widget on a demo page. Use the API when you want a **floating chat icon** on your real site (see below).

Then ask things like:

- "What's my name?"
- "What do I do for work?"
- "What are my skills?"
- "Where do I live?"
- "What are my interests?"

The agent answers from your profile. If you ask something not in the profile, it will say it doesn’t have that information.

## Embed as a side icon on your public website

You can add the chatbot as a **floating icon** (bottom-right) on any website (e.g. **https://eswarrayavarapu.com**). Visitors click the icon to open a chat panel and ask about your profile.

1. **Deploy the API** somewhere public (e.g. Railway, Render, Fly.io, or your own server). Ensure `profile.json` and `.env` (OpenAI or `USE_OLLAMA`) are available on the server. The API serves the widget files and handles `/chat`. Note your API base URL (e.g. `https://your-chat-api.fly.dev`).

2. **Add this line** to your portfolio (or any page), just before `</body>`. Replace `https://YOUR-API-URL` with your deployed API URL:

   ```html
   <script src="https://YOUR-API-URL/widget.js" data-api-url="https://YOUR-API-URL"></script>
   ```

   Example for **eswarrayavarapu.com** (once your API is deployed at e.g. `https://profile-chat.fly.dev`):

   ```html
   <script src="https://profile-chat.fly.dev/widget.js" data-api-url="https://profile-chat.fly.dev"></script>
   ```

3. **CORS (optional):** To allow only your portfolio to use the widget, set on the API server:
   ```bash
   WIDGET_ORIGINS=https://eswarrayavarapu.com,https://www.eswarrayavarapu.com
   ```

**Local test:** Run `uvicorn api:app --reload`, then open **http://localhost:8000/demo** to try the widget.

## Project structure

- `profile.json` – Your profile (edit this)
- `agent.py` – Profile loader + OpenAI/Ollama chat agent
- `app.py` – Streamlit web chat
- `api.py` – FastAPI backend for the embeddable widget
- `static/widget.js`, `static/widget.css` – Widget script and styles
- `static/demo.html` – Demo page (served at `/demo`)
- `.env` – API key or `USE_OLLAMA` (create from `.env.example`)

## Optional

- **OpenAI model**: set `OPENAI_MODEL=gpt-4o` (or another model) in `.env`.
- **Ollama model**: when using `USE_OLLAMA=true`, set `OLLAMA_MODEL=llama3.2:1b` (faster) or `llama3.2` (better quality). Run `ollama run <model>` to download.
- **Quota / 429 errors**: Add a payment method at [OpenAI Billing](https://platform.openai.com/account/billing), or switch to Ollama with `USE_OLLAMA=true`.
