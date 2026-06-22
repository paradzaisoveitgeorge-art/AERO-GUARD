from PIL import Image
import streamlit as st
from aero_guard.frontend.common import require_role, sidebar_header
from aero_guard.ocr import passport

user = require_role("consultant", "provider")
sidebar_header(user)

st.title("\U0001F6C2 Passport Upload → GDS PNR")
st.caption("Paste or upload the client's passport photo and click Apply to extract the name into the PNR.")

if not passport.ocr_available():
    st.warning(
        "OCR engine (Tesseract) is not installed on this machine, so this page runs in "
        "manual-confirm mode: upload the photo, then type the name to simulate the PNR write-back."
    )

uploaded = st.file_uploader("Passport photo", type=["png", "jpg", "jpeg"])

if uploaded:
    image = Image.open(uploaded)
    st.image(image, caption="Uploaded passport", width=400)

    if st.button("Apply to PNR"):
        surname, given_names, raw_text = passport.extract_name_from_image(image)
        if surname and given_names:
            st.session_state["extracted_surname"] = surname
            st.session_state["extracted_given"] = given_names
            st.success(f"Extracted: {given_names} {surname}")
        else:
            st.warning("Could not auto-detect the MRZ name line. Please confirm manually below.")

    with st.form("confirm_name"):
        c1, c2 = st.columns(2)
        surname = c1.text_input("Surname", value=st.session_state.get("extracted_surname", ""))
        given_names = c2.text_input("Given name(s)", value=st.session_state.get("extracted_given", ""))
        pnr = st.text_input("PNR")
        confirmed = st.form_submit_button("Write name to PNR")
        if confirmed:
            if surname and given_names and pnr:
                st.success(f"Name {given_names} {surname} added to PNR `{pnr}` ✅ (simulated GDS write-back).")
            else:
                st.warning("Surname, given name(s), and PNR are all required.")
