export function initTabs() {
  const buttons = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-content');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      buttons.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });
}

export function addTab(container, id, label, isActive) {
  const btn = document.createElement('button');
  btn.className = 'tab' + (isActive ? ' active' : '');
  btn.dataset.tab = id;
  btn.textContent = label;
  container.appendChild(btn);
}
