import { Router } from "express";
import { agencies } from "../data/seed.js";

const router = Router();
let nextId = agencies.length + 1;

router.get("/", (req, res) => {
  res.json(agencies);
});

router.get("/:id", (req, res) => {
  const agency = agencies.find((a) => a.id === Number(req.params.id));
  if (!agency) return res.status(404).json({ error: "Agency not found" });
  res.json(agency);
});

router.post("/", (req, res) => {
  const { name, pcc } = req.body;
  if (!name || !pcc) return res.status(400).json({ error: "name and pcc are required" });
  const agency = { id: nextId++, name, pcc, status: "active", createdAt: new Date().toISOString().slice(0, 10) };
  agencies.push(agency);
  res.status(201).json(agency);
});

router.patch("/:id", (req, res) => {
  const agency = agencies.find((a) => a.id === Number(req.params.id));
  if (!agency) return res.status(404).json({ error: "Agency not found" });
  Object.assign(agency, req.body);
  res.json(agency);
});

router.delete("/:id", (req, res) => {
  const index = agencies.findIndex((a) => a.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Agency not found" });
  agencies.splice(index, 1);
  res.status(204).end();
});

export default router;
