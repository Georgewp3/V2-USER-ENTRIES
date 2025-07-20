// jsonbinSync.js

const JSONBIN_API_KEY = '$2a$10$NkZY48wVkoE9FwkaTYjt4etR.MMxBsMmQoCJEhAB3z6FVcca61VLu';

const BIN_USER_PROJECTS = '687ce8afd039d559a1689cd2';
const BIN_USER_TASKS = '687ce8ccd039d559a1689cdd';
const BIN_TASK_LOGS = '687ce8ebee4b395e61f23b4a';

const headers = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_API_KEY
};

// --- userProjects ---
async function fetchUserProjects() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_USER_PROJECTS}/latest`, { headers });
  const json = await res.json();
  return json.record;
}
async function saveUserProjects(data) {
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_USER_PROJECTS}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
}
function startPollingUserProjects(callback) {
  setInterval(async () => {
    try {
      const data = await fetchUserProjects();
      callback(data);
    } catch (err) {
      console.error("Polling userProjects failed:", err);
    }
  }, 5000);
}

// --- userTasks ---
async function fetchUserTasks() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_USER_TASKS}/latest`, { headers });
  const json = await res.json();
  return json.record;
}
async function saveUserTasks(data) {
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_USER_TASKS}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
}
function startPollingUserTasks(callback) {
  setInterval(async () => {
    try {
      const data = await fetchUserTasks();
      callback(data);
    } catch (err) {
      console.error("Polling userTasks failed:", err);
    }
  }, 5000);
}

// --- taskLogs ---
async function fetchTaskLogs() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_TASK_LOGS}/latest`, { headers });
  const json = await res.json();
  return json.record;
}
async function saveTaskLogs(data) {
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_TASK_LOGS}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
}
function startPollingTaskLogs(callback) {
  setInterval(async () => {
    try {
      const data = await fetchTaskLogs();
      callback(data);
    } catch (err) {
      console.error("Polling taskLogs failed:", err);
    }
  }, 5000);
}

export {
  fetchUserProjects, saveUserProjects, startPollingUserProjects,
  fetchUserTasks, saveUserTasks, startPollingUserTasks,
  fetchTaskLogs, saveTaskLogs, startPollingTaskLogs
};
