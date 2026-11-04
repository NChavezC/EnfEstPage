import { useEffect, useRef } from "react";
export default function Modal({
  title,
  children,
  onClose
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="border border-[var(--color-highlight)] rounded-[20px] max-w-[620px] w-[calc(100%_-_32px)] max-h-[85vh] p-7 text-[var(--color-body)] shadow-[0_30px_90px_#20101e40] backdrop:bg-[#30212a88] backdrop:backdrop-blur-[3px] max-[760px]:p-5" onCancel={e => {
    e.preventDefault();
    onClose();
  }}>
    <div className="flex items-center justify-between gap-5"><h2 className="text-2xl font-[650] mt-3.5 mb-3.5">{title}</h2><button type="button" className="rounded-[10px] px-[17px] py-[11px] bg-[var(--color-surface)] text-[var(--color-primary-dark)] font-semibold border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose} aria-label="Cerrar">×</button></div>
    {children}
  </dialog>;
}
