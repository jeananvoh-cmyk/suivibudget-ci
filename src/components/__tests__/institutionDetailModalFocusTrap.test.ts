import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isElementEffectivelyVisible,
  getModalFocusableElements,
  handleModalKeyDown,
  manageModalFocusLifecycle,
} from '../InstitutionDetailModal';

// Helper to create simulated DOM elements with realistic attribute, style, classList and ancestor hierarchies
interface MockElementOptions {
  id?: string;
  tagName?: string;
  href?: string;
  disabled?: boolean;
  tabindex?: number;
  hidden?: boolean;
  inert?: boolean;
  ariaHidden?: boolean;
  className?: string;
  styleDisplay?: string;
  styleVisibility?: string;
  checkVisibilityFn?: () => boolean;
}

function createMockElement(options: MockElementOptions = {}): HTMLElement {
  const {
    id = 'mock-el',
    tagName = 'BUTTON',
    href,
    disabled = false,
    tabindex,
    hidden = false,
    inert = false,
    ariaHidden = false,
    className = '',
    styleDisplay,
    styleVisibility,
    checkVisibilityFn,
  } = options;

  const attributes: Record<string, string> = {};
  if (disabled) attributes['disabled'] = '';
  if (hidden) attributes['hidden'] = '';
  if (inert) attributes['inert'] = '';
  if (ariaHidden) attributes['aria-hidden'] = 'true';
  if (tabindex !== undefined) attributes['tabindex'] = String(tabindex);
  if (href) attributes['href'] = href;

  const classSet = new Set(className.split(/\s+/).filter(Boolean));
  const styleObj: Record<string, string> = {};
  if (styleDisplay) styleObj['display'] = styleDisplay;
  if (styleVisibility) styleObj['visibility'] = styleVisibility;

  const children: HTMLElement[] = [];

  const el: Partial<HTMLElement & HTMLButtonElement> & {
    _focused: boolean;
    _children: HTMLElement[];
  } = {
    id,
    tagName: tagName.toUpperCase(),
    hidden,
    inert,
    disabled,
    _focused: false,
    _children: children,
    parentElement: null,
    className,
    classList: {
      contains: (cls: string) => classSet.has(cls),
      add: (cls: string) => { classSet.add(cls); },
      remove: (cls: string) => { classSet.delete(cls); },
      toggle: (cls: string) => {
        if (classSet.has(cls)) classSet.delete(cls);
        else classSet.add(cls);
        return classSet.has(cls);
      },
    } as unknown as DOMTokenList,
    style: styleObj as unknown as CSSStyleDeclaration,
    hasAttribute: (name: string) => name in attributes,
    getAttribute: (name: string) => attributes[name] ?? null,
    setAttribute: (name: string, val: string) => {
      attributes[name] = val;
      if (name === 'hidden') el.hidden = true;
      if (name === 'inert') el.inert = true;
      if (name === 'disabled') (el as any).disabled = true;
    },
    removeAttribute: (name: string) => {
      delete attributes[name];
      if (name === 'hidden') el.hidden = false;
      if (name === 'inert') el.inert = false;
      if (name === 'disabled') (el as any).disabled = false;
    },
    focus: vi.fn(function (this: any) {
      el._focused = true;
      if (typeof document !== 'undefined') {
        (document as any).activeElement = el;
      }
    }),
    blur: vi.fn(function (this: any) {
      el._focused = false;
    }),
    querySelectorAll: vi.fn((selector: string) => {
      // Simple selector matching for tests
      const result: HTMLElement[] = [];
      const traverse = (node: HTMLElement) => {
        const nodeChildren = (node as any)._children || [];
        for (const child of nodeChildren) {
          result.push(child);
          traverse(child);
        }
      };
      traverse(el as HTMLElement);
      return result as unknown as NodeListOf<HTMLElement>;
    }),
    contains: vi.fn((target: unknown) => {
      if (target === el) return true;
      const traverse = (node: HTMLElement): boolean => {
        const nodeChildren = (node as any)._children || [];
        for (const child of nodeChildren) {
          if (child === target) return true;
          if (traverse(child)) return true;
        }
        return false;
      };
      return traverse(el as HTMLElement);
    }),
  };

  if (checkVisibilityFn) {
    (el as any).checkVisibility = checkVisibilityFn;
  }

  return el as HTMLElement;
}

function appendChild(parent: HTMLElement, child: HTMLElement): void {
  (parent as any)._children.push(child);
  (child as any).parentElement = parent;
}

