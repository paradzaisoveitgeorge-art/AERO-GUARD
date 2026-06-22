"""Passport MRZ -> name extraction for the 'paste photo, click apply' feature.

Tries pytesseract OCR; falls back to a manual-entry friendly stub if
Tesseract isn't installed on the machine, so the rest of the prototype
still works without the native binary.
"""
import re
from PIL import Image

try:
    import pytesseract
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False


def ocr_available() -> bool:
    if not _OCR_AVAILABLE:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def extract_name_from_image(image: Image.Image):
    """Returns (surname, given_names, raw_text) parsed from a passport MRZ line."""
    if not ocr_available():
        return None, None, "(OCR engine not installed on this machine)"

    text = pytesseract.image_to_string(image)
    mrz_line = _find_mrz_line(text)
    if not mrz_line:
        return None, None, text

    surname, given_names = _parse_mrz_names(mrz_line)
    return surname, given_names, text


def _find_mrz_line(text: str):
    for line in text.splitlines():
        cleaned = line.strip().replace(" ", "")
        if cleaned.startswith("P<") and "<<" in cleaned:
            return cleaned
    return None


def _parse_mrz_names(mrz_line: str):
    # Format: P<ISSCOUNTRY<SURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<<<<
    body = mrz_line.split("<", 2)[-1] if mrz_line.startswith("P<") else mrz_line
    match = re.match(r"^[A-Z]{3}([A-Z<]+)<<([A-Z<]+)", mrz_line.replace("P<", "", 1))
    if not match:
        return None, None
    surname = match.group(1).replace("<", " ").strip()
    given_names = match.group(2).replace("<", " ").strip()
    return surname, given_names
