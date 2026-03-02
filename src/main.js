import { eosList } from './eos/registry.js';
import { addTab, initTabs } from './ui/tabs.js';
import { createIdealGasPanel, initIdealGasCalculator } from './ui/calculator.js';
import { createEosPanel, initEosPanel } from './ui/eos-calculator.js';
import { createComparePanel, initComparePanel } from './ui/compare-calculator.js';

const tabsNav = document.getElementById('tabs');
const main = document.getElementById('main');

// 1. Compare All tab (default)
addTab(tabsNav, 'compare', 'Compare All', true);
main.appendChild(createComparePanel());

// 2. Ideal Gas tab (special UI)
addTab(tabsNav, 'ideal-gas', 'Ideal Gas', false);
main.appendChild(createIdealGasPanel());

// 3. Individual EOS tabs
for (const eos of eosList) {
  addTab(tabsNav, eos.id, eos.name, false);
  main.appendChild(createEosPanel(eos));
}

// Wire up tab switching
initTabs();

// Wire up calculators
initComparePanel();
initIdealGasCalculator();
for (const eos of eosList) {
  initEosPanel(eos);
}
