/** Malha de gradientes que fica em movimento atrás do vidro — sem ela não há o que refratar. */
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
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        {/*
          Refração de borda: o ruído deslocado dobra o fundo, e as três cópias
          com escalas ligeiramente diferentes, recombinadas por canal, produzem a
          franja colorida que o vidro real cria nas quinas.
        */}
        <filter id="liquid-refract" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.013"
            numOctaves={3}
            seed={11}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2.2" result="soft" />

          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="30"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rBend"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="24"
            xChannelSelector="R"
            yChannelSelector="G"
            result="gBend"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="18"
            xChannelSelector="R"
            yChannelSelector="G"
            result="bBend"
          />

          <feColorMatrix
            in="rBend"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="rOnly"
          />
          <feColorMatrix
            in="gBend"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="gOnly"
          />
          <feColorMatrix
            in="bBend"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="bOnly"
          />

          <feBlend in="rOnly" in2="gOnly" mode="screen" result="rg" />
          <feBlend in="rg" in2="bOnly" mode="screen" />
        </filter>
      </svg>
    </>
  );
}
