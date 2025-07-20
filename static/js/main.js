// --------- CONFIG ---------
const JSONBIN_API_KEY = "$2a$10$XRFIhmwbxyCpAoNFeje3Pu.b.MdVr5wCppVsnkkmE95htQIlX.AzW";
const BIN_IDS = {
  userProjects: "687d09082244182a496060b2",
  userTasks: "687d08f22244182a496060ad",
  taskLogs: "687d08ddd039d559a168afc1"
};
const BIN_URL = (id) => `https://api.jsonbin.io/v3/b/${id}`;
const HEADERS = {
  "Content-Type": "application/json",
  "X-Master-Key": JSONBIN_API_KEY
};
const POLL_INTERVAL = 5000;
const ORIGINAL_USERS = [
  "VASSILIS PAPAGEORGIOU", "SAVVAS SARRI", "NARENDER SINGH", "SANDEEP SINGH", "LOVEPREET SINGH",
  "RAJINDER KUMAR SABI", "GOURAV", "RAMANDEEP SINGH ", "RAVINDERJIT SINGH", "GODDY NGEYOH",
  "BODYLAWSON", "DESMOND", "MERLIN BASSECK NOAH", "JULIE NTOKOU", "PARWINDER SINGH ( PIKA )",
  "MBU CHRISTOPHER BATE", "LIH ROSTENT", "VALENTINOS MELINIOTIS ", "ANDREAS K",
  "ELENA YIALLOUROU", "MARINA ASPROMALLI", "TZENI DIMA", "PAILAK TATARIAN", "ELENA TOUMAZOU"
];

let userProjects = {};
let userTasks = {};
let taskLogs = [];
let deleteMode = false;
const selectedToDelete = new Set();

const userSelect = document.getElementById("userSelect");

async function fetchBin(binId) {
  const res = await fetch(BIN_URL(binId) + "/latest", { headers: HEADERS });
  const data = await res.json();
  return data.record;
}

async function updateBin(binId, data) {
  await fetch(BIN_URL(binId), {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(data)
  });
}

let prevHashes = { projects: "", tasks: "", logs: "" };



async function syncAll() {
  const newProjects = await fetchBin(BIN_IDS.userProjects);
  const newTasks = await fetchBin(BIN_IDS.userTasks);
  const newLogs = await fetchBin(BIN_IDS.taskLogs);

  const projHash = JSON.stringify(newProjects);
  const taskHash = JSON.stringify(newTasks);
  const logHash = JSON.stringify(newLogs);

  if (projHash !== prevHashes.projects) {
    userProjects = newProjects;
    refreshUserDropdown();
    prevHashes.projects = projHash;
  }
  if (taskHash !== prevHashes.tasks) {
    userTasks = newTasks;
    updateSubmittedTaskHints();
    prevHashes.tasks = taskHash;
  }
  if (logHash !== prevHashes.logs) {
    taskLogs = newLogs;
    renderLogTable();
    updateSubmittedTaskHints();
    prevHashes.logs = logHash;
  }
}


setInterval(syncAll, POLL_INTERVAL);
syncAll();

function refreshUserDropdown() {
  const currentValue = userSelect.value;
  userSelect.innerHTML = '<option value="">— choose user —</option>';
  Object.keys(userProjects).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    userSelect.appendChild(opt);
  });
  userSelect.value = currentValue;
}

userSelect.addEventListener("change", () => {
  const selectedUser = userSelect.value;
  document.getElementById("projectName").textContent = userProjects[selectedUser] || "---";
  const taskSelect = document.getElementById("taskSelect");
  taskSelect.innerHTML = '<option value="">— choose task —</option>';
  (userTasks[selectedUser] || []).forEach(task => {
    const opt = document.createElement("option");
    opt.value = task;
    opt.textContent = task;
    taskSelect.appendChild(opt);
  });
});

document.getElementById("submitEntry").addEventListener("click", async () => {
  const user = userSelect.value;
  const task = document.getElementById("taskSelect").value;
  const statusValue = document.getElementById("statusSelect").value;
  const comment = document.getElementById("commentInput").value.trim();
  if (!user || !task || !statusValue) return alert("Please complete all steps before submitting.");
  const timestamp = formatTimestamp(new Date());
  const status = statusValue === "COMPLETED" ? "COMPLETED" : "NOT COMPLETED";
  const entry = { user, project: userProjects[user], task, status, timestamp, comment: comment || "" };
  taskLogs.push(entry);
  await updateBin(BIN_IDS.taskLogs, taskLogs);
  updateSubmittedTaskHints();
  alert("Entry submitted!");
  userSelect.value = "";
  document.getElementById("projectName").textContent = "---";
  document.getElementById("taskSelect").innerHTML = '<option value="">— choose task —</option>';
  document.getElementById("statusSelect").value = "";
  document.getElementById("commentInput").value = "";
});

const adminCode = "332133";
document.getElementById("adminLoginToggle").addEventListener("click", () => {
  const prompt = document.getElementById("adminPrompt");
  prompt.style.display = prompt.style.display === "block" ? "none" : "block";
});
document.getElementById("adminSubmit").addEventListener("click", () => {
  const enteredCode = document.getElementById("adminCode").value;
  if (enteredCode === adminCode) {
    document.getElementById("tab1").style.display = "none";
    document.getElementById("tab2").style.display = "block";
    document.getElementById("tab3").style.display = "block";
    document.getElementById("adminLoginWrapper").style.display = "none";
    renderAdminTaskEditor();
    renderLogTable();
  } else alert("Incorrect code.");
});

