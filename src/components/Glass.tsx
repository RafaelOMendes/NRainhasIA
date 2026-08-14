/**
 * As camadas que transformam um `backdrop-filter` fosco em vidro:
 * a faixa de refração nas bordas e o brilho fixo (fio de luz + cáustica).
 * O aro e o especular do ponteiro vêm dos pseudo-elementos de `.glass`.
 */
export function GlassLayers({ gloss = true }: { gloss?: boolean }) {
  return (
    <>
      <span className="g-refract" aria-hidden />
      {gloss && <span className="g-gloss" aria-hidden />}
    </>
  );
}
