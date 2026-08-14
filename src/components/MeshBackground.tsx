/**
 * Malha de gradientes em movimento lento atrás de tudo. Ela existe para o vidro
 * ter cor e movimento para filtrar — sobre fundo liso o efeito não aparece —,
 * mas fica em opacidade baixa: é atmosfera, não protagonista.
 */
export function MeshBackground() {
  return (
    <>
      <div className="mesh" aria-hidden>
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
        <span className="b4" />
      </div>
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />
    </>
  );
}