function renderAdminTaskEditor() {
  const container = document.getElementById("adminTaskContainer");
  container.innerHTML = "";
  Object.keys(userProjects).forEach(user => {
    const row = document.createElement("div");
    row.className = "admin-task-row";
    if (deleteMode) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "admin-task-checkbox";
      checkbox.addEventListener("change", () => {
        checkbox.checked ? selectedToDelete.add(user) : selectedToDelete.delete(user);
      });
      if (!ORIGINAL_USERS.includes(user)) row.appendChild(checkbox);
    }
    const label = document.createElement("label");
    label.textContent = user;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter tasks (comma separated)";
    if (userTasks[user] && userTasks[user].length > 0) {
  input.value = userTasks[user].join(", ");
}

    input.addEventListener("input", async () => {
      const updated = input.value.split(",").map(t => t.trim()).filter(t => t);
      userTasks[user] = updated;
      await updateBin(BIN_IDS.userTasks, userTasks);
      updateSubmittedTaskHints();
    });
    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  });
  updateSubmittedTaskHints();
}

function updateSubmittedTaskHints() {
  const rows = document.querySelectorAll(".admin-task-row");
  rows.forEach(row => {
    const label = row.querySelector("label");
    const input = row.querySelector("input");
    if (!label || !input) return;
    const user = label.textContent;
    const assignedTasks = input.value.split(",").map(t => t.trim());
    const submitted = taskLogs.filter(entry => entry.user === user).map(entry => entry.task);
    const hints = assignedTasks.map(task => submitted.includes(task) ? `${task} ✅` : task);
    if (document.activeElement !== input) input.value = hints.join(", ");
  });
}

document.getElementById("addUserBtn").addEventListener("click", async () => {
  const name = document.getElementById("newUserName").value.trim().toUpperCase();
  const project = document.getElementById("newUserProject").value.trim().toUpperCase();
  if (!name || !project) return alert("Please enter both a name and a project.");
  if (userProjects[name]) return alert("This name already exists.");
  userProjects[name] = project;
  userTasks[name] = [];
  await updateBin(BIN_IDS.userProjects, userProjects);
  await updateBin(BIN_IDS.userTasks, userTasks);
  renderAdminTaskEditor();
  refreshUserDropdown();
  document.getElementById("newUserName").value = "";
  document.getElementById("newUserProject").value = "";
  alert("User added!");
});

document.getElementById("toggleDeleteMode").addEventListener("click", () => {
  deleteMode = !deleteMode;
  document.getElementById("deleteControls").style.display = deleteMode ? "block" : "none";
  selectedToDelete.clear();
  renderAdminTaskEditor();
});

document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (selectedToDelete.size === 0) return alert("Please select at least one user to delete.");
  const confirmDelete = confirm(`Delete ${selectedToDelete.size} user(s)?`);
  if (!confirmDelete) return;
  selectedToDelete.forEach(user => {
    if (!ORIGINAL_USERS.includes(user)) {
      delete userProjects[user];
      delete userTasks[user];
      for (let i = taskLogs.length - 1; i >= 0; i--) {
        if (taskLogs[i].user === user) taskLogs.splice(i, 1);
      }
    }
  });
  await updateBin(BIN_IDS.userProjects, userProjects);
  await updateBin(BIN_IDS.userTasks, userTasks);
  await updateBin(BIN_IDS.taskLogs, taskLogs);
  selectedToDelete.clear();
  deleteMode = false;
  document.getElementById("deleteControls").style.display = "none";
  renderAdminTaskEditor();
  refreshUserDropdown();
  renderLogTable();
});

function renderLogTable() {
  const tbody = document.querySelector("#logTable tbody");
  tbody.innerHTML = "";
  if (taskLogs.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No entries submitted yet.";
    cell.style.textAlign = "center";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  taskLogs.forEach(entry => {
    const row = document.createElement("tr");
    ["user", "project", "task", "status", "timestamp", "comment"].forEach(field => {
      const td = document.createElement("td");
      td.textContent = entry[field] || "";
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
}

document.getElementById("exportCSV").addEventListener("click", async () => {
  if (taskLogs.length === 0) return alert("No entries to export.");
  const headers = ["User", "Project", "Task", "Status", "Timestamp", "Comment"];
  const rows = taskLogs.map(log => [log.user, log.project, log.task, log.status, log.timestamp, log.comment]);
  const csvContent = [headers, ...rows].map(row => row.map(f => `"${(f || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  try {
    const opts = { suggestedName: "task-logs.csv", types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }] };
    const fileHandle = await window.showSaveFilePicker(opts);
    const writable = await fileHandle.createWritable();
    await writable.write(csvContent);
    await writable.close();
    alert("CSV exported and saved successfully.");
  } catch (err) {
    console.error("Export failed:", err);
    alert("Export failed or was cancelled.");
  }
});

document.getElementById("clearDataBank").addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear all submitted entries?")) return;
  taskLogs = [];
  await updateBin(BIN_IDS.taskLogs, taskLogs);
  renderLogTable();
  updateSubmittedTaskHints();
});

document.getElementById("backToUserTab").addEventListener("click", () => {
  document.getElementById("tab1").style.display = "block";
  document.getElementById("tab2").style.display = "none";
  document.getElementById("tab3").style.display = "none";
  document.getElementById("adminLoginWrapper").style.display = "block";
});

function formatTimestamp(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
