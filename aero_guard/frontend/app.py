import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st

from aero_guard.backend import db, auth

st.set_page_config(page_title="AERO-GUARD", page_icon="\U0001F6E1️", layout="wide")

db.init_db()

if "user" not in st.session_state:
    st.session_state.user = None


def login_screen():
    col1, col2, col3 = st.columns([1, 1.2, 1])
    with col2:
        st.markdown("## \U0001F6E1️ AERO-GUARD")
        st.caption("Active Revenue Sentinel for travel agencies")
        with st.form("login_form"):
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Sign in", use_container_width=True)
        if submitted:
            user = auth.login(username, password)
            if user:
                st.session_state.user = user
                st.rerun()
            else:
                st.error("Invalid username or password.")

        with st.expander("Demo accounts"):
            st.code(
                "provider / provider123      (Provider HQ)\n"
                "manager1 / manager123       (Agency Manager)\n"
                "helpdesk1 / help123         (Helpdesk)\n"
                "consultant1 / consultant123 (Consultant - Skyline Travel)\n"
                "consultant2 / consultant123 (Consultant - Horizon Voyages)",
                language=None,
            )


def sidebar():
    user = st.session_state.user
    with st.sidebar:
        st.markdown(f"### \U0001F6E1️ AERO-GUARD")
        st.write(f"**{user['full_name']}**")
        st.caption(f"Role: {user['role'].capitalize()}")
        st.divider()
        if st.button("Log out", use_container_width=True):
            st.session_state.user = None
            st.rerun()


if not st.session_state.user:
    login_screen()
else:
    sidebar()
    st.title("Welcome to AERO-GUARD")
    role = st.session_state.user["role"]
    if role in ("provider", "helpdesk"):
        st.info("Use the **Provider Hub** pages in the left sidebar: Agency Provisioning, "
                "Violation Oversight, ADM Audit Suite, Voucher Management, Helpdesk.")
    elif role == "manager":
        st.info("Use the left sidebar to view your agency's Violation Dashboard, ADM Audits, "
                "Vouchers, and Helpdesk chat.")
    else:
        st.info("Use the left sidebar: Violation Alerts, My ADM Dashboard, Passport Upload, Helpdesk.")
