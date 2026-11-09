import { useState } from 'react';

// Photo du produit si elle existe et se charge, sinon l'emoji.
export default function ProductVisual({ item, className }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={className}>
      {item.image && !failed ? <img src={item.image} alt="" loading="lazy" onError={() => setFailed(true)} /> : item.emoji}
    </span>
  );
}
