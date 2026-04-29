// Minimal toast utility (no external deps)
export function toast(message, type = 'info', ttl = 4000) {
  try {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.style.position = 'fixed';
      container.style.right = '16px';
      container.style.top = '16px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.textContent = message;
    el.style.marginTop = '8px';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.color = '#fff';
    el.style.fontSize = '14px';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';

    switch (type) {
      case 'success':
        el.style.background = '#16a34a';
        break;
      case 'warning':
        el.style.background = '#f59e0b';
        break;
      case 'error':
        el.style.background = '#ef4444';
        break;
      default:
        el.style.background = '#374151';
    }

    container.appendChild(el);

    setTimeout(() => {
      try {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      } catch (e) {}
    }, ttl);
  } catch (e) {
    // fallback
    // eslint-disable-next-line no-alert
    alert(message);
  }
}
