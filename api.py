"""
FastAPI backend for the profile chatbot. Used by the embeddable widget on public websites.
Run: uvicorn api:app --reload
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from openai import APIError, RateLimitError

from agent import ProfileChatAgent, load_profile, USE_OLLAMA

FRIENDLY_QUOTA_MESSAGE = (
    "I'm temporarily unable to answer; please try again in a little while."
)

# CORS: allow your website(s) to call the API. Use * for any origin, or set env WIDGET_ORIGINS.
WIDGET_ORIGINS = os.getenv("WIDGET_ORIGINS", "*").split(",")
if "*" in WIDGET_ORIGINS:
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in WIDGET_ORIGINS if o.strip()]

# Lazy init agent (same instance for all requests, keeps profile in memory)
_agent: ProfileChatAgent | None = None


def get_agent() -> ProfileChatAgent:
    global _agent
    if _agent is None:
        if not USE_OLLAMA and not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=503,
                detail="Chat backend not configured. Set OPENAI_API_KEY or USE_OLLAMA=true in .env",
            )
        _agent = ProfileChatAgent()
    return _agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        load_profile()
    except FileNotFoundError:
        pass
    yield
    global _agent
    _agent = None


app = FastAPI(title="Profile Chat API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []  # [{"role":"user","content":"..."}, {"role":"assistant","content":"..."}]


class ChatResponse(BaseModel):
    reply: str


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Send a message and get a reply. Optionally send conversation history for context."""
    if not (req.message or "").strip():
        raise HTTPException(status_code=400, detail="message is required")
    try:
        agent = get_agent()
        reply = agent.chat_with_history(req.history, req.message.strip())
        return ChatResponse(reply=reply)
    except RateLimitError:
        return ChatResponse(reply=FRIENDLY_QUOTA_MESSAGE)
    except APIError as e:
        if e.status_code == 429 or (e.body and "quota" in str(e.body).lower()):
            return ChatResponse(reply=FRIENDLY_QUOTA_MESSAGE)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        err_str = str(e).lower()
        if "429" in err_str or "quota" in err_str or "insufficient_quota" in err_str:
            return ChatResponse(reply=FRIENDLY_QUOTA_MESSAGE)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/env-check")
def env_check():
    """Safe debug: report if OpenAI/Ollama is configured (no secrets)."""
    key_set = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "openai_configured": key_set,
        "use_ollama": USE_OLLAMA,
        "message": "OPENAI_API_KEY is set" if key_set else "OPENAI_API_KEY is missing or empty in this process",
    }


# Serve the embeddable widget and demo page
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


@app.get("/widget.js")
def widget_js():
    path = os.path.join(STATIC_DIR, "widget.js")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="widget.js not found")
    return FileResponse(path, media_type="application/javascript")


@app.get("/widget.css")
def widget_css():
    path = os.path.join(STATIC_DIR, "widget.css")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="widget.css not found")
    return FileResponse(path, media_type="text/css")


@app.get("/demo")
def demo_page():
    """Simple demo page that embeds the widget (same origin)."""
    path = os.path.join(STATIC_DIR, "demo.html")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="demo.html not found")
    return FileResponse(path, media_type="text/html")
