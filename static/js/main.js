const API = "http://localhost:3000"; // your backend base URL


// --------- USER TO PROJECT MAPPING ---------
const userProjects = {};




const userSelect = document.getElementById("userSelect");

async function fetchUsersFromBackend() {
  try {
    const res = await fetch(`${API}/users`);
    const users = await res.json();

    Object.keys(userProjects).forEach(k => delete userProjects[k]); // clear

    users.forEach(user => {
      userProjects[user.name] = user.project;
      if (!userTasks[user.name]) userTasks[user.name] = [];
    });

    refreshUserDropdown();
    renderAdminTaskEditor();

  } catch (err) {
    console.error("Failed to load users:", err);
  }
}


const userTasks = {};
const taskLogs = [];
let deleteMode = false;
const selectedToDelete = new Set();


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
document.getElementById("submitEntry").addEventListener("click", async () => {
  const user = userSelect.value;
  const task = document.getElementById("taskSelect").value;
  const statusValue = document.getElementById("statusSelect").value;

  if (!user || !task || !statusValue) {
    alert("Please complete all steps before submitting.");
    return;
  }

  const timestamp = formatTimestamp(new Date());
  const status = statusValue === "COMPLETED" ? `COMPLETED ${timestamp}` : "NOT COMPLETED";
  const project = userProjects[user];

  try {
    const res = await fetch(`${API}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user, project, task, status, timestamp })
    });

    if (!res.ok) throw new Error("Submission failed");

    alert("Entry submitted!");

    userSelect.value = "";
    document.getElementById("projectName").textContent = "---";
    document.getElementById("taskSelect").innerHTML = '<option value="">— choose task —</option>';
    document.getElementById("statusSelect").value = "";

    fetchTaskLogs(); // refresh the logs from DB
    updateSubmittedTaskHints(); // update ✅ display

  } catch (err) {
    console.error(err);
    alert("An error occurred while submitting the entry.");
  }
});

// --------- ADMIN LOGIN ---------
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

  await fetchUsersFromBackend();  // ✅ wait for users to load
  await fetchTaskLogs();          // ✅ wait for logs
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

  const res = await fetch(`${API}/add-user`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, project })
});

if (res.ok) {
  alert("User added!");
  document.getElementById("newUserName").value = "";
  document.getElementById("newUserProject").value = "";
  fetchUsersFromBackend();
} else {
  alert("Failed to add user.");
}

  

  document.getElementById("newUserName").value = "";
  document.getElementById("newUserProject").value = "";
 
});

// --------- ADMIN: DELETE USERS MODE ---------
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

  for (let user of selectedToDelete) {
  await fetch(`${API}/user/${encodeURIComponent(user)}`, {
    method: "DELETE"
  });
}
selectedToDelete.clear();
deleteMode = false;
document.getElementById("deleteControls").style.display = "none";

fetchUsersFromBackend();
fetchTaskLogs();


 

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
    ["user", "project", "task", "status"].forEach(field => {
      const td = document.createElement("td");
      td.textContent = entry[field];
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
}

async function fetchTaskLogs() {
  try {
    const res = await fetch(`${API}/logs`);
    const logs = await res.json();
    taskLogs.length = 0;
    taskLogs.push(...logs);
    renderLogTable();
    updateSubmittedTaskHints();
  } catch (err) {
    console.error("Failed to load logs:", err);
  }
}


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



