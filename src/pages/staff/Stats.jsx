import { useEffect, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';
import { useBrand } from '../../brand.js';
import { Alert } from '../../components/ui.jsx';
import BarChart from '../../components/BarChart.jsx';
import { zonedParts } from '../../../shared/pickup.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = [
  { id: 'today', label: "Aujourd'hui", days: 1 },
  { id: 'week', label: '7 jours', days: 7 },
  { id: 'month', label: '30 jours', days: 30 },
  { id: 'quarter', label: '90 jours', days: 90 },
];

// Du jour J-(days-1) à aujourd'hui, à l'heure de l'établissement.
function periodDates(days, timeZone) {
  const now = Date.now();
  return { from: zonedParts(now - (days - 1) * DAY_MS, timeZone).date, to: zonedParts(now, timeZone).date };
}

const shortDate = (date) => date.slice(8, 10) + '/' + date.slice(5, 7);

function Kpi({ value, label }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function TopItems({ items }) {
  if (!items.length) return <p className="muted small">Aucune vente sur la période.</p>;
  return (
    <table className="stats-table">
      <thead>
        <tr>
          <th scope="col">Article</th>
          <th scope="col">Quantité</th>
          <th scope="col">Chiffre</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.name}>
            <th scope="row">{item.name}</th>
            <td>{item.qty}</td>
            <td>{euro(item.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function useStats(period, timeZone, onAuthError) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { from, to } = periodDates(period.days, timeZone);

  useEffect(() => {
    let alive = true;
    setError('');
    api
      .stats(from, to)
      .then((data) => alive && setStats(data))
      .catch((e) => (e instanceof AuthError ? onAuthError() : setError(e.message)));
    return () => {
      alive = false;
    };
  }, [from, to]);

  return { stats, error, from, to };
}

export default function Stats({ onAuthError }) {
  const { timeZone } = useBrand();
  const [period, setPeriod] = useState(PERIODS[1]);
  const { stats, error, from, to } = useStats(period, timeZone, onAuthError);

  const hours = stats?.byHour.map((count, hour) => ({ key: hour, label: `${hour} h`, value: count, tick: hour % 3 === 0 ? `${hour}h` : '' }));
  const days = stats?.byDay.map((d, i, all) => ({
    key: d.date,
    label: shortDate(d.date),
    value: d.revenue,
    tick: all.length <= 10 || i % Math.ceil(all.length / 8) === 0 ? shortDate(d.date) : '',
  }));

  return (
    <section className="panel stats-page">
      <div className="admin-head stats-head">
        <h2>Statistiques</h2>
        <nav className="tabs" aria-label="Période">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={`tab ${p.id === period.id ? 'on' : ''}`} aria-current={p.id === period.id ? 'true' : undefined} onClick={() => setPeriod(p)}>
              {p.label}
            </button>
          ))}
        </nav>
        <a className="btn btn-ghost btn-sm" href={`/api/stats/orders.csv?from=${from}&to=${to}`} download>
          Exporter les commandes (CSV)
        </a>
      </div>
      {error && <Alert>{error}</Alert>}
      {!stats && !error && <p className="muted">Chargement…</p>}
      {stats && (
        <>
          <div className="stats">
            <Kpi value={euro(stats.revenue)} label="Chiffre d'affaires" />
            <Kpi value={stats.count} label="Commandes" />
            <Kpi value={euro(stats.averageTicket)} label="Panier moyen" />
            <Kpi value={stats.averagePrepMinutes == null ? '–' : `${stats.averagePrepMinutes} min`} label="Préparation moyenne" />
            <Kpi value={stats.takeaway} label="À emporter" />
            <Kpi value={stats.cancelled} label="Annulées" />
          </div>
          <div className="stats-charts">
            <BarChart title="Commandes par heure (heures de pointe)" data={hours} />
            {days.length > 1 && <BarChart title="Chiffre d'affaires par jour" data={days} format={euro} />}
          </div>
          <h3>Articles les plus vendus</h3>
          <TopItems items={stats.topItems} />
        </>
      )}
    </section>
  );
}
