import React from 'react';

interface RadarTransportProps {
  total?: number;
  ahead?: number;
  onTime?: number;
  watch?: number;
  delayed?: number;
}

export default function RadarTransport({
  total = 0,
  ahead = 0,
  onTime = 0,
  watch = 0,
  delayed = 0
}: RadarTransportProps) {
  // Gérer le cas total === 0 pour éviter NaN
  const safeTotal = total === 0 ? 1 : total;
  
  const pct = {
    ahead: Math.round((ahead / safeTotal) * 100),
    onTime: Math.round((onTime / safeTotal) * 100),
    watch: Math.round((watch / safeTotal) * 100),
    delayed: Math.round((delayed / safeTotal) * 100)
  };

  const items = [
    { label: 'En avance', value: ahead, pct: pct.ahead, dot: 'bg-green-500', txt: 'text-green-500' },
    { label: "À l'heure", value: onTime, pct: pct.onTime, dot: 'bg-green-500', txt: 'text-green-500' },
    { label: 'À surveiller', value: watch, pct: pct.watch, dot: 'bg-orange-500', txt: 'text-orange-500' },
    { label: 'En retard', value: delayed, pct: pct.delayed, dot: 'bg-red-500', txt: 'text-red-500' }
  ];

  const cx = 130, cy = 130, r = 100, w = 18;

  function arc(sA: number, eA: number) {
    const sr = ((sA - 90) * Math.PI) / 180;
    const er = ((eA - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(sr), y1 = cy + r * Math.sin(sr);
    const x2 = cx + r * Math.cos(er), y2 = cy + r * Math.sin(er);
    const x3 = cx + (r - w) * Math.cos(er), y3 = cy + (r - w) * Math.sin(er);
    const x4 = cx + (r - w) * Math.cos(sr), y4 = cy + (r - w) * Math.sin(sr);
    const la = eA - sA > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2} L ${x3} ${y3} A ${r - w} ${r - w} 0 ${la} 0 ${x4} ${y4} Z`;
  }

  const segs = (() => {
    let cur = 0;
    return [ahead, onTime, watch, delayed].map(v => {
      const s = cur;
      cur += total === 0 ? 0 : (v / total) * 360;
      return { s, e: cur };
    });
  })();

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
          <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-gray-600/50"></div>
          </div>
        </div>
        <h4 className="text-xl font-medium text-white mb-3">Aucune livraison à analyser</h4>
        <p className="text-sm text-gray-400 max-w-md mb-6">
          Votre entreprise ne comporte actuellement aucune livraison en cours.
          Le radar s'activera automatiquement dès que des livraisons seront planifiées.
        </p>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-gray-600 mr-2"></span>
            <span>En attente de données</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col items-center">
        <svg width="260" height="260" viewBox="0 0 260 260" className="overflow-visible">
          <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="rgba(34,197,94,0.05)" strokeWidth="2" className="blur-sm" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(156,163,175,0.08)" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={r * 0.75} fill="none" stroke="rgba(156,163,175,0.06)" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke="rgba(156,163,175,0.04)" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={r * 0.25} fill="none" stroke="rgba(156,163,175,0.03)" strokeWidth="0.5" />
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="rgba(156,163,175,0.04)" strokeWidth="0.5" />
          <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="rgba(156,163,175,0.04)" strokeWidth="0.5" />
          <circle cx={cx} cy={cy - r + 12} r="3" fill="rgba(96,165,250,0.4)" />
          <circle cx={cx} cy={cy + r - 12} r="3" fill="rgba(96,165,250,0.4)" />
          <circle cx={cx - r + 12} cy={cy} r="3" fill="rgba(96,165,250,0.4)" />
          <circle cx={cx + r - 12} cy={cy} r="3" fill="rgba(96,165,250,0.4)" />
          {ahead > 0 && <path d={arc(segs[0].s, segs[0].e)} fill="rgba(34,197,94,0.25)" />}
          {onTime > 0 && <path d={arc(segs[1].s, segs[1].e)} fill="rgba(34,197,94,0.35)" />}
          {watch > 0 && <path d={arc(segs[2].s, segs[2].e)} fill="rgba(249,115,22,0.25)" />}
          {delayed > 0 && <path d={arc(segs[3].s, segs[3].e)} fill="rgba(239,68,68,0.25)" />}
          <circle cx={cx} cy={cy} r={48} fill="#111827" stroke="rgba(156,163,175,0.15)" strokeWidth="0.5" />
        </svg>
        <div className="relative" style={{ marginTop: '-172px', height: '104px' }}>
          <div className="flex flex-col items-center justify-center h-full w-24 mx-auto">
            <div className="text-3xl font-bold text-white">{total}</div>
            <div className="text-sm font-medium text-gray-300 mt-0.5">LIVRAISONS</div>
            <div className="text-xs text-gray-400 mt-0.5">AUJOURD'HUI</div>
          </div>
        </div>
        <div className="mt-8 flex justify-center space-x-6">
          <div className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></span>
            <span className="text-xs text-gray-400">À l'heure</span>
          </div>
          <div className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-2"></span>
            <span className="text-xs text-gray-400">À surveiller</span>
          </div>
          <div className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></span>
            <span className="text-xs text-gray-400">En retard</span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors duration-200 cursor-pointer">
              <div className="flex items-center">
                <span className={`w-2.5 h-2.5 rounded-full ${item.dot} mr-3`}></span>
                <div>
                  <div className="text-sm font-medium text-gray-300">{item.label}</div>
                  <div className="text-xs text-gray-500">Statut de livraison</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">{item.value}</div>
                <div className={`text-xs ${item.txt}`}>{item.pct}%</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 p-3 bg-gray-900/30 rounded-lg border border-gray-800/50 hover:border-orange-500/30 transition-colors duration-200 cursor-pointer group">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-3"></span>
              <span className="text-sm text-gray-300">{watch + delayed} livraisons nécessitent votre attention</span>
            </div>
            <span className="text-orange-500 group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}