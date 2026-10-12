import { useEffect, useRef, useState } from 'react'
import { navSections, sectionHref, site, type SectionId } from '../config/landingContent.ts'
import { CameraCta } from './CameraCta.tsx'

interface MobileNavigationProps {
  activeId: SectionId | null
}

/**
 * Menu button + side sheet. A native modal <dialog> gives focus containment, Esc and an inert
 * page for free; we add scroll lock, backdrop click and focus return to the button.
 */
export function MobileNavigation({ activeId }: MobileNavigationProps) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    document.documentElement.classList.add('is-menu-open')
    return () => document.documentElement.classList.remove('is-menu-open')
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="mobile-nav">
      <button
        ref={buttonRef}
        type="button"
        className="mobile-nav__toggle"
        aria-expanded={open}
        aria-controls="menu-principal"
        onClick={() => setOpen(true)}
      >
        <span className="visually-hidden">Abrir menu</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        id="menu-principal"
        className="mobile-nav__sheet"
        aria-label="Menu"
        // Esc or dialog.close(): sync state and give focus back to the button.
        onClose={() => {
          setOpen(false)
          buttonRef.current?.focus()
        }}
        // A click on the dialog itself (not its content) is a click on the backdrop.
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div className="mobile-nav__content">
          <div className="mobile-nav__header">
            <span className="mobile-nav__title">{site.name}</span>
            <button type="button" className="mobile-nav__close" onClick={close}>
              <span className="visually-hidden">Fechar menu</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav aria-label="Seções">
            <ul className="mobile-nav__list">
              {navSections.map((section) => (
                <li key={section.id}>
                  <a
                    className="mobile-nav__link"
                    href={sectionHref(section.id)}
                    aria-current={activeId === section.id ? 'location' : undefined}
                    onClick={close}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <CameraCta className="mobile-nav__cta" onActivate={close} />
          <p className="mobile-nav__note">{site.privacy}</p>
        </div>
      </dialog>
    </div>
  )
}
