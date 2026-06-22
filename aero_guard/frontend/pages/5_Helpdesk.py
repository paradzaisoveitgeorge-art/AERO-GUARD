import streamlit as st
from aero_guard.frontend.common import require_role, sidebar_header
from aero_guard.backend import queries

user = require_role("provider", "manager", "consultant", "helpdesk")
sidebar_header(user)

st.title("\U0001F4AC Helpdesk")

agencies = queries.list_agencies()

if user["role"] in ("provider", "helpdesk"):
    agency_name = st.selectbox("Conversation with agency", agencies["name"].tolist())
    agency_id = int(agencies[agencies["name"] == agency_name]["id"].iloc[0])
else:
    agency_id = user["agency_id"]
    agency_name = agencies[agencies["id"] == agency_id]["name"].iloc[0]
    st.caption(f"Agency: {agency_name}")

messages = queries.list_messages(agency_id)

chat_box = st.container(height=400, border=True)
with chat_box:
    if messages.empty:
        st.caption("No messages yet — say hello!")
    for _, m in messages.iterrows():
        align = "background-color:#DCF8C6;" if m["sender_role"] in ("provider", "helpdesk") else "background-color:#F1F0F0;"
        st.markdown(
            f"<div style='{align}padding:8px 12px;border-radius:10px;margin:4px 0;max-width:80%;'>"
            f"<b>{m['sender']}</b> <span style='color:gray;font-size:0.75em'>({m['sender_role']})</span><br>{m['message']}"
            f"</div>",
            unsafe_allow_html=True,
        )

with st.form("send_msg", clear_on_submit=True):
    text = st.text_input("Message")
    sent = st.form_submit_button("Send")
    if sent and text.strip():
        queries.send_message(agency_id, user["full_name"], user["role"], text.strip())
        st.rerun()

st.info("\U0001F4F9 Video walkthroughs and call-back requests would be wired up here in a full build.")
