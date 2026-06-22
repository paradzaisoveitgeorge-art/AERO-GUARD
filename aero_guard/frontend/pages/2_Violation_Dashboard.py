import plotly.express as px
import streamlit as st
from aero_guard.frontend.common import require_role, sidebar_header
from aero_guard.backend import queries

user = require_role("provider", "manager", "consultant", "helpdesk")
sidebar_header(user)

st.title("\U000026A0️ Violation Oversight")

if user["role"] in ("provider", "helpdesk"):
    agencies = queries.list_agencies()
    options = ["All agencies"] + agencies["name"].tolist()
    choice = st.selectbox("Filter by agency", options)
    agency_id = None
    if choice != "All agencies":
        agency_id = int(agencies[agencies["name"] == choice]["id"].iloc[0])
elif user["role"] == "manager":
    agency_id = user["agency_id"]
else:
    agency_id = user["agency_id"]

violations = queries.list_violations(agency_id)

if violations.empty:
    st.info("No violations recorded.")
    st.stop()

if user["role"] == "consultant":
    violations = violations[violations["consultant"] == user["full_name"]]

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total", len(violations))
c2.metric("Open", int((violations["status"] == "open").sum()))
c3.metric("Critical", int((violations["severity"] == "critical").sum()))
c4.metric("Resolved", int((violations["status"] == "resolved").sum()))

cc1, cc2 = st.columns(2)
with cc1:
    fig = px.pie(violations, names="severity", title="By severity", hole=0.4)
    st.plotly_chart(fig, use_container_width=True)
with cc2:
    fig2 = px.bar(violations.groupby("type").size().reset_index(name="count"),
                   x="type", y="count", title="By type")
    st.plotly_chart(fig2, use_container_width=True)

st.subheader("Live violation feed")
for _, row in violations.sort_values("created_at", ascending=False).iterrows():
    badge = {"low": "\U0001F7E2", "medium": "\U0001F7E1", "high": "\U0001F7E0", "critical": "\U0001F534"}[row["severity"]]
    with st.container(border=True):
        c1, c2 = st.columns([5, 2])
        c1.write(f"{badge} **{row['type']}** — PNR `{row['pnr']}` — {row['consultant']} "
                 f"({row.get('agency_name', '')})")
        c1.caption(row["created_at"][:19].replace("T", " "))
        if user["role"] in ("provider", "manager", "helpdesk") and row["status"] != "resolved":
            if c2.button("Mark resolved", key=f"resolve_{row['id']}"):
                queries.update_violation_status(int(row["id"]), "resolved")
                st.rerun()
        else:
            c2.write(f"`{row['status']}`")
