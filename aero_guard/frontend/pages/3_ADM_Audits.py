import plotly.express as px
import streamlit as st
from aero_guard.frontend.common import require_role, sidebar_header
from aero_guard.backend import queries

user = require_role("provider", "manager", "consultant", "helpdesk")
sidebar_header(user)

st.title("\U0001F4CA ADM Audit Suite")
st.caption("Daily / weekly / monthly ADM statistics, financial losses, and savings.")

if user["role"] in ("provider", "helpdesk"):
    agencies = queries.list_agencies()
    options = ["All agencies"] + agencies["name"].tolist()
    choice = st.selectbox("Filter by agency", options)
    agency_id = None
    if choice != "All agencies":
        agency_id = int(agencies[agencies["name"] == choice]["id"].iloc[0])
else:
    agency_id = user["agency_id"]

period = st.radio("Period", ["Daily", "Weekly", "Monthly"], horizontal=True)

audits = queries.list_adm_audits(agency_id)
if audits.empty:
    st.info("No ADM records.")
    st.stop()

if user["role"] == "consultant":
    audits = audits[audits["consultant"] == user["full_name"]]

audits["created_at"] = audits["created_at"].astype(str)
audits["date"] = audits["created_at"].str[:10]

received = audits[audits["status"] == "received"]
potential = audits[audits["status"] == "potential"]
waived = audits[audits["status"] == "waived"]

c1, c2, c3, c4 = st.columns(4)
c1.metric("ADMs received", len(received))
c2.metric("Amount received", f"${received['amount'].sum():,.2f}")
c3.metric("Potential ADMs", len(potential))
c4.metric("Saved (waived)", f"${waived['amount'].sum():,.2f}")

cc1, cc2 = st.columns(2)
with cc1:
    fig = px.bar(audits.groupby("reason")["amount"].sum().reset_index(),
                 x="reason", y="amount", title="Amount by reason")
    st.plotly_chart(fig, use_container_width=True)
with cc2:
    fig2 = px.line(audits.groupby("date")["amount"].sum().reset_index(),
                    x="date", y="amount", markers=True, title="ADM amount over time")
    st.plotly_chart(fig2, use_container_width=True)

st.subheader("Records")
st.dataframe(
    audits[["created_at", "agency_name", "consultant", "pnr", "reason", "amount", "liable_party", "status"]]
    if "agency_name" in audits.columns
    else audits[["created_at", "consultant", "pnr", "reason", "amount", "liable_party", "status"]],
    use_container_width=True,
    hide_index=True,
)
