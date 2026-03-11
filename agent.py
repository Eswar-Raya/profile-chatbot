"""
AI agent that answers questions using the user's profile as context.
Supports OpenAI and Ollama (local, no API key or quota).
"""
import json
import os
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

PROFILE_PATH = Path(__file__).parent / "profile.json"
USE_OLLAMA = os.getenv("USE_OLLAMA", "").lower() in ("1", "true", "yes")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")  # 1b = faster; use llama3.2 for better quality
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def load_profile() -> dict:
    """Load and return the user profile from profile.json."""
    if not PROFILE_PATH.exists():
        raise FileNotFoundError(
            f"Profile not found at {PROFILE_PATH}. "
            "Create profile.json with your information."
        )
    with open(PROFILE_PATH, encoding="utf-8") as f:
        return json.load(f)


def _format_value(key: str, value) -> str:
    """Format a single profile value for the system prompt."""
    if isinstance(value, list):
        if value and isinstance(value[0], dict):
            # e.g. experience
            parts = []
            for i, item in enumerate(value, 1):
                if isinstance(item, dict) and "company" in item and "role" in item:
                    parts.append(
                        f"  {i}. {item.get('company', '')} | {item.get('role', '')} | {item.get('period', '')}\n"
                        + "     " + "; ".join(item.get("highlights", []))
                    )
                else:
                    parts.append(f"  {i}. " + (json.dumps(item, indent=4) if isinstance(item, dict) else str(item)))
            return "\n".join(parts)
        # list of strings (e.g. skills, certifications, applied_ai_projects)
        return "\n".join(f"  {i}. {v}" for i, v in enumerate(value, 1))
    if isinstance(value, dict):
        return json.dumps(value, indent=2)
    return str(value)


def profile_to_context(profile: dict) -> str:
    """Convert profile dict into a text block for the system prompt."""
    lines = []
    for key, value in profile.items():
        if value is None or value == "" or value == [] or value == {}:
            continue
        formatted = _format_value(key, value)
        lines.append(f"- **{key}**: {formatted}")
    return "\n".join(lines)


def build_system_prompt(profile: dict) -> str:
    """Build the system prompt that instructs the model to use the profile."""
    context = profile_to_context(profile)
    return f"""You are a helpful AI assistant on a portfolio website. The person chatting with you is a visitor (a stranger, recruiter, or anyone) who wants to learn about the profile owner. You are not talking to the profile owner.

Portfolio pages (use these links when relevant):
- Experience: https://eswarrayavarapu.com/experience
- Transformation programs: https://eswarrayavarapu.com/projects
- Contact: https://eswarrayavarapu.com/contact

**Profile owner's information:**
{context}

Rules:
- Answer questions about the profile owner (name, job, skills, interests, location, etc.) using only the information above.
- Always refer to the profile owner in the third person (e.g. "Eswar's top skills are...", "His experience includes..."). Never say "Your skills", "your", or "you" when describing the profile owner — the visitor is not the profile owner.
- Avoid second-person phrasing that implies the visitor is Eswar (e.g. do NOT end with "This enables you to..."). Use "This enables him/her/them to..." or "This enables Eswar to..." instead.
- Format replies for easy reading: use bullet points or short numbered lines for lists (e.g. skills, roles, tools). Use line breaks between ideas. Avoid one long dense paragraph so the answer does not feel clumpy.
- If asked something not in the profile, say you don't have that information.
- Be concise. Keep the focus on profile-related queries.

Response length policy (important):
- Prefer 1-2 short sentences.
- For "top skills", "strengths", "summary", provide at most 3 bullets, then point to the relevant page link for details.
- If asked about experience/career history, point to the Experience page link.
- If asked about programs/projects/case studies, point to the Transformation programs page link.
- If asked how to contact, provide the Contact page link.

Style:
- If you want to invite follow-ups, address the visitor explicitly (e.g. "If you'd like, ask about Eswar's experience at DXC.").
- Never output HTML (no tags, no attributes like target=_blank). Use plain text only.
- When you include a link, do NOT use brackets or markdown like [text](url). Use a short label followed by the URL on the same line, e.g. "Experience: https://eswarrayavarapu.com/experience"."""


def _create_client():
    """Create OpenAI client; use Ollama if USE_OLLAMA is set (no key, no quota)."""
    if USE_OLLAMA:
        return OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama"), OLLAMA_MODEL
    return OpenAI(), OPENAI_MODEL


class ProfileChatAgent:
    """Chat agent that uses the user's profile as context."""

    def __init__(self, model: str | None = None):
        self.profile = load_profile()
        self.system_prompt = build_system_prompt(self.profile)
        self.client, default_model = _create_client()
        self.model = model or default_model
        self.messages = [
            {"role": "system", "content": self.system_prompt},
        ]

    def chat(self, user_message: str) -> str:
        """Send a message and return the assistant's reply."""
        self.messages.append({"role": "user", "content": user_message})
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
        )
        assistant_message = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": assistant_message})
        return assistant_message

    def chat_stream(self, user_message: str):
        """Stream the assistant's reply chunk by chunk. Yields text chunks; caller must call append_assistant_message(full_text) after."""
        self.messages.append({"role": "user", "content": user_message})
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            stream=True,
        )
        chunks = []
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                chunks.append(text)
                yield text
        full = "".join(chunks)
        self.messages.append({"role": "assistant", "content": full})

    def reset(self) -> None:
        """Clear conversation history (keep system prompt)."""
        self.messages = [
            {"role": "system", "content": self.system_prompt},
        ]

    def chat_with_history(self, history: list[dict], user_message: str) -> str:
        """One-shot reply given conversation history (for stateless API). history = [{"role":"user","content":"..."}, ...]."""
        messages = [{"role": "system", "content": self.system_prompt}]
        for h in history:
            if h.get("role") in ("user", "assistant") and h.get("content"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})
        response = self.client.chat.completions.create(model=self.model, messages=messages)
        return response.choices[0].message.content or ""


def main():
    """Simple CLI loop for testing."""
    if not USE_OLLAMA and not os.getenv("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY in .env, or set USE_OLLAMA=true to use local Ollama.")
        return
    agent = ProfileChatAgent()
    print("Profile-loaded chatbot. Ask about yourself (or type 'quit' to exit).\n")
    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            break
        reply = agent.chat(user_input)
        print(f"Agent: {reply}\n")


if __name__ == "__main__":
    main()
