const express = require("express");
const cors = require("cors");
const { db, addUser, deleteUser, getUsers, logTask, getLogs } = require("./db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// GET all users
app.get("/users", async (req, res) => {
  const users = await getUsers();
  res.json(users);
});

// POST new user
app.post("/add-user", async (req, res) => {
  const { name, project } = req.body;
  if (!name || !project) return res.status(400).send("Missing data");
  await addUser(name.trim().toUpperCase(), project.trim().toUpperCase());
  res.sendStatus(200);
});

// DELETE user
app.delete("/user/:name", async (req, res) => {
  const name = req.params.name;
  await deleteUser(name.trim().toUpperCase());
  res.sendStatus(200);
});

// POST task submission
app.post("/submit", async (req, res) => {
  const { name, project, task, status, timestamp } = req.body;
  if (!name || !task || !status || !timestamp || !project) {
    return res.status(400).send("Missing fields");
  }
  await logTask({ name, project, task, status, timestamp });
  res.sendStatus(200);
});

// GET task logs
app.get("/logs", async (req, res) => {
  const logs = await getLogs();
  res.json(logs);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
