import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st
from aero_guard.backend import db

db.init_db()


def require_role(*allowed_roles):
    """Guard a page: bounce to login if not authenticated / wrong role."""
    user = st.session_state.get("user")
    if not user:
        st.warning("Please log in first.")
        st.page_link("app.py", label="Go to login")
        st.stop()
    if allowed_roles and user["role"] not in allowed_roles:
        st.error("You do not have access to this page.")
        st.stop()
    return user


def sidebar_header(user):
    with st.sidebar:
        st.markdown("### \U0001F6E1️ AERO-GUARD")
        st.write(f"**{user['full_name']}**")
        st.caption(f"Role: {user['role'].capitalize()}")
        st.divider()
        if st.button("Log out", use_container_width=True, key="logout_sidebar"):
            st.session_state.user = None
            st.rerun()
