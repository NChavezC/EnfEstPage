import { useState } from "react";

// Accept local public assets only; the API applies the same restriction on save.
export default function TreatmentPhoto({ src, alt, eager = false }) {
  const [failed, setFailed] = useState(false);
  const local = /^\/(?!\/)/.test(src) && !/[\\%?#]/.test(src) && ![...src].some(char => char.charCodeAt(0) < 32)
    && !src.split("/").some(part => part === "." || part === "..")
    && /\.(jpe?g|png|webp|avif)$/i.test(src);
  if (!local || failed) return <p className="photo-unavailable" role="status">Imagen no disponible. Revisa la ruta del archivo.</p>;
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />;
}
