"""
Streamlit web UI for the profile-based AI chatbot.
Run: streamlit run app.py
"""
import os
import streamlit as st
from openai import AuthenticationError, RateLimitError

from agent import ProfileChatAgent, load_profile, USE_OLLAMA

st.set_page_config(
    page_title="Profile AI Chatbot",
    page_icon="💬",
    layout="centered",
)

# Custom style for a clean chat UI
st.markdown("""
<style>
    .stChatMessage { padding: 1rem; }
    [data-testid="stChatMessage"] { border-radius: 12px; }
    .profile-badge { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        color: white; 
        padding: 0.5rem 1rem; 
        border-radius: 8px; 
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)


def main():
    if not USE_OLLAMA and not os.getenv("OPENAI_API_KEY"):
        st.error("Set **OPENAI_API_KEY** in a `.env` file, or use **Ollama** (free, local).")
        st.info(
            "**Option 1:** Add your OpenAI key to `.env`.\n\n"
            "**Option 2:** Use Ollama (no key or quota): add `USE_OLLAMA=true` to `.env`, "
            "install [Ollama](https://ollama.com), then run `ollama run llama3.2` in a terminal."
        )
        return

    try:
        profile = load_profile()
        name = profile.get("name", "User")
    except FileNotFoundError as e:
        st.error(str(e))
        return

    backend = "Ollama (local)" if USE_OLLAMA else "OpenAI"
    st.title("💬 Profile AI Chatbot")
    st.markdown(
        f'<div class="profile-badge">Chatting as **{name}** — Ask anything about your profile · Using {backend}</div>',
        unsafe_allow_html=True,
    )

    if "agent" not in st.session_state:
        st.session_state.agent = ProfileChatAgent()
    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask about your profile..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            try:
                # Stream response so it appears as it's generated (feels much faster)
                response = st.write_stream(st.session_state.agent.chat_stream(prompt))
                if response:
                    st.session_state.messages.append({"role": "assistant", "content": response})
            except RateLimitError:
                st.error(
                    "**OpenAI quota exceeded.** Add billing at [platform.openai.com](https://platform.openai.com/account/billing), "
                    "or switch to **Ollama**: set `USE_OLLAMA=true` in `.env`, install Ollama, run `ollama run llama3.2`, then restart this app."
                )
            except AuthenticationError:
                st.error(
                    "**Invalid OpenAI API key.** Check your key in `.env`, or use **Ollama**: set `USE_OLLAMA=true` in `.env`."
                )

    if st.session_state.messages:
        st.divider()
        if st.button("Clear chat"):
            st.session_state.agent.reset()
            st.session_state.messages = []
            st.rerun()


if __name__ == "__main__":
    main()
