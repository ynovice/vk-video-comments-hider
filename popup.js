const toggle = document.getElementById("toggle");

browser.storage.local.get({ hideComments: true }).then(({ hideComments }) => {
  toggle.checked = hideComments;
});

toggle.addEventListener("change", () => {
  browser.storage.local.set({ hideComments: toggle.checked });
});
