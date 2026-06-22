import { Router } from "express";
import { violations } from "../data/seed.js";

const router = Router();
let nextId = violations.length + 1;

router.get("/", (req, res) => {
  const { agencyId, status, consultant } = req.query;
  let rows = violations;
  if (agencyId) rows = rows.filter((v) => v.agencyId === Number(agencyId));
  if (status) rows = rows.filter((v) => v.status === status);
  if (consultant) rows = rows.filter((v) => v.consultant === consultant);
  res.json(rows);
});

router.post("/", (req, res) => {
  const { agencyId, consultant, pnr, type, severity } = req.body;
  if (!agencyId || !consultant || !pnr || !type || !severity) {
    return res.status(400).json({ error: "agencyId, consultant, pnr, type, severity are required" });
  }
  const violation = {
    id: nextId++,
    agencyId: Number(agencyId),
    consultant,
    pnr,
    type,
    severity,
    status: "open",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  violations.push(violation);
  res.status(201).json(violation);
});

router.patch("/:id", (req, res) => {
  const violation = violations.find((v) => v.id === Number(req.params.id));
  if (!violation) return res.status(404).json({ error: "Violation not found" });
  Object.assign(violation, req.body);
  res.json(violation);
});

export default router;
