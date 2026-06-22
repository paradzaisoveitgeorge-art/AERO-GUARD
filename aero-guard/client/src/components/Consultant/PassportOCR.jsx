import { useState } from "react";

export default function PassportOCR() {
  const [fileName, setFileName] = useState(null);
  const [extracted, setExtracted] = useState(null);

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // Placeholder until the OCR endpoint is wired up — mimics the Streamlit prototype's mock output.
    setExtracted({
      surname: "DOE",
      givenNames: "JANE",
      passportNumber: "P1234567",
      nationality: "KEN",
      dob: "1990-04-12",
      expiry: "2030-04-11",
    });
  }

  return (
    <div className="page">
      <h1>Passport to PNR Tool</h1>
      <input type="file" accept="image/*,.pdf" onChange={handleUpload} />
      {fileName && <p>Uploaded: {fileName}</p>}
      {extracted && (
        <table className="data-table">
          <tbody>
            {Object.entries(extracted).map(([key, value]) => (
              <tr key={key}>
                <th>{key}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
