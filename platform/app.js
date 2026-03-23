const state = {
  manifest: null,
};

const elements = {
  agentSelect: document.querySelector("#agent-select"),
  cloudSelect: document.querySelector("#cloud-select"),
  modelInput: document.querySelector("#model-input"),
  modeSelect: document.querySelector("#mode-select"),
  promptInput: document.querySelector("#prompt-input"),
  runButton: document.querySelector("#run-button"),
  resetButton: document.querySelector("#reset-button"),
  commandPreview: document.querySelector("#command-preview"),
  connectionStatus: document.querySelector("#connection-status"),
  agentRuntime: document.querySelector("#agent-runtime"),
  agentTagline: document.querySelector("#agent-tagline"),
  cloudThesis: document.querySelector("#cloud-thesis"),
  cloudAuth: document.querySelector("#cloud-auth"),
  agentTags: document.querySelector("#agent-tags"),
  stderrOutput: document.querySelector("#stderr-output"),
  stdoutOutput: document.querySelector("#stdout-output"),
  coverageStats: document.querySelector("#coverage-stats"),
  metricCards: document.querySelector("#metric-cards"),
};

function selectedAgent() {
  return state.manifest?.agents.find((agent) => agent.key === elements.agentSelect.value) ?? null;
}

function selectedCloud() {
  return state.manifest?.clouds.find((cloud) => cloud.key === elements.cloudSelect.value) ?? null;
}

function getFormPayload() {
  return {
    agent: elements.agentSelect.value,
    cloud: elements.cloudSelect.value,
    model: elements.modelInput.value.trim(),
    mode: elements.modeSelect.value,
    prompt: elements.promptInput.value.trim(),
  };
}

function renderMetricCards() {
  if (!state.manifest) return;
  const implemented = state.manifest.agents.reduce((sum, agent) => sum + agent.clouds.length, 0);
  const cards = [
    { label: "Implemented pairs", value: implemented },
    { label: "Supported agents", value: state.manifest.agents.length },
    { label: "Supported clouds", value: state.manifest.clouds.length },
  ];

  elements.metricCards.innerHTML = cards
    .map(
      (card) => `
        <div class="metric-card">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
        </div>
      `,
    )
    .join("");
}

function refreshCloudOptions() {
  const agent = selectedAgent();
  if (!agent) return;
  const current = elements.cloudSelect.value;
  const options = state.manifest.clouds.filter((cloud) => agent.clouds.includes(cloud.key));
  elements.cloudSelect.innerHTML = options.map((cloud) => `<option value="${cloud.key}">${cloud.name}</option>`).join("");
  if (options.some((cloud) => cloud.key === current)) {
    elements.cloudSelect.value = current;
  }
}

function renderCoverageStats() {
  const agent = selectedAgent();
  if (!agent) return;
  const cloudNames = state.manifest.clouds.filter((cloud) => agent.clouds.includes(cloud.key)).map((cloud) => cloud.name);
  const items = [
    { label: "Agent", value: agent.name, detail: `${agent.clouds.length} supported clouds` },
    { label: "Featured clouds", value: cloudNames.slice(0, 3).join(", ") || "None", detail: cloudNames.length > 3 ? `+${cloudNames.length - 3} more` : "Fully derived from manifest" },
    { label: "Install", value: agent.install, detail: "Taken from manifest metadata" },
  ];

  elements.coverageStats.innerHTML = items
    .map(
      (item) => `
        <div class="coverage-item">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <p>${item.detail}</p>
        </div>
      `,
    )
    .join("");
}

function renderContext() {
  const agent = selectedAgent();
  const cloud = selectedCloud();
  if (!agent || !cloud) return;

  elements.agentRuntime.textContent = `${agent.runtime} runtime • ${agent.language}`;
  elements.agentTagline.textContent = agent.tagline || agent.description;
  elements.cloudThesis.textContent = `${cloud.name} • ${cloud.description}`;
  elements.cloudAuth.textContent = cloud.auth;
  elements.agentTags.innerHTML = (agent.tags ?? []).map((tag) => `<span class="pill">${tag}</span>`).join("");

  const payload = getFormPayload();
  const segments = ["spawn", payload.agent, payload.cloud];
  if (payload.mode === "preview") {
    segments.push("--dry-run");
  } else {
    segments.push("--output", "json");
  }
  if (payload.prompt) {
    segments.push("--prompt", JSON.stringify(payload.prompt));
  }
  if (payload.model) {
    segments.push("--model", payload.model);
  }
  elements.commandPreview.textContent = segments.join(" ");

  renderCoverageStats();
}

async function loadManifest() {
  const response = await fetch("/api/manifest");
  const manifest = await response.json();
  state.manifest = manifest;

  elements.agentSelect.innerHTML = manifest.agents.map((agent) => `<option value="${agent.key}">${agent.name}</option>`).join("");
  elements.agentSelect.value = manifest.agents[0]?.key ?? "";
  refreshCloudOptions();
  renderMetricCards();
  renderContext();
  elements.connectionStatus.textContent = "Connected to manifest + CLI";
}

async function runWorkflow() {
  const payload = getFormPayload();
  elements.runButton.disabled = true;
  elements.runButton.textContent = payload.mode === "preview" ? "Running preview…" : "Launching…";
  elements.stderrOutput.textContent = "Working…";
  elements.stdoutOutput.textContent = "Working…";

  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  elements.stderrOutput.textContent = data.stderr?.trim() || (data.ok ? "No stderr output." : data.error || "No stderr output.");
  elements.stdoutOutput.textContent = data.result ? JSON.stringify(data.result, null, 2) : data.stdout?.trim() || "No stdout output.";
  elements.runButton.disabled = false;
  elements.runButton.textContent = "Run from browser";
}

function resetForm() {
  elements.modeSelect.value = "preview";
  elements.modelInput.value = "";
  elements.promptInput.value = "";
  elements.stderrOutput.textContent = "No runs yet.";
  elements.stdoutOutput.textContent = "No runs yet.";
  renderContext();
}

elements.agentSelect.addEventListener("change", () => {
  refreshCloudOptions();
  renderContext();
});
elements.cloudSelect.addEventListener("change", renderContext);
elements.modeSelect.addEventListener("change", renderContext);
elements.modelInput.addEventListener("input", renderContext);
elements.promptInput.addEventListener("input", renderContext);
elements.runButton.addEventListener("click", runWorkflow);
elements.resetButton.addEventListener("click", resetForm);

loadManifest().catch((error) => {
  elements.connectionStatus.textContent = "Failed to load manifest";
  elements.stderrOutput.textContent = String(error);
});
