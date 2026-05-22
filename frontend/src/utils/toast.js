// Minimal toast utility (no external deps)
export function toast(message, type = 'info', ttl = 4000) {
  try {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.className = 'app-toast-container';
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.textContent = message;
    el.className = `app-toast app-toast--${type}`;

    container.appendChild(el);

    setTimeout(() => {
      try {
        el.classList.add('app-toast--closing');
        setTimeout(() => el.remove(), 300);
      } catch (e) {}
    }, ttl);
  } catch (e) {
    // fallback
    // eslint-disable-next-line no-alert
    alert(message);
  }
}
