(function () {
  const button = document.createElement("button");
  button.innerText = "Toggle High Contrast";
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "9999";
  button.style.padding = "10px 14px";
  button.style.backgroundColor = "#222";
  button.style.color = "#fff";
  button.style.border = "2px solid #fff";
  button.style.borderRadius = "4px";
  button.style.cursor = "pointer";
  button.style.fontWeight = "bold";

  document.body.appendChild(button);

  button.addEventListener("click", () => {
    document.body.classList.toggle("high-contrast");
  });
})();
