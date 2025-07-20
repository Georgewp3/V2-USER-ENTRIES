// ✅ REPLACEMENT FOR LOCALSTORAGE SYNC — Uses JSONBin.io

const JSONBIN_API_KEY = '$2a$10$NkZY48wVkoE9FwkaTYjt4etR.MMxBsMmQoCJEhAB3z6FVcca61VLu';
const JSONBIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_API_KEY
};
const BIN_IDS = {
  userProjects: '687ce8afd039d559a1689cd2',
  userTasks: '687ce8ccd039d559a1689cdd',
  taskLogs: '687ce8ebee4b395e61f23b4a'
};

let userProjects = {};
let userTasks = {};
let taskLogs = [];
let deleteMode = false;
const selectedToDelete = new Set();

async function fetchBin(binName) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_IDS[binName]}/latest`, {
    headers: JSONBIN_HEADERS
  });
  const data = await res.json();
  return data.record;
}

async function updateBin(binName, data) {
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_IDS[binName]}`, {
    method: 'PUT',
    headers: JSONBIN_HEADERS,
    body: JSON.stringify(data)
  });
}

// -------- INIT + SYNC --------
async function initialize() {
  [userProjects, userTasks, taskLogs] = await Promise.all([
    fetchBin('userProjects'),
    fetchBin('userTasks'),
    fetchBin('taskLogs')
  ]);
  refreshUserDropdown();
  renderAdminTaskEditor();
  renderLogTable();
}
initialize();

// -------- LIVE POLLING --------
setInterval(async () => {
  [userProjects, userTasks, taskLogs] = await Promise.all([
    fetchBin('userProjects'),
    fetchBin('userTasks'),
    fetchBin('taskLogs')
  ]);
  refreshUserDropdown();
  renderAdminTaskEditor();
  renderLogTable();
}, 5000);

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

userSelect.addEventListener("change", () => {
  const selectedUser = userSelect.value;
  document.getElementById("projectName").textContent = userProjects[selectedUser] || "---";

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

document.getElementById("submitEntry").addEventListener("click", async () => {
  const user = userSelect.value;
  const task = document.getElementById("taskSelect").value;
  const statusValue = document.getElementById("statusSelect").value;
  const comment = document.getElementById("commentInput").value.trim();

  if (!user || !task || !statusValue) return alert("Please complete all steps before submitting.");

  const entry = {
    user,
    project: userProjects[user],
    task,
    status: statusValue,
    timestamp: formatTimestamp(new Date()),
    comment: comment || ""
  };
  taskLogs.push(entry);
  await updateBin("taskLogs", taskLogs);
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
  } else {
    alert("Incorrect code.");
  }
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
      const updated = input.value.split(",").map(t => t.trim()).filter(t => t);
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

document.getElementById("addUserBtn").addEventListener("click", async () => {
  const name = document.getElementById("newUserName").value.trim().toUpperCase();
  const project = document.getElementById("newUserProject").value.trim().toUpperCase();
  if (!name || !project) return alert("Please enter both a name and a project.");
  if (userProjects[name]) return alert("This name already exists.");

  userProjects[name] = project;
  userTasks[name] = [];
  await updateBin("userProjects", userProjects);
  await updateBin("userTasks", userTasks);

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
  if (selectedToDelete.size === 0) return alert("Select at least one user to delete.");
  if (!confirm(`Delete ${selectedToDelete.size} user(s)?`)) return;

  selectedToDelete.forEach(user => {
    delete userProjects[user];
    delete userTasks[user];
    taskLogs = taskLogs.filter(entry => entry.user !== user);
  });

  await updateBin("userProjects", userProjects);
  await updateBin("userTasks", userTasks);
  await updateBin("taskLogs", taskLogs);

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

document.getElementById("clearDataBank").addEventListener("click", async () => {
  if (!confirm("Clear all submitted entries?")) return;
  taskLogs = [];
  await updateBin("taskLogs", taskLogs);
  renderLogTable();
  updateSubmittedTaskHints();
});

document.getElementById("backToUserTab").addEventListener("click", () => {
  document.getElementById("tab1").style.display = "block";
  document.getElementById("tab2").style.display = "none";
  document.getElementById("tab3").style.display = "none";
  document.getElementById("adminLoginWrapper").style.display = "block";
});

function updateSubmittedTaskHints() {
  const rows = document.querySelectorAll(".admin-task-row");
  rows.forEach(row => {
    const label = row.querySelector("label");
    const input = row.querySelector("input");
    if (!label || !input) return;
    const user = label.textContent;
    const assignedTasks = input.value.split(",").map(t => t.trim());
    const submitted = taskLogs.filter(e => e.user === user).map(e => e.task);
    const hints = assignedTasks.map(task => submitted.includes(task) ? `${task} ✅` : task);
    if (document.activeElement !== input) input.value = hints.join(", ");
  });
}

function formatTimestamp(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
