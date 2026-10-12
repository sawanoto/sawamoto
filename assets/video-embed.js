"use strict";

for (const button of document.querySelectorAll(".video-activate")) {
  button.addEventListener("click", () => {
    const id = button.dataset.youtubeId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${id}`;
    frame.title = button.dataset.videoTitle;
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    button.parentElement.replaceChildren(frame);
  });
}
