# Deploy the Chatbot API to Render

Your Render web service: **https://eswar-qepx.onrender.com**

Use these settings so the chatbot API runs there.

---

## Option A: This folder is the only thing in the repo (or you deploy from a repo that has AI_Chatbot at root)

1. Push **AI_Chatbot** to GitHub (this folder = repo root, or a repo that contains only these files).
2. In [Render Dashboard](https://dashboard.render.com) → your service **eswar-qepx** → **Settings**.
3. Under **Build & Deploy** set:
   - **Root Directory:** leave blank (repo root is the chatbot).
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn api:app --host 0.0.0.0 --port $PORT`
4. Under **Environment** add:
   - **OPENAI_API_KEY** = your OpenAI API key (from [platform.openai.com/api-keys](https://platform.openai.com/api-keys))  
     *(Required for Render: Ollama is for local use only; Render’s servers don’t run Ollama.)*
   - **WIDGET_ORIGINS** = `https://eswarrayavarapu.com,https://www.eswarrayavarapu.com` (optional, for CORS)
5. **Manual Deploy** → **Deploy latest commit**.

---

## Option B: AI_Chatbot lives inside a bigger repo (e.g. `Eswar/Projects/AI_Chatbot`)

1. In Render → your service **eswar-qepx** → **Settings**.
2. **Build & Deploy**:
   - **Root Directory:** `Projects/AI_Chatbot`  
     (so Render runs build/start from that folder).
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn api:app --host 0.0.0.0 --port $PORT`
3. **Environment** (same as above):
   - **OPENAI_API_KEY** = your key
   - **WIDGET_ORIGINS** = `https://eswarrayavarapu.com,https://www.eswarrayavarapu.com`
4. Save and trigger **Deploy latest commit**.

---

## After deploy

- The API will be at: **https://eswar-qepx.onrender.com**
- Test: open **https://eswar-qepx.onrender.com/health** → should return `{"status":"ok"}`.
- Test chat: **https://eswar-qepx.onrender.com/demo** → widget on a demo page.

Then in **Vercel** (portfolio project) add:

- **CHATBOT_API_URL** = `https://eswar-qepx.onrender.com`

Redeploy the portfolio. The chat widget on https://eswarrayavarapu.com will use this API.

---

## Note

- **profile.json** must be in the repo (it’s in this folder). Render will have it when Root Directory is set to this folder.
- Don’t put your real **.env** in the repo. Set **OPENAI_API_KEY** in Render’s Environment only.
- **Ollama** (`USE_OLLAMA=true`) is for running the chatbot on your own machine where Ollama is installed. On Render you must use **OpenAI**; Render’s servers don’t have Ollama.
