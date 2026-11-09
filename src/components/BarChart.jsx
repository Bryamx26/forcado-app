import { useState } from 'react';

const HEIGHT = 160;
const BAR_GAP = 2;
const RADIUS = 4;

// Barre arrondie en haut seulement : elle reste posée sur l'axe.
function barPath(x, y, width, height) {
  const r = Math.min(RADIUS, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

// Histogramme d'une seule série (pas de légende : le titre la nomme). Au survol ou au focus, la valeur
// s'affiche ; le tableau des données reste lisible pour les lecteurs d'écran.
// data : [{ key, label, value, tick }] ; tick : étiquette sous l'axe (facultative, pour alléger).
export default function BarChart({ title, data, format = String }) {
  const [active, setActive] = useState(null);
  const width = Math.max(data.length * 16, 240);
  const barWidth = width / data.length - BAR_GAP;
  const max = Math.max(...data.map((d) => d.value), 1);
  const shown = active == null ? null : data[active];

  return (
    <figure className="bar-chart">
      <figcaption>
        <span className="bar-chart-title">{title}</span>
        <span className="bar-chart-value" aria-live="polite">{shown ? `${shown.label} : ${format(shown.value)}` : `Max. ${format(max)}`}</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${HEIGHT + 18}`} role="img" aria-label={title} onMouseLeave={() => setActive(null)}>
        <line x1="0" x2={width} y1={HEIGHT} y2={HEIGHT} className="bar-chart-axis" />
        {data.map((d, i) => {
          const height = (d.value / max) * (HEIGHT - 8);
          const x = i * (barWidth + BAR_GAP);
          return (
            <g key={d.key} onMouseEnter={() => setActive(i)}>
              <rect x={x} y="0" width={barWidth + BAR_GAP} height={HEIGHT} className="bar-chart-hit" />
              {height > 0 && <path d={barPath(x, HEIGHT - height, barWidth, height)} className={`bar-chart-bar ${active === i ? 'on' : ''}`} />}
              {d.tick && (
                <text x={x + barWidth / 2} y={HEIGHT + 14} className="bar-chart-tick">
                  {d.tick}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
