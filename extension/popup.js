document.addEventListener("DOMContentLoaded", () => {
  const contrastToggle = document.getElementById("toggleContrast");
  const dyslexiaToggle = document.getElementById("toggleDyslexia");
  const cataractToggle = document.getElementById("toggleCataract");

  // Load stored settings
  chrome.storage.sync.get(
    ["highContrastEnabled", "dyslexiaEnabled", "cataractEnabled"],
    (data) => {
      contrastToggle.checked = data.highContrastEnabled || false;
      dyslexiaToggle.checked = data.dyslexiaEnabled || false;
      cataractToggle.checked = data.cataractEnabled || false;
    }
  );

  contrastToggle.addEventListener("change", () => {
    const enabled = contrastToggle.checked;
    chrome.storage.sync.set({ highContrastEnabled: enabled });
    toggleCSS(enabled, "high-contrast-style", "style.css");
  });

  dyslexiaToggle.addEventListener("change", () => {
    const enabled = dyslexiaToggle.checked;
    chrome.storage.sync.set({ dyslexiaEnabled: enabled });
    toggleCSS(enabled, "dyslexia-style", "dyslexia.css");
  });

  cataractToggle.addEventListener("change", () => {
    const enabled = cataractToggle.checked;
    chrome.storage.sync.set({ cataractEnabled: enabled });
    toggleCSS(enabled, "cataract-style", "cataract.css");
  });
});

function toggleCSS(enable, id, cssFile) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (enable, id, cssFile) => {
        if (enable) {
          if (!document.getElementById(id)) {
            const link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            link.href = chrome.runtime.getURL(cssFile);
            document.head.appendChild(link);
          }
        } else {
          const existing = document.getElementById(id);
          if (existing) existing.remove();
        }
      },
      args: [enable, id, cssFile],
    });
  });
}