describe('InstitutionDetailModal — Accessibilité, Visibilité Effective et Piège de Focus', () => {
  let originalDocument: any;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true,
    });
  });

  it('1. Détecte correctement un bouton visible au début de la modale', () => {
    const closeBtn = createMockElement({
      id: 'close-btn',
      tagName: 'BUTTON',
      className: 'p-2 rounded-full bg-white text-slate-400',
    });
    expect(isElementEffectivelyVisible(closeBtn)).toBe(true);
  });

  it('2. Exclut un lien masqué sur mobile via la classe hidden ou checkVisibility', () => {
    // Cas où le lien a la classe hidden (Tailwind mobile hide)
    const mobileHiddenLink = createMockElement({
      id: 'website-link-mobile-hidden',
      tagName: 'A',
      href: 'https://example.ci',
      className: 'hidden sm:inline-flex',
    });
    expect(isElementEffectivelyVisible(mobileHiddenLink)).toBe(false);

    // Cas avec checkVisibility retournant false (Chromium mobile viewport simulation)
    const linkWithCheckVisibilityFalse = createMockElement({
      id: 'website-link-check-vis',
      tagName: 'A',
      href: 'https://example.ci',
      checkVisibilityFn: () => false,
    });
    expect(isElementEffectivelyVisible(linkWithCheckVisibilityFalse)).toBe(false);
  });

  it('3. Exclut un lien masqué par un élément parent (parent style display: none ou class hidden)', () => {
    const parentContainer = createMockElement({
      id: 'parent-mobile-bar',
      tagName: 'DIV',
      className: 'hidden',
    });

    const childLink = createMockElement({
      id: 'child-link',
      tagName: 'A',
      href: 'https://facebook.com/ci',
    });
    appendChild(parentContainer, childLink);

    expect(isElementEffectivelyVisible(childLink, parentContainer)).toBe(false);

    // Cas avec parent style.display = 'none'
    const parentWithStyle = createMockElement({
      id: 'parent-with-style',
      tagName: 'DIV',
      styleDisplay: 'none',
    });
    const childLink2 = createMockElement({
      id: 'child-link-2',
      tagName: 'A',
      href: 'https://facebook.com/ci',
    });
    appendChild(parentWithStyle, childLink2);

    expect(isElementEffectivelyVisible(childLink2, parentWithStyle)).toBe(false);
  });

  it('4. Exclut un élément inert ou contenu dans un conteneur inert', () => {
    const inertBtn = createMockElement({
      id: 'inert-btn',
      tagName: 'BUTTON',
      inert: true,
    });
    expect(isElementEffectivelyVisible(inertBtn)).toBe(false);

    const inertContainer = createMockElement({
      id: 'inert-container',
      tagName: 'DIV',
      inert: true,
    });
    const childBtn = createMockElement({
      id: 'child-btn',
      tagName: 'BUTTON',
    });
    appendChild(inertContainer, childBtn);

    expect(isElementEffectivelyVisible(childBtn, inertContainer)).toBe(false);
  });

  it('5. Exclut les éléments avec disabled, aria-hidden="true" ou tabindex="-1"', () => {
    const disabledBtn = createMockElement({ id: 'disabled-btn', disabled: true });
    const ariaHiddenBtn = createMockElement({ id: 'aria-hidden-btn', ariaHidden: true });
    const negativeTabIndex = createMockElement({ id: 'tabindex-btn', tabindex: -1 });

    expect(isElementEffectivelyVisible(disabledBtn)).toBe(false);
    expect(isElementEffectivelyVisible(ariaHiddenBtn)).toBe(false);
    expect(isElementEffectivelyVisible(negativeTabIndex)).toBe(false);
  });

  it('6. getModalFocusableElements filtre tous les éléments masqués et conserve uniquement les éléments interactifs visibles', () => {
    const modalDialog = createMockElement({ id: 'dialog', tagName: 'DIV' });

    // Liens desktop masqués sur mobile en tête de dialogue (exact scénario reproduit du bug Codex)
    const hiddenWebLink = createMockElement({ id: 'desktop-web-link', tagName: 'A', href: 'https://ci.gov', className: 'hidden sm:inline-flex' });
    const hiddenFbLink = createMockElement({ id: 'desktop-fb-link', tagName: 'A', href: 'https://fb.com', className: 'hidden sm:inline-flex' });
    const closeBtn = createMockElement({ id: 'close-btn', tagName: 'BUTTON' });
    const visibleTabBtn = createMockElement({ id: 'tab-projects', tagName: 'BUTTON' });
    const inertParent = createMockElement({ id: 'inert-wrap', tagName: 'DIV', inert: true });
    const inertChild = createMockElement({ id: 'inert-action', tagName: 'BUTTON' });
    appendChild(inertParent, inertChild);
    const exportBtn = createMockElement({ id: 'export-btn', tagName: 'BUTTON' });

    appendChild(modalDialog, hiddenWebLink);
    appendChild(modalDialog, hiddenFbLink);
    appendChild(modalDialog, closeBtn);
    appendChild(modalDialog, visibleTabBtn);
    appendChild(modalDialog, inertParent);
    appendChild(modalDialog, exportBtn);

    const focusables = getModalFocusableElements(modalDialog);

    // Les liens masqués et l'élément inert sont éliminés
    expect(focusables.map(el => el.id)).toEqual(['close-btn', 'tab-projects', 'export-btn']);
  });

  it('7. Shift+Tab depuis le premier élément visible (close-btn) boucle vers le dernier élément visible sans fuite vers les liens masqués', () => {
    const modalDialog = createMockElement({ id: 'dialog', tagName: 'DIV' });
    const hiddenWebLink = createMockElement({ id: 'desktop-web-link', tagName: 'A', href: 'https://ci.gov', className: 'hidden sm:inline-flex' });
    const closeBtn = createMockElement({ id: 'close-btn', tagName: 'BUTTON' });
    const exportBtn = createMockElement({ id: 'export-btn', tagName: 'BUTTON' });

    appendChild(modalDialog, hiddenWebLink);
    appendChild(modalDialog, closeBtn);
    appendChild(modalDialog, exportBtn);

    const shiftTabEvent = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: vi.fn(),
    };

    // Focus sur close-btn (le premier visible)
    handleModalKeyDown(shiftTabEvent, modalDialog, false, vi.fn(), closeBtn);

    expect(shiftTabEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(exportBtn.focus).toHaveBeenCalledTimes(1);
    expect(hiddenWebLink.focus).not.toHaveBeenCalled();
  });

  it('8. Tab depuis le dernier élément visible boucle vers le premier élément visible', () => {
    const modalDialog = createMockElement({ id: 'dialog', tagName: 'DIV' });
    const closeBtn = createMockElement({ id: 'close-btn', tagName: 'BUTTON' });
    const exportBtn = createMockElement({ id: 'export-btn', tagName: 'BUTTON' });

    appendChild(modalDialog, closeBtn);
    appendChild(modalDialog, exportBtn);

    const tabEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    };

    // Focus sur exportBtn (le dernier visible)
    handleModalKeyDown(tabEvent, modalDialog, false, vi.fn(), exportBtn);

    expect(tabEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(closeBtn.focus).toHaveBeenCalledTimes(1);
  });

  it('9. Ramène le focus à l’intérieur du dialogue lorsque le focus se retrouve momentanément hors de la modale', () => {
    const modalDialog = createMockElement({ id: 'dialog', tagName: 'DIV' });
    const closeBtn = createMockElement({ id: 'close-btn', tagName: 'BUTTON' });
    const exportBtn = createMockElement({ id: 'export-btn', tagName: 'BUTTON' });
    const outsideEl = createMockElement({ id: 'outside-body-el', tagName: 'BUTTON' });

    appendChild(modalDialog, closeBtn);
    appendChild(modalDialog, exportBtn);

    // Tab depuis l'extérieur -> va au premier élément
    const tabOutside = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() };
    handleModalKeyDown(tabOutside, modalDialog, false, vi.fn(), outsideEl);
    expect(tabOutside.preventDefault).toHaveBeenCalledTimes(1);
    expect(closeBtn.focus).toHaveBeenCalledTimes(1);

    // Shift+Tab depuis l'extérieur -> va au dernier élément
    const shiftTabOutside = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() };
    handleModalKeyDown(shiftTabOutside, modalDialog, false, vi.fn(), outsideEl);
    expect(shiftTabOutside.preventDefault).toHaveBeenCalledTimes(1);
    expect(exportBtn.focus).toHaveBeenCalledTimes(1);
  });

  it('10. Escape ferme la modale parente, mais est correctement suspendu lorsqu’une sous-modale est ouverte', () => {
    const modalDialog = createMockElement({ id: 'dialog', tagName: 'DIV' });
    const closeBtn = createMockElement({ id: 'close-btn', tagName: 'BUTTON' });
    appendChild(modalDialog, closeBtn);

    const onClose = vi.fn();

    // Escape sans sous-modale -> ferme la modale
    const escEvent = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() };
    handleModalKeyDown(escEvent, modalDialog, false, onClose, closeBtn);
    expect(escEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Escape AVEC sous-modale (docModalOpen = true) -> suspendu, ne ferme PAS la modale parente
    const escWithSubmodal = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() };
    const onCloseSubmodal = vi.fn();
    handleModalKeyDown(escWithSubmodal, modalDialog, true, onCloseSubmodal, closeBtn);
    expect(escWithSubmodal.preventDefault).not.toHaveBeenCalled();
    expect(onCloseSubmodal).not.toHaveBeenCalled();
  });

  it('11. manageModalFocusLifecycle place le focus initial et restitue le focus au déclencheur à la fermeture', () => {
    const triggerCardBtn = createMockElement({ id: 'trigger-card-btn', tagName: 'BUTTON' });
    const closeBtn = createMockElement({ id: 'close-btn', tagName: 'BUTTON' });
    const modalDialog = createMockElement({ id: 'dialog', tagName: 'DIV' });
    appendChild(modalDialog, closeBtn);

    Object.defineProperty(globalThis, 'document', {
      value: { activeElement: triggerCardBtn },
      configurable: true,
      writable: true,
    });

    // Ouverture de la modale
    const restore = manageModalFocusLifecycle(modalDialog, closeBtn);
    expect(closeBtn.focus).toHaveBeenCalledTimes(1);

    // Fermeture de la modale -> retour au bouton déclencheur d'origine
    restore();
    expect(triggerCardBtn.focus).toHaveBeenCalledTimes(1);
  });
});
