// This file is used to render a preview of the screenshot in a webview panel

// @ts-ignore
const vscode = acquireVsCodeApi();

// @ts-ignore
document.addEventListener("DOMContentLoaded", () => {
  // @ts-ignore
  const container = document.getElementById("screenshot-container");

  // Listen for messages from the extension
  // @ts-ignore
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "setImage":
        container.innerHTML = "";
        // @ts-ignore
        const img = document.createElement("img");
        img.src = `data:image/${message.format};base64,${message.data}`;
        img.style.maxWidth = "100%";
        container.appendChild(img);
        break;
    }
  });

  // UI controls for saving
  // @ts-ignore
  document.getElementById("save-button").addEventListener("click", () => {
    vscode.postMessage({
      command: "save",
    });
  });
});
