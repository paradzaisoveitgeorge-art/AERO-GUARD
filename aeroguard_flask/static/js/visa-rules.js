// Shared visa-requirement dataset — used by the #AG Smart Button (Visa tab)
// and the Agency Portal's quick-check widget. Keyed "NATIONALITY>DESTINATION";
// unknown pairings fall back to "confirm with embassy" so no flow dead-ends.
const VISA_RULES = {
  "ZWE>GBR": { status: "required", label: "Visa required", detail: "Standard Visitor visa must be obtained before travel. Apply online; biometrics at VFS." },
  "ZWE>ZAF": { status: "free", label: "Visa-free", detail: "Up to 90 days visa-free for Zimbabwean passport holders." },
  "ZWE>ARE": { status: "voa", label: "Visa on arrival / e-visa", detail: "30-day e-visa available; sponsor or hotel booking may be requested." },
  "ZWE>USA": { status: "required", label: "Visa required", detail: "B1/B2 visa required. In-person interview at US Embassy Harare." },
  "ZWE>KEN": { status: "eta", label: "eTA required", detail: "Electronic Travel Authorisation required before boarding (East Africa)." },
  "ZAF>GBR": { status: "free", label: "Visa-free", detail: "Up to 6 months visa-free for South African passport holders." },
  "GBR>USA": { status: "eta", label: "ESTA required", detail: "Visa Waiver Program — ESTA authorisation required before travel." },
  "NGA>GBR": { status: "required", label: "Visa required", detail: "Standard Visitor visa required. Proof of funds and return ticket needed." },
  "IND>ARE": { status: "voa", label: "Visa on arrival / e-visa", detail: "14/30/90-day e-visa options available for Indian nationals." },
};

function visaRuleFor(nat, dest) {
  if (nat === dest) {
    return { status: "free", label: "Domestic / same country", detail: "No visa required — origin and destination nationality match." };
  }
  return VISA_RULES[nat + ">" + dest] || {
    status: "check",
    label: "Confirm with embassy",
    detail: "No cached rule for this pairing. Verify with the destination embassy or IATA Timatic before ticketing.",
  };
}
