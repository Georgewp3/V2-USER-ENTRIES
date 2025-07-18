// main-firebase.js
// Firebase-based version of your app (no localStorage)
window.addEventListener("DOMContentLoaded", () => {
  // your entire existing code goes here


// --------- FIREBASE REFERENCES ---------
const userSelect = document.getElementById("userSelect");
let userProjects = {};      // { username: projectName }
let userTasks = {};         // { username: [task1, task2] }
let taskLogs = [];          // [ {user, project, task, status, timestamp, comment} ]
let deleteMode = false;
const selectedToDelete = new Set();

// --------- LOAD FROM FIREBASE ---------
db.ref("userProjects").on("value", snapshot => {
  userProjects = snapshot.val() || {};
  refreshUserDropdown();
});

db.ref("userTasks").on("value", snapshot => {
  userTasks = snapshot.val() || {};
});

db.ref("taskLogs").on("value", snapshot => {
  taskLogs = snapshot.val() ? Object.values(snapshot.val()) : [];
  renderLogTable();
  updateSubmittedTaskHints();
});

// --------- DROPDOWNS & UI ---------
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

// --------- SUBMIT ENTRY ---------
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
  const status = statusValue === "COMPLETED" ? "COMPLETED" : "NOT COMPLETED";

  const entry = {
    user,
    project: userProjects[user],
    task,
    status,
    timestamp,
    comment: comment || ""
  };

  const newLogRef = db.ref("taskLogs").push();
  newLogRef.set(entry);

  alert("Entry submitted!");
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

    input.addEventListener("input", () => {
      const updated = input.value.split(",").map(t => t.trim()).filter(t => t);
      userTasks[user] = updated;
      db.ref("userTasks").set(userTasks);
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  });

  updateSubmittedTaskHints();
}

// --------- ADMIN: SHOW SUBMITTED TASKS ---------
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

// --------- ADMIN: ADD USER ---------
document.getElementById("addUserBtn").addEventListener("click", () => {
  const name = document.getElementById("newUserName").value.trim().toUpperCase();
  const project = document.getElementById("newUserProject").value.trim().toUpperCase();

  if (!name || !project) return alert("Please enter both a name and a project.");
  if (userProjects[name]) return alert("This name already exists.");

  userProjects[name] = project;
  userTasks[name] = [];

  db.ref("userProjects").set(userProjects);
  db.ref("userTasks").set(userTasks);

  document.getElementById("newUserName").value = "";
  document.getElementById("newUserProject").value = "";

  alert("User added!");
});

// --------- ADMIN: DELETE USERS ---------
document.getElementById("toggleDeleteMode").addEventListener("click", () => {
  deleteMode = !deleteMode;
  document.getElementById("deleteControls").style.display = deleteMode ? "block" : "none";
  selectedToDelete.clear();
  renderAdminTaskEditor();
});

document.getElementById("confirmDelete").addEventListener("click", () => {
  if (selectedToDelete.size === 0) return alert("Select at least one user.");

  selectedToDelete.forEach(user => {
    delete userProjects[user];
    delete userTasks[user];
  });

  db.ref("userProjects").set(userProjects);
  db.ref("userTasks").set(userTasks);

  selectedToDelete.clear();
  deleteMode = false;
  document.getElementById("deleteControls").style.display = "none";
  renderAdminTaskEditor();
  refreshUserDropdown();
});

// --------- ADMIN: LOG TABLE ---------
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

// --------- BACK TO USER TAB ---------
document.getElementById("backToUserTab").addEventListener("click", () => {
  document.getElementById("tab1").style.display = "block";
  document.getElementById("tab2").style.display = "none";
  document.getElementById("tab3").style.display = "none";
  document.getElementById("adminLoginWrapper").style.display = "block";
});

// --------- UTIL ---------
function formatTimestamp(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

});