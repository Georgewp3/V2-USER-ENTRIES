// ✅ Replace with your own values from JSONBin.io
const JSONBIN_API_KEY = "$2a$10$gyYCEf/u4LV6J3QKxwrnbeSrt2oSAOhGjc2fN9c2OfxhXw9hx6sVq";
const BIN_IDS = {
  userProjects: "687ce8afd039d559a1689cd2",
  userTasks: "687ce8ccd039d559a1689cdd",
  taskLogs: "687ce8ebee4b395e61f23b4a"
};

const HEADERS = {
  "Content-Type": "application/json",
  "X-Master-Key": JSONBIN_API_KEY
};

let userProjects = {};
let userTasks = {};
let taskLogs = [];
let deleteMode = false;
const selectedToDelete = new Set();

// --- 🔁 JSONBin Functions ---
async function fetchBin(bin) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_IDS[bin]}/latest`, {
    headers: HEADERS
  });
  const data = await res.json();
  return data.record || {};
}

async function updateBin(bin, data) {
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_IDS[bin]}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(data)
  });
}

// --- 🔄 Load & Initialize All Data ---
async function loadAllData() {
  userProjects = await fetchBin("userProjects");
  userTasks = await fetchBin("userTasks");
  taskLogs = await fetchBin("taskLogs");

  refreshUserDropdown();
  renderAdminTaskEditor();
  renderLogTable();
}

// --- 🧠 Populate User Dropdown ---
const userSelect = document.getElementById("userSelect");
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

// --- 🧩 User Select Handler ---
userSelect.addEventListener("change", () => {
  const selectedUser = userSelect.value;
  const project = userProjects[selectedUser] || "---";
  document.getElementById("projectName").textContent = project;

  const taskSelect = document.getElementById("taskSelect");
  taskSelect.innerHTML = '<option value="">— choose task —</option>';
  const tasks = userTasks[selectedUser] || [];
  tasks.forEach(task => {
    const opt = document.createElement("option");
    opt.value = task;
    opt.textContent = task;
    taskSelect.appendChild(opt);
  });
});

// --- 📝 Submit Entry ---
document.getElementById("submitEntry").addEventListener("click", async () => {
  const user = userSelect.value;
  const task = document.getElementById("taskSelect").value;
  const status = document.getElementById("statusSelect").value;
  const comment = document.getElementById("commentInput").value.trim();

  if (!user || !task || !status) {
    alert("Please complete all steps before submitting.");
    return;
  }

  const timestamp = formatTimestamp(new Date());

  taskLogs.push({
    user,
    project: userProjects[user],
    task,
    status,
    timestamp,
    comment
  });

  await updateBin("taskLogs", taskLogs);
  await loadAllData();

  // Reset fields
  userSelect.value = "";
  document.getElementById("projectName").textContent = "---";
  document.getElementById("taskSelect").innerHTML = '<option value="">— choose task —</option>';
  document.getElementById("statusSelect").value = "";
  document.getElementById("commentInput").value = "";
  alert("Entry submitted!");
});

// --- 🔐 Admin Login ---
const adminCode = "332133";
document.getElementById("adminLoginToggle").addEventListener("click", () => {
  const prompt = document.getElementById("adminPrompt");
  prompt.style.display = prompt.style.display === "block" ? "none" : "block";
});

document.getElementById("adminSubmit").addEventListener("click", async () => {
  const enteredCode = document.getElementById("adminCode").value;
  if (enteredCode === adminCode) {
    document.getElementById("tab1").style.display = "none";
    document.getElementById("tab2").style.display = "block";
    document.getElementById("tab3").style.display = "block";
    document.getElementById("adminLoginWrapper").style.display = "none";
    await loadAllData();
  } else {
    alert("Incorrect code.");
  }
});

// --- 🛠 Admin Task Editor ---
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
        if (checkbox.checked) selectedToDelete.add(user);
        else selectedToDelete.delete(user);
      });
      row.appendChild(checkbox);
    }

    const label = document.createElement("label");
    label.textContent = user;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter tasks (comma separated)";
    input.value = userTasks[user]?.join(", ") || "";

    input.addEventListener("input", async () => {
      const updated = input.value.split(",").map(t => t.trim()).filter(t => t.length > 0);
      userTasks[user] = updated;
      await updateBin("userTasks", userTasks);
      updateSubmittedTaskHints();
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  });

  updateSubmittedTaskHints();
}

// --- ✅ Mark Submitted Tasks ---
function updateSubmittedTaskHints() {
  const rows = document.querySelectorAll(".admin-task-row");
  rows.forEach(row => {
    const label = row.querySelector("label");
    const input = row.querySelector("input");
    if (!label || !input) return;

    const user = label.textContent;
    const assignedTasks = input.value.split(",").map(t => t.trim());
    const submitted = taskLogs
      .filter(entry => entry.user === user)
      .map(entry => entry.task);

    const hints = assignedTasks.map(task =>
      submitted.includes(task) ? `${task} ✅` : task
    );

    if (document.activeElement !== input) {
      input.value = hints.join(", ");
    }
  });
}

// --- ➕ Add User ---
document.getElementById("addUserBtn").addEventListener("click", async () => {
  const name = document.getElementById("newUserName").value.trim().toUpperCase();
  const project = document.getElementById("newUserProject").value.trim().toUpperCase();

  if (!name || !project) return alert("Please enter both a name and a project.");
  if (userProjects[name]) return alert("This name already exists.");

  userProjects[name] = project;
  userTasks[name] = [];

  await updateBin("userProjects", userProjects);
  await updateBin("userTasks", userTasks);
  await loadAllData();

  document.getElementById("newUserName").value = "";
  document.getElementById("newUserProject").value = "";
  alert("User added!");
});

// --- 🗑 Delete Mode Toggle ---
document.getElementById("toggleDeleteMode").addEventListener("click", () => {
  deleteMode = !deleteMode;
  document.getElementById("deleteControls").style.display = deleteMode ? "block" : "none";
  selectedToDelete.clear();
  renderAdminTaskEditor();
});

// --- ❌ Confirm Delete ---
document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (selectedToDelete.size === 0) return alert("Select at least one user.");

  const confirmDelete = confirm(`Delete ${selectedToDelete.size} user(s)?`);
  if (!confirmDelete) return;

  selectedToDelete.forEach(user => {
    delete userProjects[user];
    delete userTasks[user];
    taskLogs = taskLogs.filter(log => log.user !== user);
  });

  await updateBin("userProjects", userProjects);
  await updateBin("userTasks", userTasks);
  await updateBin("taskLogs", taskLogs);
  await loadAllData();

  selectedToDelete.clear();
  deleteMode = false;
  document.getElementById("deleteControls").style.display = "none";
});

// --- 📋 Render Task Logs Table ---
function renderLogTable() {
  const tbody = document.querySelector("#logTable tbody");
  tbody.innerHTML = "";

  if (!taskLogs.length) {
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

// --- 🧹 Clear Data Bank ---
document.getElementById("clearDataBank").addEventListener("click", async () => {
  const confirmClear = confirm("Are you sure you want to clear all submitted entries?");
  if (!confirmClear) return;

  taskLogs = [];
  await updateBin("taskLogs", []);
  await loadAllData();
});

// --- 📤 Export CSV ---
document.getElementById("exportCSV").addEventListener("click", async () => {
  if (!taskLogs.length) return alert("No entries to export.");

  const headers = ["User", "Project", "Task", "Status", "Timestamp", "Comment"];
  const rows = taskLogs.map(log => [
    log.user,
    log.project,
    log.task,
    log.status,
    log.timestamp || "",
    log.comment || ""
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${(field || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "task-logs.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// --- ⬅️ Back Button ---
document.getElementById("backToUserTab").addEventListener("click", () => {
  document.getElementById("tab1").style.display = "block";
  document.getElementById("tab2").style.display = "none";
  document.getElementById("tab3").style.display = "none";
  document.getElementById("adminLoginWrapper").style.display = "block";
});

// --- 🕓 Timestamp Format ---
function formatTimestamp(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// --- ⏱ Start Polling ---
setInterval(loadAllData, 5000);
window.addEventListener("DOMContentLoaded", loadAllData);
