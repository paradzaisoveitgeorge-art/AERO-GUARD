/*
 * submit-guard.js — one-shot progressive enhancement.
 * Prevents double-submit on any POST form and shows a spinner on the
 * clicked submit button. Loaded on every page (base.html + auth
 * layout + smartpoint). Zero dependencies; safe if run twice.
 */
(function () {
  if (window.__submitGuardInstalled) return;
  window.__submitGuardInstalled = true;

  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    if (!form || form.tagName !== "FORM") return;
    if ((form.method || "").toLowerCase() !== "post") return;
    if (form.dataset.noSubmitGuard === "1") return;

    // Find the button that actually submitted the form.
    var btn = ev.submitter;
    if (!btn) {
      btn = form.querySelector('button[type="submit"], input[type="submit"]');
    }

    // Disable every submit button in the form so a second click is a no-op.
    var buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    buttons.forEach(function (b) {
      b.disabled = true;
      b.classList.add("is-submitting");
      if (b.tagName === "BUTTON" && !b.dataset.originalLabel) {
        b.dataset.originalLabel = b.innerHTML;
        b.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Working…</span>';
      }
    });

    // Safety net — if the page hasn't navigated after 15s (e.g. AJAX
    // form or a validation error swallowed by the server), restore.
    setTimeout(function () {
      buttons.forEach(function (b) {
        b.disabled = false;
        b.classList.remove("is-submitting");
        if (b.dataset.originalLabel) {
          b.innerHTML = b.dataset.originalLabel;
          delete b.dataset.originalLabel;
        }
      });
    }, 15000);
  }, true);
})();
