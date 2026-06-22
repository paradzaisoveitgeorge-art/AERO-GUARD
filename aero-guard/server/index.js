import express from "express";
import cors from "cors";

import agenciesRouter from "./routes/agencies.js";
import violationsRouter from "./routes/violations.js";
import vouchersRouter from "./routes/vouchers.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/agencies", agenciesRouter);
app.use("/api/violations", violationsRouter);
app.use("/api/vouchers", vouchersRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`AERO-GUARD API listening on http://localhost:${PORT}`);
});
