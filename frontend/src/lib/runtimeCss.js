// Purpose: Ham tien ich thuan, dung chung cho tinh toan layout, sinh ghe hoac className.
const cache = new Map();
let sheet;
let counter = 0;

const unitless = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
]);

function getSheet() {
  if (sheet || typeof document === 'undefined') return sheet;
  const el = document.createElement('style');
  el.id = 'ticketrush-runtime-css';
  document.head.appendChild(el);
  sheet = el.sheet;
  return sheet;
}

function hyphenate(prop) {
  if (prop.startsWith('--')) return prop;
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function normalizeValue(prop, value) {
  if (value == null || typeof value === 'boolean') return null;
  if (typeof value === 'number' && value !== 0 && !unitless.has(prop)) return `${value}px`;
  return String(value);
}

function serialize(styles) {
  if (!styles || typeof styles !== 'object') return '';
  return Object.entries(styles)
    .map(([prop, value]) => {
      const normalized = normalizeValue(prop, value);
      return normalized == null ? '' : `${hyphenate(prop)}:${normalized}`;
    })
    .filter(Boolean)
    .join(';');
}

export function css(styles, scope = 'x') {
  const body = serialize(styles);
  if (!body) return '';
  const key = `${scope}|${body}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const className = `rt-${scope.replace(/[^a-zA-Z0-9_-]/g, '')}-${counter++}`;
  cache.set(key, className);

  const targetSheet = getSheet();
  if (targetSheet) {
    targetSheet.insertRule(`.${className}{${body}}`, targetSheet.cssRules.length);
  }

  return className;
}

export function cx(...values) {
  return values.flat(Infinity).filter(Boolean).join(' ');
}

export function setNodeCss(node, styles, group = 'default') {
  if (!node) return;
  const key = `runtimeCss${group.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const previous = node.dataset?.[key];
  if (previous) node.classList.remove(previous);

  const next = css(styles, `node-${group}`);
  if (next) {
    node.classList.add(next);
    if (node.dataset) node.dataset[key] = next;
  } else if (node.dataset) {
    delete node.dataset[key];
  }
}

export function clearNodeCss(node, group = 'default') {
  if (!node?.dataset) return;
  const key = `runtimeCss${group.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const previous = node.dataset[key];
  if (previous) node.classList.remove(previous);
  delete node.dataset[key];
}
