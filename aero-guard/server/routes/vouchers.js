import { Router } from "express";
import { vouchers } from "../data/seed.js";

const router = Router();
let nextId = vouchers.length + 1;

router.get("/", (req, res) => {
  const { agencyId } = req.query;
  const rows = agencyId ? vouchers.filter((v) => v.agencyId === Number(agencyId)) : vouchers;
  res.json(rows);
});

router.post("/", (req, res) => {
  const { agencyId, clientName, pnr, reason, amount, issuedBy } = req.body;
  if (!agencyId || !clientName || !pnr || !reason || amount == null || !issuedBy) {
    return res.status(400).json({ error: "agencyId, clientName, pnr, reason, amount, issuedBy are required" });
  }
  const voucher = {
    id: nextId++,
    agencyId: Number(agencyId),
    clientName,
    pnr,
    reason,
    amount: Number(amount),
    issuedBy,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  vouchers.push(voucher);
  res.status(201).json(voucher);
});

export default router;
