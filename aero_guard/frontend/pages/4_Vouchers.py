import streamlit as st
from aero_guard.frontend.common import require_role, sidebar_header
from aero_guard.backend import queries

user = require_role("provider", "manager", "consultant", "helpdesk")
sidebar_header(user)

st.title("\U0001F39F️ Voucher Management")

agencies = queries.list_agencies()

if user["role"] in ("provider", "helpdesk"):
    st.subheader("Issue a voucher")
    with st.form("issue_voucher"):
        c1, c2 = st.columns(2)
        agency_name = c1.selectbox("Agency", agencies["name"].tolist())
        client_name = c2.text_input("Client name")
        c3, c4 = st.columns(2)
        pnr = c3.text_input("PNR")
        amount = c4.number_input("Amount (USD)", min_value=0.0, step=10.0)
        reason = st.selectbox("Reason", ["Flight cancellation", "Schedule change", "ADM goodwill", "Other"])
        submitted = st.form_submit_button("Send voucher")
        if submitted:
            if client_name and pnr and amount > 0:
                agency_id = int(agencies[agencies["name"] == agency_name]["id"].iloc[0])
                queries.issue_voucher(agency_id, client_name, pnr, reason, amount, user["full_name"])
                st.success(f"Voucher sent to {client_name} for ${amount:,.2f}.")
                st.rerun()
            else:
                st.warning("Client name, PNR, and amount are required.")
    agency_id = None
elif user["role"] == "manager":
    agency_id = user["agency_id"]
else:
    agency_id = user["agency_id"]

st.subheader("Voucher history")
vouchers = queries.list_vouchers(agency_id)
if vouchers.empty:
    st.info("No vouchers issued yet.")
else:
    st.dataframe(
        vouchers[["created_at", "agency_name", "client_name", "pnr", "reason", "amount", "issued_by"]],
        use_container_width=True,
        hide_index=True,
    )
