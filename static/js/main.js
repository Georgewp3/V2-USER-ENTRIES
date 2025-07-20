import {
  fetchUserProjects, saveUserProjects, startPollingUserProjects,
  fetchUserTasks, saveUserTasks, startPollingUserTasks,
  fetchTaskLogs, saveTaskLogs, startPollingTaskLogs
} from './jsonbinSync.js';


const userProjects = {};
const userTasks = {};
const taskLogs = [];

let deleteMode = false;
const selectedToDelete = new Set();

const userSelect = document.getElementById("userSelect");

// Load all data from JSONBin
await fetchUserProjects().then(data => {
  Object.assign(userProjects, data);
  refreshUserDropdown();
});
await fetchUserTasks().then(data => Object.assign(userTasks, data));
await fetchTaskLogs().then(data => {
  taskLogs.push(...data);
  renderLogTable();
});

// Start polling
startPollingUserProjects(data => {
  Object.assign(userProjects, data);
  refreshUserDropdown();
});
startPollingUserTasks(data => {
  Object.assign(userTasks, data);
});
startPollingTaskLogs(data => {
  taskLogs.length = 0;
  taskLogs.push(...data);
  renderLogTable();
});

// Populate dropdown
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

// On user change
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

// Submit Entry
document.getElementById("submitEntry").addEventListener("click", async () => {
  const user = userSelect.value;
  const task = document.getElementById("taskSelect").value;
  const statusValue = document.getElementById("statusSelect").value;
  const comment = document.getElementById("commentInput").value.trim();

  if (!user || !task || !statusValue) {
    alert("Please complete all steps before submitting.");
    return;
  }

  const timestamp = formatTimestamp(new Date());
  const status = statusValue === "COMPLETED" ? "COMPLETED" : "NOT COMPLETED";

  const entry = {
    user,
    project: userProjects[user],
    task,
    status,
    timestamp,
    comment: comment || ""
  };

  taskLogs.push(entry);
  await saveTaskLogs(taskLogs);
  updateSubmittedTaskHints();
  alert("Entry submitted!");

  userSelect.value = "";
  document.getElementById("projectName").textContent = "---";
  document.getElementById("taskSelect").innerHTML = '<option value="">— choose task —</option>';
  document.getElementById("statusSelect").value = "";
  document.getElementById("commentInput").value = "";
});

// Admin Login
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
  } else {
    alert("Incorrect code.");
  }
});

// Admin Task Editor
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
    const currentValue = userTasks[user] ? userTasks[user].join(", ") : "";
    input.value = currentValue;

    input.addEventListener("input", async () => {
      const updated = input.value.split(",").map(t => t.trim());
      userTasks[user] = updated.filter(t => t.length > 0);
      await saveUserTasks(userTasks);
      updateSubmittedTaskHints();
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  });

  updateSubmittedTaskHints();
}

// Hints for submitted tasks
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

    const hints = assignedTasks.map(task => {
      if (submitted.includes(task)) return `${task} ✅`;
      return task;
    });

    if (document.activeElement !== input) {
      input.value = hints.join(", ");
    }
  });
}

// Admin Add User
document.getElementById("addUserBtn").addEventListener("click", async () => {
  const name = document.getElementById("newUserName").value.trim().toUpperCase();
  const project = document.getElementById("newUserProject").value.trim().toUpperCase();

  if (!name || !project) {
    alert("Please enter both a name and a project.");
    return;
  }

  if (userProjects[name]) {
    alert("This name already exists.");
    return;
  }

  userProjects[name] = project;
  userTasks[name] = [];

  await saveUserProjects(userProjects);
  await saveUserTasks(userTasks);

  renderAdminTaskEditor();
  refreshUserDropdown();

  document.getElementById("newUserName").value = "";
  document.getElementById("newUserProject").value = "";
  alert("User added!");
});

// Admin Delete Users
document.getElementById("toggleDeleteMode").addEventListener("click", () => {
  deleteMode = !deleteMode;
  document.getElementById("deleteControls").style.display = deleteMode ? "block" : "none";
  selectedToDelete.clear();
  renderAdminTaskEditor();
});

document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (selectedToDelete.size === 0) {
    alert("Please select at least one user to delete.");
    return;
  }

  const confirmDelete = confirm(`Delete ${selectedToDelete.size} user(s)?`);
  if (!confirmDelete) return;

  selectedToDelete.forEach(user => {
    delete userProjects[user];
    delete userTasks[user];
    for (let i = taskLogs.length - 1; i >= 0; i--) {
      if (taskLogs[i].user === user) taskLogs.splice(i, 1);
    }
  });

  await saveUserProjects(userProjects);
  await saveUserTasks(userTasks);
  await saveTaskLogs(taskLogs);

  selectedToDelete.clear();
  deleteMode = false;
  document.getElementById("deleteControls").style.display = "none";
  renderAdminTaskEditor();
  refreshUserDropdown();
  renderLogTable();
});

// View Log Table
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

// Export CSV
document.getElementById("exportCSV").addEventListener("click", async () => {
  if (taskLogs.length === 0) {
    alert("No entries to export.");
    return;
  }

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

  try {
    const opts = {
      suggestedName: "task-logs.csv",
      types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }]
    };
    const handle = await window.showSaveFilePicker(opts);
    const writable = await handle.createWritable();
    await writable.write(csvContent);
    await writable.close();

    alert("CSV exported and saved successfully.");
  } catch (err) {
    console.error("Export failed:", err);
    alert("Export failed or was cancelled.");
  }
});

// Clear Task Logs
document.getElementById("clearDataBank").addEventListener("click", async () => {
  const confirmClear = confirm("Are you sure you want to clear all submitted entries?");
  if (!confirmClear) return;

  taskLogs.length = 0;
  await saveTaskLogs(taskLogs);
  renderLogTable();
  updateSubmittedTaskHints();
});

// Back to User Tab
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
