export type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> | null | undefined;

function append(el: Element, child: Child): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    child.forEach((c) => append(el, c));
    return;
  }
  el.append(child instanceof Node ? child : document.createTextNode(String(child)));
}

function applyProps(el: Element, props: Props): void {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v as Record<string, string>)) {
        if (sk.startsWith('--')) (el as HTMLElement).style.setProperty(sk, sv);
        else ((el as HTMLElement).style as unknown as Record<string, string>)[sk] = sv;
      }
    } else if (k === 'class' || k === 'className') {
      el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v));
    } else if ((k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') && k in el) {
      (el as unknown as Record<string, unknown>)[k] = v;
      if (k === 'disabled' || k === 'selected') el.setAttribute(k, '');
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyProps(el, props);
  children.forEach((c) => append(el, c));
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s<K extends keyof SVGElementTagNameMap>(tag: K, props?: Props, ...children: Child[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props);
  children.forEach((c) => append(el, c));
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function mount(el: Element, ...children: Child[]): void {
  clear(el);
  children.forEach((c) => append(el, c));
}

export function select<T extends string>(
  value: T,
  options: { value: T; label: string; group?: string }[],
  onChange: (v: T) => void,
  props: Props = {},
): HTMLSelectElement {
  const groups = new Map<string, HTMLOptGroupElement>();
  const sel = h('select', { ...props, onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value as T) });
  for (const o of options) {
    const opt = h('option', { value: o.value }, o.label);
    if (o.value === value) opt.selected = true;
    if (o.group) {
      let g = groups.get(o.group);
      if (!g) {
        g = h('optgroup', { label: o.group });
        groups.set(o.group, g);
        sel.append(g);
      }
      g.append(opt);
    } else sel.append(opt);
  }
  return sel;
}

export function field(label: string, control: Element, hint?: string): HTMLElement {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function segmented<T extends string>(value: T, options: { value: T; label: string }[], onChange: (v: T) => void, label?: string): HTMLElement {
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label ?? '' },
    options.map((o) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(o.value === value),
      class: o.value === value ? 'active' : '', onclick: () => onChange(o.value),
    }, o.label)));
}
