document.querySelectorAll("[data-interactive-url]").forEach((placeholder) => {
  const button = placeholder.querySelector("button");
  button.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.src = placeholder.dataset.interactiveUrl;
    frame.title = `${placeholder.dataset.interactiveTitle}を遊ぶ`;
    frame.loading = "lazy";
    frame.allow = "autoplay";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.className = "interactive-frame";
    placeholder.replaceWith(frame);
  });
});
