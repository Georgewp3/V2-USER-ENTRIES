// --------- USER TO PROJECT MAPPING ---------
const userProjects = {
"VASSILIS PAPAGEORGIOU": "IKEA",
  "SAVVAS SARRI": "PUBLIC",
  "NARENDER SINGH": "IKEA",
  "SANDEEP SINGH": "IKEA",
  "LOVEPREET SINGH": "IKEA",
  "RAJINDER KUMAR SABI": "IKEA",
  "GOURAV": "IKEA",
  "RAMANDEEP SINGH ": "IKEA",
  "RAVINDERJIT SINGH": "IKEA",
  "GODDY NGEYOH": "IKEA",
  "BODYLAWSON": "IKEA",
  "DESMOND": "IKEA",
  "MERLIN BASSECK NOAH": "IKEA",
  "JULIE NTOKOU": "IKEA",
  "PARWINDER SINGH ( PIKA )": "IKEA",
  "MBU CHRISTOPHER BATE": "IKEA",
  "LIH ROSTENT": "IKEA",
  "VALENTINOS MELINIOTIS ": "IKEA",
  "ANDREAS K": "IKEA",
  "ELENA YIALLOUROU": "IKEA",
  "MARINA ASPROMALLI": "IKEA",
  "TZENI DIMA": "IKEA",
  "PAILAK TATARIAN": "IKEA",
  "ELENA TOUMAZOU": "IKEA"
};

if (!localStorage.getItem("userProjects")) {
  localStorage.setItem("userProjects", JSON.stringify(userProjects));
}

const userSelect = document.getElementById("userSelect");

const userTasks = {};
if (!localStorage.getItem("userTasks")) {
  Object.keys(userProjects).forEach(user => {
    userTasks[user] = [];
  });
  localStorage.setItem("userTasks", JSON.stringify(userTasks));
}

const taskLogs = [];
let deleteMode = false;
const selectedToDelete = new Set();

// --------- LOAD FROM LOCAL STORAGE ---------
if (localStorage.getItem("userProjects")) {
  Object.assign(userProjects, JSON.parse(localStorage.getItem("userProjects")));
}
if (localStorage.getItem("userTasks")) {
  Object.assign(userTasks, JSON.parse(localStorage.getItem("userTasks")));
}
if (localStorage.getItem("taskLogs")) {
  taskLogs.push(...JSON.parse(localStorage.getItem("taskLogs")));
}

// --------- POPULATE USER DROPDOWN ---------
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
refreshUserDropdown();

// --------- USER SELECTION HANDLER ---------
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

// --------- SUBMIT BUTTON ---------
document.getElementById("submitEntry").addEventListener("click", () => {
  const user = userSelect.value;
  const task = document.getElementById("taskSelect").value;
  const statusValue = document.getElementById("statusSelect").value;
  const comment = document.getElementById("commentInput").value.trim();

  if (!user || !task || !statusValue) {
    alert("Please complete all steps before submitting.");
    return;
  }

  const timestamp = formatTimestamp(new Date());
  const status = statusValue === "COMPLETED" ? `COMPLETED ${timestamp}` : "NOT COMPLETED";

  const entry = {
    user,
    project: userProjects[user],
    task,
    status,
    comment: comment || ""
  };

  taskLogs.push(entry);
  localStorage.setItem("taskLogs", JSON.stringify(taskLogs));
  updateSubmittedTaskHints();
  alert("Entry submitted!");

  // Reset fields
  userSelect.value = "";
  document.getElementById("projectName").textContent = "---";
  document.getElementById("taskSelect").innerHTML = '<option value="">— choose task —</option>';
  document.getElementById("statusSelect").value = "";
  document.getElementById("commentInput").value = "";
});


// --------- ADMIN LOGIN ---------
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

// --------- ADMIN: ASSIGN TASKS ---------
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

    const raw = currentValue.split(",").map(t => t.trim());
    userTasks[user] = raw.filter(t => t.length > 0);
    localStorage.setItem("userTasks", JSON.stringify(userTasks));

    input.addEventListener("input", () => {
      const updated = input.value.split(",").map(t => t.trim());
      userTasks[user] = updated.filter(t => t.length > 0);
      localStorage.setItem("userTasks", JSON.stringify(userTasks));
      updateSubmittedTaskHints();
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  });

  updateSubmittedTaskHints();
}

// --------- ADMIN: SHOW ✅ FOR SUBMITTED TASKS ---------
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

// --------- ADMIN: ADD USER ---------
document.getElementById("addUserBtn").addEventListener("click", () => {
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

  localStorage.setItem("userProjects", JSON.stringify(userProjects));
  localStorage.setItem("userTasks", JSON.stringify(userTasks));

  renderAdminTaskEditor();
  refreshUserDropdown();

  document.getElementById("newUserName").value = "";
  document.getElementById("newUserProject").value = "";
  alert("User added!");
});

// --------- ADMIN: DELETE USERS MODE ---------
document.getElementById("toggleDeleteMode").addEventListener("click", () => {
  deleteMode = !deleteMode;
  document.getElementById("deleteControls").style.display = deleteMode ? "block" : "none";
  selectedToDelete.clear();
  renderAdminTaskEditor();
});

document.getElementById("confirmDelete").addEventListener("click", () => {
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

  localStorage.setItem("userProjects", JSON.stringify(userProjects));
  localStorage.setItem("userTasks", JSON.stringify(userTasks));
  localStorage.setItem("taskLogs", JSON.stringify(taskLogs));

  selectedToDelete.clear();
  deleteMode = false;
  document.getElementById("deleteControls").style.display = "none";
  renderAdminTaskEditor();
  refreshUserDropdown();
  renderLogTable();
});

// --------- ADMIN: VIEW TASK LOGS ---------
function renderLogTable() {
  const tbody = document.querySelector("#logTable tbody");
  tbody.innerHTML = "";

  if (taskLogs.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No entries submitted yet.";
    cell.style.textAlign = "center";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  taskLogs.forEach(entry => {
    const row = document.createElement("tr");
    ["user", "project", "task", "status", "comment"].forEach(field => {
      const td = document.createElement("td");
      td.textContent = entry[field] || "";
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
}

// --------- EXPORT CSV ---------
document.getElementById("exportCSV").addEventListener("click", () => {
  if (taskLogs.length === 0) {
    alert("No entries to export.");
    return;
  }

  const headers = ["User", "Project", "Task", "Status", "Comment"];
const rows = taskLogs.map(log => [log.user, log.project, log.task, log.status, log.comment || ""]);


  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "task-logs.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// --------- CLEAR DATA BANK ---------
document.getElementById("clearDataBank").addEventListener("click", () => {
  const confirmClear = confirm("Are you sure you want to clear all submitted entries?");
  if (!confirmClear) return;

  taskLogs.length = 0;
  localStorage.removeItem("taskLogs");
  renderLogTable();
  updateSubmittedTaskHints();
});

// --------- ADMIN: BACK TO USER TAB ---------
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