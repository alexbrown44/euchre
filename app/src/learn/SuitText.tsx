// Text with the suit symbols coloured as on the cards: ♥ and ♦ red, ♠ and ♣ black.
export function SuitText({ text }: { text: string }) {
  const parts = text.split(/([♠♥♦♣])/);
  return (
    <>
      {parts.map((p, i) =>
        p === '♥' || p === '♦' ? (
          <span key={i} className="rs-red">{p}</span>
        ) : p === '♠' || p === '♣' ? (
          <span key={i} className="rs-black">{p}</span>
        ) : (
          p
        ),
      )}
    </>
  );
}
