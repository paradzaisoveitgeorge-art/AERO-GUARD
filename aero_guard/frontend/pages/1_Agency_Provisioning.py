import streamlit as st
from aero_guard.frontend.common import require_role, sidebar_header
from aero_guard.backend import queries

user = require_role("provider")
sidebar_header(user)

st.title("\U0001F3E2 Agency Provisioning")
st.caption("Onboard, adjust, or offboard agencies/PCCs on the AERO-GUARD platform.")

agencies = queries.list_agencies()

with st.form("add_agency"):
    c1, c2 = st.columns(2)
    name = c1.text_input("Agency name")
    pcc = c2.text_input("PCC")
    submitted = st.form_submit_button("Provision agency")
    if submitted:
        if name and pcc:
            try:
                queries.add_agency(name, pcc)
                st.success(f"Provisioned {name} ({pcc}).")
                st.rerun()
            except Exception as e:
                st.error(f"Could not provision agency: {e}")
        else:
            st.warning("Name and PCC are required.")

st.subheader("Agencies")
if agencies.empty:
    st.info("No agencies yet.")
else:
    for _, row in agencies.iterrows():
        c1, c2, c3, c4 = st.columns([3, 2, 2, 2])
        c1.write(f"**{row['name']}**")
        c2.write(row["pcc"])
        c3.write(f"`{row['status']}`")
        new_status = "suspended" if row["status"] == "active" else "active"
        if c4.button(f"Set {new_status}", key=f"toggle_{row['id']}"):
            queries.set_agency_status(row["id"], new_status)
            st.rerun()
