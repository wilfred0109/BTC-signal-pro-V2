// ============================================================
// Crypto Signal Pro v2 - Complete bundled app
// Modules: Indicators, Levels, VolumeProfile, Volatility,
//          Liquidation, MTF, Scoring + Main app
// ============================================================

// ============================================================
// MODULE: Indicators
// ============================================================
window.Indicators = (function() {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function closes(c) { return c.map(x => x.close); }
  function highs(c) { return c.map(x => x.high); }
  function lows(c) { return c.map(x => x.low); }

  function sma(arr, p) {
    if (arr.length < p) return null;
    return arr.slice(-p).reduce((a, b) => a + b, 0) / p;
  }
  function ema(arr, p) {
    if (arr.length < p) return null;
    const k = 2 / (p + 1);
    let e = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
    for (let i = p; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
    return e;
  }
  function emaSeries(arr, p) {
    if (arr.length < p) return [];
    const k = 2 / (p + 1);
    const result = new Array(p - 1).fill(null);
    let e = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
    result.push(e);
    for (let i = p; i < arr.length; i++) {
      e = arr[i] * k + e * (1 - k);
      result.push(e);
    }
    return result;
  }
  function rsi(arr, p = 14) {
    if (arr.length < p + 1) return null;
    let g = 0, l = 0;
    for (let i = arr.length - p; i < arr.length; i++) {
      const d = arr[i] - arr[i - 1];
      if (d >= 0) g += d; else l -= d;
    }
    const aL = l / p;
    if (aL === 0) return 100;
    return 100 - (100 / (1 + (g / p) / aL));
  }
  function macd(arr, fast = 12, slow = 26, sig = 9) {
    if (arr.length < slow + sig) return null;
    const eFast = emaSeries(arr, fast);
    const eSlow = emaSeries(arr, slow);
    const macdLineSeries = [];
    for (let i = 0; i < arr.length; i++) {
      if (eFast[i] !== null && eSlow[i] !== null) macdLineSeries.push(eFast[i] - eSlow[i]);
    }
    if (macdLineSeries.length < sig) return null;
    const signal = ema(macdLineSeries, sig);
    const macdVal = macdLineSeries[macdLineSeries.length - 1];
    return { macd: macdVal, signal, hist: macdVal - signal };
  }
  function bollinger(arr, p = 20) {
    if (arr.length < p) return null;
    const s = arr.slice(-p);
    const mean = s.reduce((a, b) => a + b, 0) / p;
    const std = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / p);
    const last = arr[arr.length - 1];
    return { pctB: (last - (mean - 2 * std)) / (4 * std) };
  }
  function stochastic(arr, p = 14) {
    if (arr.length < p) return null;
    const s = arr.slice(-p);
    const h = Math.max(...s), l = Math.min(...s), last = arr[arr.length - 1];
    if (h === l) return 50;
    return ((last - l) / (h - l)) * 100;
  }
  function momentum(arr, p) {
    if (arr.length < p + 1) return null;
    const past = arr[arr.length - 1 - p];
    return ((arr[arr.length - 1] - past) / past) * 100;
  }
  function atr(candles, p = 14) {
    if (candles.length < p + 1) return null;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], pc = candles[i - 1];
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - pc.close), Math.abs(c.low - pc.close)));
    }
    return trs.slice(-p).reduce((a, b) => a + b, 0) / p;
  }
  function williamsR(candles, p = 14) {
    if (candles.length < p) return null;
    const slice = candles.slice(-p);
    const h = Math.max(...slice.map(c => c.high));
    const l = Math.min(...slice.map(c => c.low));
    const last = candles[candles.length - 1].close;
    if (h === l) return -50;
    return ((h - last) / (h - l)) * -100;
  }
  function cci(candles, p = 20) {
    if (candles.length < p) return null;
    const slice = candles.slice(-p);
    const tps = slice.map(c => (c.high + c.low + c.close) / 3);
    const mean = tps.reduce((a, b) => a + b, 0) / p;
    const md = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / p;
    const lastTp = tps[tps.length - 1];
    if (md === 0) return 0;
    return (lastTp - mean) / (0.015 * md);
  }
  function adx(candles, p = 14) {
    if (candles.length < p * 2) return null;
    const tr = [], plusDM = [], minusDM = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], pc = candles[i - 1];
      tr.push(Math.max(c.high - c.low, Math.abs(c.high - pc.close), Math.abs(c.low - pc.close)));
      const upMove = c.high - pc.high;
      const downMove = pc.low - c.low;
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    const trSum = tr.slice(-p).reduce((a, b) => a + b, 0);
    const plusSum = plusDM.slice(-p).reduce((a, b) => a + b, 0);
    const minusSum = minusDM.slice(-p).reduce((a, b) => a + b, 0);
    if (trSum === 0) return 0;
    const plusDI = (plusSum / trSum) * 100;
    const minusDI = (minusSum / trSum) * 100;
    if (plusDI + minusDI === 0) return 0;
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    return { adx: dx, plusDI, minusDI };
  }
  function obv(candles) {
    if (candles.length < 2) return null;
    let v = 0;
    for (let i = 1; i < candles.length; i++) {
      if (candles[i].close > candles[i - 1].close) v += candles[i].volume;
      else if (candles[i].close < candles[i - 1].close) v -= candles[i].volume;
    }
    return v;
  }
  function vwap(candles, p) {
    if (candles.length < p) return null;
    const slice = candles.slice(-p);
    let pv = 0, v = 0;
    for (const c of slice) {
      const tp = (c.high + c.low + c.close) / 3;
      pv += tp * c.volume;
      v += c.volume;
    }
    return v > 0 ? pv / v : null;
  }
  function mfi(candles, p = 14) {
    if (candles.length < p + 1) return null;
    let posFlow = 0, negFlow = 0;
    for (let i = candles.length - p; i < candles.length; i++) {
      const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
      const ptp = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3;
      const flow = tp * candles[i].volume;
      if (tp > ptp) posFlow += flow;
      else if (tp < ptp) negFlow += flow;
    }
    if (negFlow === 0) return 100;
    return 100 - (100 / (1 + posFlow / negFlow));
  }

  return { clamp, closes, highs, lows, sma, ema, emaSeries, rsi, macd, bollinger, stochastic, momentum, atr, williamsR, cci, adx, obv, vwap, mfi };
})();

// ============================================================
// MODULE: Levels (Nick-method)
// ============================================================
window.Levels = (function() {
  function findPivots(candles, lookback = 5) {
    const pivotHighs = [], pivotLows = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
      const c = candles[i];
      let isHigh = true, isLow = true;
      for (let j = 1; j <= lookback; j++) {
        if (candles[i - j].high >= c.high || candles[i + j].high >= c.high) isHigh = false;
        if (candles[i - j].low <= c.low || candles[i + j].low <= c.low) isLow = false;
        if (!isHigh && !isLow) break;
      }
      if (isHigh) pivotHighs.push({ index: i, price: c.high, time: c.time });
      if (isLow) pivotLows.push({ index: i, price: c.low, time: c.time });
    }
    return { pivotHighs, pivotLows };
  }

  function clusterPivots(pivots, currentPrice, clusterPct = 0.012) {
    if (pivots.length === 0) return [];
    const sorted = [...pivots].sort((a, b) => a.price - b.price);
    const clusters = [];
    let current = { prices: [sorted[0].price], indexes: [sorted[0].index] };
    for (let i = 1; i < sorted.length; i++) {
      const lastPrice = current.prices[current.prices.length - 1];
      const diff = Math.abs(sorted[i].price - lastPrice) / lastPrice;
      if (diff < clusterPct) {
        current.prices.push(sorted[i].price);
        current.indexes.push(sorted[i].index);
      } else {
        clusters.push(current);
        current = { prices: [sorted[i].price], indexes: [sorted[i].index] };
      }
    }
    clusters.push(current);
    return clusters.map(cl => ({
      price: cl.prices.reduce((a, b) => a + b, 0) / cl.prices.length,
      hits: cl.prices.length,
      lastIndex: Math.max(...cl.indexes),
      strength: cl.prices.length
    }));
  }

  function findSupportResistance(candles, currentPrice) {
    if (candles.length < 30) return { support: [], resistance: [] };
    const { pivotHighs, pivotLows } = findPivots(candles, 5);
    const resistanceClusters = clusterPivots(pivotHighs, currentPrice);
    const supportClusters = clusterPivots(pivotLows, currentPrice);
    const totalCandles = candles.length;
    function scoreLevel(cl) {
      const recency = cl.lastIndex / totalCandles;
      return cl.strength * (0.5 + 0.5 * recency);
    }
    const resistance = resistanceClusters
      .filter(c => c.price > currentPrice * 1.001)
      .map(c => ({ ...c, score: scoreLevel(c), distance: ((c.price - currentPrice) / currentPrice) * 100 }))
      .sort((a, b) => a.distance - b.distance).slice(0, 3);
    const support = supportClusters
      .filter(c => c.price < currentPrice * 0.999)
      .map(c => ({ ...c, score: scoreLevel(c), distance: ((currentPrice - c.price) / currentPrice) * 100 }))
      .sort((a, b) => a.distance - b.distance).slice(0, 3);
    return { support, resistance };
  }

  function findSupplyDemandZones(candles, currentPrice) {
    if (candles.length < 20) return { demand: [], supply: [] };
    const demand = [], supply = [];
    const bodySizes = candles.map(c => Math.abs(c.close - c.open));
    const avgBody = bodySizes.reduce((a, b) => a + b, 0) / bodySizes.length;
    for (let i = 4; i < candles.length - 1; i++) {
      const c = candles[i];
      const body = Math.abs(c.close - c.open);
      if (body < avgBody * 1.8) continue;
      const baseHigh = Math.max(candles[i-3].high, candles[i-2].high, candles[i-1].high);
      const baseLow = Math.min(candles[i-3].low, candles[i-2].low, candles[i-1].low);
      const baseRange = baseHigh - baseLow;
      if (baseRange > avgBody * 2.5) continue;
      const isBullish = c.close > c.open;
      if (isBullish && c.close > baseHigh) {
        demand.push({ priceLow: baseLow, priceHigh: baseHigh, midPrice: (baseLow + baseHigh) / 2, index: i, recency: i / candles.length });
      } else if (!isBullish && c.close < baseLow) {
        supply.push({ priceLow: baseLow, priceHigh: baseHigh, midPrice: (baseLow + baseHigh) / 2, index: i, recency: i / candles.length });
      }
    }
    function isDemandActive(z, candles) {
      for (let i = z.index + 1; i < candles.length; i++) if (candles[i].close < z.priceLow * 0.99) return false;
      return true;
    }
    function isSupplyActive(z, candles) {
      for (let i = z.index + 1; i < candles.length; i++) if (candles[i].close > z.priceHigh * 1.01) return false;
      return true;
    }
    const activeDemand = demand.filter(z => isDemandActive(z, candles)).filter(z => z.midPrice < currentPrice).sort((a, b) => b.recency - a.recency).slice(0, 2);
    const activeSupply = supply.filter(z => isSupplyActive(z, candles)).filter(z => z.midPrice > currentPrice).sort((a, b) => b.recency - a.recency).slice(0, 2);
    return { demand: activeDemand, supply: activeSupply };
  }

  function calculateLevelFit(advice, currentPrice, levels, zones) {
    if (advice.klass === 'neutral') return { fit: 50, reason: 'Neutraal' };
    let fitScore = 50, reasons = [];
    if (advice.klass === 'long') {
      if (levels.support.length > 0) {
        const ns = levels.support[0];
        if (ns.distance < 1.5) { fitScore += 25; reasons.push('Bij support'); }
        else if (ns.distance < 3) { fitScore += 15; reasons.push('Dichtbij support'); }
      }
      if (levels.resistance.length > 0) {
        const nr = levels.resistance[0];
        if (nr.distance < 1.5) { fitScore -= 25; reasons.push('Vlak onder weerstand'); }
        else if (nr.distance < 3) { fitScore -= 10; reasons.push('Naderende weerstand'); }
      }
      if (zones.demand.length > 0) {
        const nd = zones.demand[0];
        const dp = ((currentPrice - nd.midPrice) / currentPrice) * 100;
        if (dp < 2) { fitScore += 15; reasons.push('Demand-zone actief'); }
      }
    } else if (advice.klass === 'short') {
      if (levels.resistance.length > 0) {
        const nr = levels.resistance[0];
        if (nr.distance < 1.5) { fitScore += 25; reasons.push('Bij weerstand'); }
        else if (nr.distance < 3) { fitScore += 15; reasons.push('Dichtbij weerstand'); }
      }
      if (levels.support.length > 0) {
        const ns = levels.support[0];
        if (ns.distance < 1.5) { fitScore -= 25; reasons.push('Vlak boven support'); }
        else if (ns.distance < 3) { fitScore -= 10; reasons.push('Support nadert'); }
      }
      if (zones.supply.length > 0) {
        const ns = zones.supply[0];
        const dp = ((ns.midPrice - currentPrice) / currentPrice) * 100;
        if (dp < 2) { fitScore += 15; reasons.push('Supply-zone actief'); }
      }
    }
    fitScore = Math.max(0, Math.min(100, fitScore));
    return { fit: fitScore, reason: reasons.join(', ') || 'Geen sterke niveaus dichtbij' };
  }

  function generateActionHint(advice, currentPrice, levels, zones) {
    if (advice.klass === 'neutral') return null;
    if (advice.klass === 'long') {
      if (levels.resistance.length > 0) {
        const r = levels.resistance[0];
        if (r.distance < 2) return `Wachten op breakout boven ${formatPrice(r.price)} voor sterkere entry`;
      }
      if (levels.support.length > 0 && levels.resistance.length > 0) {
        const s = levels.support[0], r = levels.resistance[0];
        if (s.distance < 2.5 && r.distance < 4) return `Range ${formatPrice(s.price)} - ${formatPrice(r.price)}, koop bij support`;
      }
    } else {
      if (levels.support.length > 0) {
        const s = levels.support[0];
        if (s.distance < 2) return `Wachten op breakdown onder ${formatPrice(s.price)} voor sterkere entry`;
      }
      if (levels.support.length > 0 && levels.resistance.length > 0) {
        const s = levels.support[0], r = levels.resistance[0];
        if (r.distance < 2.5 && s.distance < 4) return `Range ${formatPrice(s.price)} - ${formatPrice(r.price)}, short bij weerstand`;
      }
    }
    return null;
  }

  function formatPrice(n) {
    if (n >= 100) return '€' + Math.round(n).toLocaleString('nl-NL');
    if (n >= 1) return '€' + n.toFixed(2);
    if (n >= 0.01) return '€' + n.toFixed(4);
    return '€' + n.toFixed(6);
  }

  return { findSupportResistance, findSupplyDemandZones, calculateLevelFit, generateActionHint, formatPrice };
})();

// ============================================================
// MODULE: VolumeProfile
// ============================================================
window.VolumeProfile = (function() {
  function calculate(candles, bucketCount = 30) {
    if (!candles || candles.length < 10) return null;
    let priceMin = Infinity, priceMax = -Infinity;
    for (const c of candles) {
      if (c.low < priceMin) priceMin = c.low;
      if (c.high > priceMax) priceMax = c.high;
    }
    if (priceMin === priceMax) return null;
    const bucketSize = (priceMax - priceMin) / bucketCount;
    const buckets = new Array(bucketCount).fill(0).map((_, i) => ({
      priceLow: priceMin + i * bucketSize,
      priceHigh: priceMin + (i + 1) * bucketSize,
      priceMid: priceMin + (i + 0.5) * bucketSize,
      volume: 0, bullVolume: 0, bearVolume: 0
    }));
    for (const c of candles) {
      const candleRange = c.high - c.low;
      if (candleRange === 0) {
        const bIdx = Math.min(bucketCount - 1, Math.max(0, Math.floor((c.close - priceMin) / bucketSize)));
        buckets[bIdx].volume += c.volume;
        if (c.close >= c.open) buckets[bIdx].bullVolume += c.volume;
        else buckets[bIdx].bearVolume += c.volume;
        continue;
      }
      const startIdx = Math.max(0, Math.floor((c.low - priceMin) / bucketSize));
      const endIdx = Math.min(bucketCount - 1, Math.floor((c.high - priceMin) / bucketSize));
      const numBuckets = endIdx - startIdx + 1;
      if (numBuckets <= 0) continue;
      const volPerBucket = c.volume / numBuckets;
      const isBullish = c.close >= c.open;
      for (let i = startIdx; i <= endIdx; i++) {
        buckets[i].volume += volPerBucket;
        if (isBullish) buckets[i].bullVolume += volPerBucket;
        else buckets[i].bearVolume += volPerBucket;
      }
    }
    let pocIdx = 0, maxVol = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].volume > maxVol) { maxVol = buckets[i].volume; pocIdx = i; }
    }
    const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0);
    const targetVA = totalVolume * 0.70;
    let vaLowIdx = pocIdx, vaHighIdx = pocIdx, cumVol = buckets[pocIdx].volume;
    while (cumVol < targetVA && (vaLowIdx > 0 || vaHighIdx < buckets.length - 1)) {
      const lowVol = vaLowIdx > 0 ? buckets[vaLowIdx - 1].volume : -1;
      const highVol = vaHighIdx < buckets.length - 1 ? buckets[vaHighIdx + 1].volume : -1;
      if (lowVol < 0 && highVol < 0) break;
      if (highVol >= lowVol) { vaHighIdx++; cumVol += buckets[vaHighIdx].volume; }
      else { vaLowIdx--; cumVol += buckets[vaLowIdx].volume; }
    }
    return { buckets, pocIdx, pocPrice: buckets[pocIdx].priceMid, maxVol, vaLow: buckets[vaLowIdx].priceLow, vaHigh: buckets[vaHighIdx].priceHigh, vaLowIdx, vaHighIdx, priceMin, priceMax };
  }

  function renderSVG(svgElement, profile, currentPrice, width = 400, height = 160) {
    if (!profile) {
      svgElement.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#5a627a" font-size="11">Onvoldoende data</text>';
      return;
    }
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgElement.innerHTML = '';
    const buckets = profile.buckets;
    const numBuckets = buckets.length;
    const bucketHeight = height / numBuckets;
    const maxBarWidth = width * 0.95;
    for (let i = numBuckets - 1; i >= 0; i--) {
      const b = buckets[i];
      const yIdx = numBuckets - 1 - i;
      const y = yIdx * bucketHeight;
      const barWidth = (b.volume / profile.maxVol) * maxBarWidth;
      const isPOC = i === profile.pocIdx;
      const inVA = i >= profile.vaLowIdx && i <= profile.vaHighIdx;
      const total = b.bullVolume + b.bearVolume;
      const bullRatio = total > 0 ? b.bullVolume / total : 0.5;
      const bullWidth = barWidth * bullRatio;
      const bearWidth = barWidth * (1 - bullRatio);
      let bullColor, bearColor;
      if (isPOC) { bullColor = 'rgba(251, 191, 36, 0.95)'; bearColor = 'rgba(251, 191, 36, 0.55)'; }
      else if (inVA) { bullColor = 'rgba(34, 197, 94, 0.7)'; bearColor = 'rgba(239, 68, 68, 0.55)'; }
      else { bullColor = 'rgba(34, 197, 94, 0.35)'; bearColor = 'rgba(239, 68, 68, 0.3)'; }
      if (bullWidth > 0) {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', 0); r.setAttribute('y', y + 0.5);
        r.setAttribute('width', bullWidth); r.setAttribute('height', Math.max(1, bucketHeight - 1));
        r.setAttribute('fill', bullColor);
        svgElement.appendChild(r);
      }
      if (bearWidth > 0) {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', bullWidth); r.setAttribute('y', y + 0.5);
        r.setAttribute('width', bearWidth); r.setAttribute('height', Math.max(1, bucketHeight - 1));
        r.setAttribute('fill', bearColor);
        svgElement.appendChild(r);
      }
      if (isPOC) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', width - 4); t.setAttribute('y', y + bucketHeight / 2 + 3);
        t.setAttribute('text-anchor', 'end'); t.setAttribute('fill', '#fbbf24');
        t.setAttribute('font-size', '9'); t.setAttribute('font-weight', 'bold');
        t.textContent = 'POC ' + formatPriceCompact(b.priceMid);
        svgElement.appendChild(t);
      }
    }
    const priceRange = profile.priceMax - profile.priceMin;
    if (priceRange > 0 && currentPrice >= profile.priceMin && currentPrice <= profile.priceMax) {
      const yRatio = 1 - (currentPrice - profile.priceMin) / priceRange;
      const yLine = yRatio * height;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0); line.setAttribute('x2', width);
      line.setAttribute('y1', yLine); line.setAttribute('y2', yLine);
      line.setAttribute('stroke', '#e8eaf0'); line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4,3');
      svgElement.appendChild(line);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', 4); t.setAttribute('y', yLine - 3);
      t.setAttribute('fill', '#e8eaf0'); t.setAttribute('font-size', '10');
      t.setAttribute('font-weight', 'bold');
      t.textContent = '◀ ' + formatPriceCompact(currentPrice);
      svgElement.appendChild(t);
    }
  }

  function formatPriceCompact(n) {
    if (n >= 1000) return '€' + (n / 1000).toFixed(1) + 'k';
    if (n >= 100) return '€' + Math.round(n);
    if (n >= 1) return '€' + n.toFixed(2);
    if (n >= 0.01) return '€' + n.toFixed(3);
    return '€' + n.toFixed(5);
  }

  return { calculate, renderSVG };
})();

// ============================================================
// MODULE: Volatility Heatmap (uren x dagen)
// ============================================================
window.VolatilityHeatmap = (function() {
  // Per uur van de week: gemiddelde |%change| over de afgelopen weken
  function calculate(hourlyCandles) {
    if (!hourlyCandles || hourlyCandles.length < 168) return null; // minstens 1 week

    // 7 dagen × 24 uur = 168 buckets
    const buckets = new Array(7).fill(0).map(() => new Array(24).fill(0).map(() => ({ sum: 0, count: 0 })));

    for (let i = 1; i < hourlyCandles.length; i++) {
      const c = hourlyCandles[i];
      const prev = hourlyCandles[i - 1];
      if (!c || !prev || prev.close === 0) continue;

      const date = new Date(c.time);
      // 0 = zondag, we willen 0 = maandag voor europese conventie
      let dayOfWeek = date.getUTCDay();
      dayOfWeek = (dayOfWeek + 6) % 7; // ma=0, di=1, ... zo=6
      const hour = date.getUTCHours();

      // % volatility = (high-low)/close * 100
      const volatility = ((c.high - c.low) / c.close) * 100;
      if (!isNaN(volatility) && volatility > 0) {
        buckets[dayOfWeek][hour].sum += volatility;
        buckets[dayOfWeek][hour].count += 1;
      }
    }

    // Bereken gemiddelden + vind min/max
    let minVol = Infinity, maxVol = -Infinity;
    const grid = buckets.map(day => day.map(hour => {
      const avg = hour.count > 0 ? hour.sum / hour.count : 0;
      if (avg > 0) {
        if (avg < minVol) minVol = avg;
        if (avg > maxVol) maxVol = avg;
      }
      return avg;
    }));

    // Vind heetste cell (peak)
    let peakDay = 0, peakHour = 0, peakVal = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (grid[d][h] > peakVal) { peakVal = grid[d][h]; peakDay = d; peakHour = h; }
      }
    }

    return { grid, minVol, maxVol, peakDay, peakHour, peakVal };
  }

  function renderSVG(svgElement, heatmap) {
    if (!heatmap) {
      svgElement.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#5a627a" font-size="11">Onvoldoende data</text>';
      return;
    }

    svgElement.innerHTML = '';
    const days = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
    const labelW = 20;
    const headerH = 14;
    const cellW = (380 - labelW) / 24;
    const cellH = (140 - headerH) / 7;

    // Hour headers (0, 4, 8, 12, 16, 20)
    for (let h = 0; h < 24; h += 4) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', labelW + h * cellW + cellW / 2);
      t.setAttribute('y', 10);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('fill', '#8b92a8');
      t.setAttribute('font-size', '8');
      t.textContent = h + 'u';
      svgElement.appendChild(t);
    }

    // Day labels + cells
    for (let d = 0; d < 7; d++) {
      // Day label
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', labelW - 4);
      t.setAttribute('y', headerH + d * cellH + cellH / 2 + 3);
      t.setAttribute('text-anchor', 'end');
      t.setAttribute('fill', '#8b92a8');
      t.setAttribute('font-size', '9');
      t.setAttribute('font-weight', 'bold');
      t.textContent = days[d];
      svgElement.appendChild(t);

      // Cells
      for (let h = 0; h < 24; h++) {
        const val = heatmap.grid[d][h];
        const range = heatmap.maxVol - heatmap.minVol || 1;
        const intensity = val > 0 ? (val - heatmap.minVol) / range : 0;
        const isPeak = (d === heatmap.peakDay && h === heatmap.peakHour);

        // Color: low = dark blue, mid = orange, high = red
        let r, g, b, opacity;
        if (intensity < 0.33) {
          // Cool blue
          const t = intensity / 0.33;
          r = Math.round(40 + t * 80);
          g = Math.round(60 + t * 100);
          b = Math.round(120 + t * 60);
          opacity = 0.5 + intensity;
        } else if (intensity < 0.66) {
          // Yellow-orange
          const t = (intensity - 0.33) / 0.33;
          r = 200 + Math.round(t * 55);
          g = 160 - Math.round(t * 40);
          b = 50;
          opacity = 0.85;
        } else {
          // Red hot
          const t = (intensity - 0.66) / 0.34;
          r = 255;
          g = Math.round(120 - t * 50);
          b = Math.round(60 - t * 60);
          opacity = 0.95;
        }

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', labelW + h * cellW + 0.5);
        rect.setAttribute('y', headerH + d * cellH + 0.5);
        rect.setAttribute('width', cellW - 1);
        rect.setAttribute('height', cellH - 1);
        rect.setAttribute('fill', `rgba(${r}, ${g}, ${b}, ${opacity})`);
        if (isPeak) {
          rect.setAttribute('stroke', '#fff');
          rect.setAttribute('stroke-width', '1.5');
        }
        svgElement.appendChild(rect);
      }
    }
  }

  function getInfoText(heatmap) {
    if (!heatmap) return 'Onvoldoende data';
    const days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
    return `Meest beweeglijk: <b>${days[heatmap.peakDay]} ${heatmap.peakHour}:00 UTC</b> (${heatmap.peakVal.toFixed(2)}%)`;
  }

  return { calculate, renderSVG, getInfoText };
})();

// ============================================================
// MODULE: Liquidation Zones (proxy schatting)
// Werkelijke liquidation heatmap vereist Hyblock-style data.
// Wij schatten op basis van: recente swing high/low + open interest
// + funding rate. Veel-gebruikte hefbomen: 10x, 25x, 50x, 100x.
// ============================================================
window.LiquidationZones = (function() {
  // Schat liquidation prices voor verschillende hefbomen
  // Long liq price = entry × (1 - 1/leverage)
  // Short liq price = entry × (1 + 1/leverage)
  function estimate(currentPrice, recentHigh, recentLow, openInterest, fundingRate) {
    const zones = [];

    // Short liq zones (boven huidige prijs - shorts geliquideerd bij stijging)
    // We nemen aan dat shorts zijn ingestapt rond recent highs of in de range
    const shortEntries = [
      { entry: currentPrice, leverage: 50 },
      { entry: currentPrice, leverage: 25 },
      { entry: currentPrice, leverage: 10 },
      { entry: (currentPrice + recentHigh) / 2, leverage: 25 } // gemiddelde recent high
    ];

    for (const se of shortEntries) {
      const liqPrice = se.entry * (1 + 1 / se.leverage);
      if (liqPrice > currentPrice * 1.005 && liqPrice < currentPrice * 1.30) {
        zones.push({
          side: 'short',
          price: liqPrice,
          leverage: se.leverage,
          distance: ((liqPrice - currentPrice) / currentPrice) * 100,
          // strength: hogere hefboom = waarschijnlijker een cluster
          strength: se.leverage / 10
        });
      }
    }

    // Long liq zones (onder huidige prijs - longs geliquideerd bij daling)
    const longEntries = [
      { entry: currentPrice, leverage: 50 },
      { entry: currentPrice, leverage: 25 },
      { entry: currentPrice, leverage: 10 },
      { entry: (currentPrice + recentLow) / 2, leverage: 25 }
    ];

    for (const le of longEntries) {
      const liqPrice = le.entry * (1 - 1 / le.leverage);
      if (liqPrice < currentPrice * 0.995 && liqPrice > currentPrice * 0.70) {
        zones.push({
          side: 'long',
          price: liqPrice,
          leverage: le.leverage,
          distance: ((currentPrice - liqPrice) / currentPrice) * 100,
          strength: le.leverage / 10
        });
      }
    }

    // Cluster zones die binnen 0.5% van elkaar zitten
    const clustered = [];
    const sorted = zones.sort((a, b) => a.price - b.price);
    let current = null;
    for (const z of sorted) {
      if (current && Math.abs(z.price - current.price) / current.price < 0.005 && z.side === current.side) {
        current.strength += z.strength;
        current.leverages.push(z.leverage);
      } else {
        current = { ...z, leverages: [z.leverage] };
        clustered.push(current);
      }
    }

    // Funding bias - als funding heel positief, longs betalen shorts (markt overhauld long)
    // Dat betekent dat **long liq zones gevaarlijker zijn** (cascade risk)
    // Funding heel negatief = shorts betalen, **short liq zones gevaarlijker**
    let fundingBias = 'neutraal';
    let fundingDesc = '';
    if (fundingRate !== null && fundingRate !== undefined) {
      const annualizedPct = fundingRate * 3 * 365 * 100; // 8h funding * 3/dag * 365
      if (fundingRate > 0.0005) { // > 0.05% per 8h = > 54% jaarlijks
        fundingBias = 'long-heavy';
        fundingDesc = `Longs betalen veel (${annualizedPct.toFixed(0)}%/jaar). Risico op long squeeze.`;
      } else if (fundingRate > 0.0001) {
        fundingBias = 'long-licht';
        fundingDesc = `Lichte long-bias (${annualizedPct.toFixed(0)}%/jaar funding).`;
      } else if (fundingRate < -0.0005) {
        fundingBias = 'short-heavy';
        fundingDesc = `Shorts betalen veel (${annualizedPct.toFixed(0)}%/jaar). Risico op short squeeze.`;
      } else if (fundingRate < -0.0001) {
        fundingBias = 'short-licht';
        fundingDesc = `Lichte short-bias (${annualizedPct.toFixed(0)}%/jaar funding).`;
      } else {
        fundingDesc = 'Funding bijna neutraal — gebalanceerde markt.';
      }
    } else {
      fundingDesc = 'Funding rate niet beschikbaar.';
    }

    // Sort: shorts boven, longs onder, op afstand
    const shortZones = clustered.filter(z => z.side === 'short').sort((a, b) => a.distance - b.distance).slice(0, 3);
    const longZones = clustered.filter(z => z.side === 'long').sort((a, b) => a.distance - b.distance).slice(0, 3);

    return {
      short: shortZones,
      long: longZones,
      fundingBias,
      fundingDesc,
      openInterest
    };
  }

  return { estimate };
})();

// ============================================================
// MODULE: Multi-Timeframe Matrix
// ============================================================
window.MTF = (function() {
  // Voor elke timeframe: bepaal trend / momentum / volume status
  // Gebruikt bestaande Indicators
  function evaluate(candles, timeframeName) {
    const I = window.Indicators;
    const c = I.closes(candles);
    if (c.length < 50) return { trend: 'neutral', momentum: 'neutral', volume: 'neutral' };

    // TREND: EMA9 vs EMA21
    const ema9 = I.ema(c, 9);
    const ema21 = I.ema(c, 21);
    let trend = 'neutral';
    if (ema9 !== null && ema21 !== null) {
      const diff = (ema9 - ema21) / ema21;
      if (diff > 0.005) trend = 'up';
      else if (diff < -0.005) trend = 'down';
    }

    // MOMENTUM: RSI
    const r = I.rsi(c, 14);
    let momentum = 'neutral';
    if (r !== null) {
      if (r > 55) momentum = 'up';
      else if (r < 45) momentum = 'down';
    }

    // VOLUME: recent vs average + price direction
    let volume = 'neutral';
    if (candles.length >= 20 && candles[0].volume > 0) {
      const recentVol = candles.slice(-5).reduce((a, b) => a + b.volume, 0) / 5;
      const avgVol = candles.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;
      const recentReturn = (c[c.length - 1] - c[c.length - 5]) / c[c.length - 5];
      const volRatio = recentVol / avgVol;
      if (volRatio > 1.2 && recentReturn > 0.005) volume = 'up';
      else if (volRatio > 1.2 && recentReturn < -0.005) volume = 'down';
    }

    return { trend, momentum, volume };
  }

  return { evaluate };
})();

// ============================================================
// MODULE: Scoring (hybride Corné + Nick)
// ============================================================
window.Scoring = (function() {
  const I = window.Indicators;

  function buildIndicators(timeframe, hourly, daily, macro) {
    const list = [];
    const candles = hourly;
    const c = I.closes(candles);
    const last = c[c.length - 1];

    const cfg = {
      6: { rsi: 5, stoch: 7, emaShort: 5, emaLong: 13, ema3: 30, momentum: 4, bb: 14,
        weights: { ema_cross: 1.7, ema_long: 1.0, rsi: 1.5, stoch: 1.3, macd: 1.2, bb: 0.9, mom: 1.6, vol: 1.4, trend: 0.6, adx: 0.9, cci: 0.9, willr: 0.9, mfi: 1.2, obv: 0.9, vwap: 1.5, action: 1.1, ema200: 0.4, golden: 0.3, macro: 0.6, eth_btc: 0.6, gold: 0.4 } },
      12: { rsi: 9, stoch: 14, emaShort: 9, emaLong: 21, ema3: 50, momentum: 8, bb: 20,
        weights: { ema_cross: 1.5, ema_long: 1.1, rsi: 1.3, stoch: 1.1, macd: 1.4, bb: 1.0, mom: 1.3, vol: 1.2, trend: 0.8, adx: 1.1, cci: 0.8, willr: 0.8, mfi: 1.1, obv: 1.0, vwap: 1.2, action: 1.0, ema200: 0.6, golden: 0.5, macro: 0.9, eth_btc: 0.8, gold: 0.5 } },
      24: { rsi: 14, stoch: 14, emaShort: 12, emaLong: 26, ema3: 50, momentum: 12, bb: 20,
        weights: { ema_cross: 1.4, ema_long: 1.2, rsi: 1.2, stoch: 1.0, macd: 1.5, bb: 1.0, mom: 1.1, vol: 1.0, trend: 1.0, adx: 1.2, cci: 0.9, willr: 0.7, mfi: 1.0, obv: 1.0, vwap: 1.0, action: 0.9, ema200: 0.8, golden: 0.7, macro: 1.0, eth_btc: 0.9, gold: 0.6 } }
    };
    const C = cfg[timeframe];

    // TREND
    const emaShort = I.ema(c, C.emaShort);
    const emaLong = I.ema(c, C.emaLong);
    if (emaShort !== null && emaLong !== null) {
      const diff = (emaShort - emaLong) / emaLong;
      list.push({ cat: 'TREND', name: `EMA ${C.emaShort}/${C.emaLong}`, desc: emaShort > emaLong ? 'Bullish cross' : 'Bearish cross', value: fmtNum(emaShort), dir: emaShort > emaLong ? 'up' : 'down', score: I.clamp(diff / 0.05, -1, 1), weight: C.weights.ema_cross });
    }
    const ema3 = I.ema(c, C.ema3);
    if (ema3 !== null) {
      const dev = (last - ema3) / ema3;
      list.push({ cat: 'TREND', name: `EMA ${C.ema3}`, desc: last > ema3 ? 'Boven trend-lijn' : 'Onder trend-lijn', value: fmtNum(ema3), dir: last > ema3 ? 'up' : 'down', score: I.clamp(dev / 0.08, -1, 1), weight: C.weights.ema_long });
    }
    if (daily && daily.length >= 200) {
      const dc = I.closes(daily);
      const e200 = I.ema(dc, 200);
      if (e200 !== null) {
        const dev = (last - e200) / e200;
        list.push({ cat: 'TREND', name: 'EMA 200 (D)', desc: 'Daily lange-termijn', value: fmtNum(e200), dir: last > e200 ? 'up' : 'down', score: I.clamp(dev / 0.15, -1, 1), weight: C.weights.ema200 });
      }
      const e50d = I.ema(dc, 50);
      if (e50d !== null && e200 !== null) {
        const diff = (e50d - e200) / e200;
        list.push({ cat: 'TREND', name: 'EMA 50/200 (D)', desc: e50d > e200 ? 'Golden Cross zone' : 'Death Cross zone', value: ((diff) * 100).toFixed(1) + '%', dir: e50d > e200 ? 'up' : 'down', score: I.clamp(diff / 0.10, -1, 1) * 0.7, weight: C.weights.golden });
      }
    }
    const s50 = I.sma(c, 50);
    if (s50 !== null) {
      const dev = (last - s50) / s50;
      list.push({ cat: 'TREND', name: 'Trend Strength', desc: 'Afwijking SMA 50', value: (dev > 0 ? '+' : '') + (dev * 100).toFixed(2) + '%', dir: dev > 0 ? 'up' : 'down', score: I.clamp(dev / 0.04, -1, 1), weight: C.weights.trend });
    }
    const adxV = I.adx(candles, 14);
    if (adxV !== null) {
      const isStrong = adxV.adx > 25;
      const isBull = adxV.plusDI > adxV.minusDI;
      const score = isStrong ? (isBull ? I.clamp(adxV.adx / 50, 0, 1) : -I.clamp(adxV.adx / 50, 0, 1)) : (isBull ? 0.2 : -0.2);
      list.push({ cat: 'TREND', name: 'ADX', desc: isStrong ? `Sterke ${isBull ? 'bullish' : 'bearish'} trend` : 'Zwakke trend', value: adxV.adx.toFixed(1), dir: isBull ? 'up' : 'down', score, weight: C.weights.adx });
    }

    // MOMENTUM
    const r = I.rsi(c, C.rsi);
    if (r !== null) {
      let s, d, dc;
      if (r < 30) { s = 0.8; d = 'up'; dc = 'Oversold'; }
      else if (r > 70) { s = -0.8; d = 'down'; dc = 'Overbought'; }
      else { s = (r - 50) / 40; d = r > 50 ? 'up' : 'down'; dc = r > 60 ? 'Bullish momentum' : r < 40 ? 'Bearish momentum' : 'Neutraal'; }
      list.push({ cat: 'MOMENTUM', name: `RSI ${C.rsi}`, desc: dc, value: r.toFixed(1), dir: d, score: s, weight: C.weights.rsi });
    }
    const st = I.stochastic(c, C.stoch);
    if (st !== null) {
      let s, d, dc;
      if (st < 20) { s = 0.7; d = 'up'; dc = 'Oversold'; }
      else if (st > 80) { s = -0.7; d = 'down'; dc = 'Overbought'; }
      else { s = (st - 50) / 50; d = st > 50 ? 'up' : 'down'; dc = 'Neutraal'; }
      list.push({ cat: 'MOMENTUM', name: 'Stochastic', desc: dc, value: st.toFixed(1), dir: d, score: s, weight: C.weights.stoch });
    }
    const m = I.macd(c);
    if (m && m.signal !== null) {
      const histRel = m.hist / last;
      list.push({ cat: 'MOMENTUM', name: 'MACD', desc: m.macd > m.signal ? 'Bullish kruising' : 'Bearish kruising', value: m.hist > 1 ? m.hist.toFixed(0) : m.hist.toFixed(4), dir: m.macd > m.signal ? 'up' : 'down', score: I.clamp(histRel * 100, -1, 1), weight: C.weights.macd });
    }
    const mom = I.momentum(c, C.momentum);
    if (mom !== null) {
      list.push({ cat: 'MOMENTUM', name: `Momentum ${C.momentum}`, desc: `${C.momentum}-perioden change`, value: (mom > 0 ? '+' : '') + mom.toFixed(2) + '%', dir: mom > 0 ? 'up' : 'down', score: I.clamp(mom / 8, -1, 1), weight: C.weights.mom });
    }
    const wr = I.williamsR(candles, 14);
    if (wr !== null) {
      let s, d, dc;
      if (wr < -80) { s = 0.6; d = 'up'; dc = 'Oversold'; }
      else if (wr > -20) { s = -0.6; d = 'down'; dc = 'Overbought'; }
      else { s = (wr + 50) / 50; d = wr > -50 ? 'up' : 'down'; dc = 'Neutraal'; }
      list.push({ cat: 'MOMENTUM', name: 'Williams %R', desc: dc, value: wr.toFixed(1), dir: d, score: s, weight: C.weights.willr });
    }
    const ccVal = I.cci(candles, 20);
    if (ccVal !== null) {
      let s, d, dc;
      if (ccVal < -100) { s = 0.6; d = 'up'; dc = 'Oversold'; }
      else if (ccVal > 100) { s = -0.6; d = 'down'; dc = 'Overbought'; }
      else { s = ccVal / 200; d = ccVal > 0 ? 'up' : 'down'; dc = 'Normaal'; }
      list.push({ cat: 'MOMENTUM', name: 'CCI', desc: dc, value: ccVal.toFixed(1), dir: d, score: s, weight: C.weights.cci });
    }

    // VOLATILITY
    const bb = I.bollinger(c, C.bb);
    if (bb !== null) {
      let s, d, dc;
      if (bb.pctB < 0.2) { s = 0.6; d = 'up'; dc = 'Bij lower band'; }
      else if (bb.pctB > 0.8) { s = -0.6; d = 'down'; dc = 'Bij upper band'; }
      else { s = (bb.pctB - 0.5) * -1.0; d = bb.pctB > 0.5 ? 'down' : 'up'; dc = 'Binnen banden'; }
      list.push({ cat: 'VOLATILITY', name: 'Bollinger %B', desc: dc, value: bb.pctB.toFixed(2), dir: d, score: s, weight: C.weights.bb });
    }

    // VOLUME
    if (candles.length >= 20 && candles[0].volume > 0) {
      const recentVol = candles.slice(-5).reduce((a, b) => a + b.volume, 0) / 5;
      const avgVol = candles.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;
      const recentReturn = (c[c.length - 1] - c[c.length - 5]) / c[c.length - 5];
      const volRatio = recentVol / avgVol;
      const score = I.clamp(recentReturn * 20 * Math.min(volRatio, 2), -1, 1);
      list.push({ cat: 'VOLUME', name: 'Volume Trend', desc: volRatio > 1.5 ? 'Hoog volume bevestigt' : volRatio < 0.7 ? 'Laag volume' : 'Normaal', value: volRatio.toFixed(2) + 'x', dir: score > 0.05 ? 'up' : score < -0.05 ? 'down' : 'neutral', score, weight: C.weights.vol });
    }
    if (candles.length >= 30 && candles[0].volume > 0) {
      const obvNow = I.obv(candles);
      const obvBack = I.obv(candles.slice(0, -10));
      if (obvNow !== null && obvBack !== null && obvBack !== 0) {
        const trend = (obvNow - obvBack) / Math.abs(obvBack);
        list.push({ cat: 'VOLUME', name: 'OBV', desc: trend > 0 ? 'Accumulatie' : 'Distributie', value: (trend > 0 ? '+' : '') + (trend * 100).toFixed(0) + '%', dir: trend > 0 ? 'up' : 'down', score: I.clamp(trend * 2, -1, 1), weight: C.weights.obv });
      }
    }
    if (candles.length >= 20 && candles[0].volume > 0) {
      const v = I.vwap(candles, 24);
      if (v !== null) {
        const dev = (last - v) / v;
        list.push({ cat: 'VOLUME', name: 'VWAP', desc: last > v ? 'Boven VWAP' : 'Onder VWAP', value: fmtNum(v), dir: last > v ? 'up' : 'down', score: I.clamp(dev / 0.03, -1, 1), weight: C.weights.vwap });
      }
    }
    if (candles[0].volume > 0) {
      const mfiV = I.mfi(candles, 14);
      if (mfiV !== null) {
        let s, d, dc;
        if (mfiV < 20) { s = 0.7; d = 'up'; dc = 'Geld stroomt in'; }
        else if (mfiV > 80) { s = -0.7; d = 'down'; dc = 'Geld stroomt uit'; }
        else { s = (mfiV - 50) / 40; d = mfiV > 50 ? 'up' : 'down'; dc = 'Neutraal'; }
        list.push({ cat: 'VOLUME', name: 'MFI', desc: dc, value: mfiV.toFixed(1), dir: d, score: s, weight: C.weights.mfi });
      }
    }

    // ACTION
    if (candles.length >= 10) {
      const recent = candles.slice(-10);
      let hh = 0, ll = 0;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].high > recent[i-1].high) hh++;
        if (recent[i].low < recent[i-1].low) ll++;
      }
      const net = hh - ll;
      list.push({ cat: 'ACTION', name: 'Price Action', desc: hh > ll ? 'Higher highs' : ll > hh ? 'Lower lows' : 'Sideways', value: hh + 'H / ' + ll + 'L', dir: net > 0 ? 'up' : net < 0 ? 'down' : 'neutral', score: I.clamp(net / 6, -1, 1), weight: C.weights.action });
    }

    // MACRO
    if (macro) {
      if (macro.eurUsdChange30d !== null && macro.eurUsdChange30d !== undefined) {
        list.push({ cat: 'MACRO', name: 'EUR/USD trend', desc: macro.eurUsdChange30d > 0 ? 'Zwakke USD (bullish)' : 'Sterke USD (bearish)', value: (macro.eurUsdChange30d > 0 ? '+' : '') + macro.eurUsdChange30d.toFixed(2) + '%', dir: macro.eurUsdChange30d > 0 ? 'up' : 'down', score: I.clamp(macro.eurUsdChange30d / 3, -1, 1), weight: C.weights.macro });
      }
      if (macro.ethBtcChange24h !== null && macro.ethBtcChange24h !== undefined) {
        list.push({ cat: 'MACRO', name: 'ETH/BTC', desc: macro.ethBtcChange24h > 0 ? 'Risk-on (alts sterk)' : 'Risk-off', value: (macro.ethBtcChange24h > 0 ? '+' : '') + macro.ethBtcChange24h.toFixed(2) + '%', dir: macro.ethBtcChange24h > 0 ? 'up' : 'down', score: I.clamp(macro.ethBtcChange24h / 4, -1, 1) * 0.7, weight: C.weights.eth_btc });
      }
      if (macro.goldChange24h !== null && macro.goldChange24h !== undefined) {
        list.push({ cat: 'MACRO', name: 'Goud', desc: macro.goldChange24h > 1 ? 'Goud rally' : macro.goldChange24h < -1 ? 'Goud zwak' : 'Stabiel', value: (macro.goldChange24h > 0 ? '+' : '') + macro.goldChange24h.toFixed(2) + '%', dir: macro.goldChange24h < 0 ? 'up' : macro.goldChange24h > 0 ? 'down' : 'neutral', score: I.clamp(-macro.goldChange24h / 3, -1, 1) * 0.5, weight: C.weights.gold });
      }
    }

    return list;
  }

  function calculateAdvice(indicators, levelFit) {
    let totalScore = 0, totalWeight = 0;
    for (const i of indicators) {
      if (typeof i.score === 'number' && !isNaN(i.score)) {
        totalScore += i.score * i.weight;
        totalWeight += i.weight;
      }
    }
    const corneScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
    let nickAdjustment = 0;
    if (levelFit !== null) {
      const levelBoost = (levelFit.fit - 50) / 50;
      const corneSign = Math.sign(corneScore);
      nickAdjustment = corneSign * levelBoost * 25;
    }
    const finalScore = corneScore * 0.6 + (corneScore + nickAdjustment) * 0.4;
    const cappedScore = Math.max(-100, Math.min(100, finalScore));

    let verdict, klass, strength;
    if (cappedScore >= 35) { verdict = 'LONG'; klass = 'long'; strength = 'Sterk signaal'; }
    else if (cappedScore >= 18) { verdict = 'LONG'; klass = 'long'; strength = 'Matig signaal'; }
    else if (cappedScore >= 5) { verdict = 'LONG'; klass = 'long'; strength = 'Zwak signaal'; }
    else if (cappedScore <= -35) { verdict = 'SHORT'; klass = 'short'; strength = 'Sterk signaal'; }
    else if (cappedScore <= -18) { verdict = 'SHORT'; klass = 'short'; strength = 'Matig signaal'; }
    else if (cappedScore <= -5) { verdict = 'SHORT'; klass = 'short'; strength = 'Zwak signaal'; }
    else if (cappedScore > 0) { verdict = 'LONG'; klass = 'long'; strength = 'Erg zwak (afwachten)'; }
    else if (cappedScore < 0) { verdict = 'SHORT'; klass = 'short'; strength = 'Erg zwak (afwachten)'; }
    else { verdict = 'WACHTEN'; klass = 'neutral'; strength = 'Neutraal'; }

    let supW = 0, oppW = 0;
    const targetDir = cappedScore > 0 ? 'up' : 'down';
    for (const i of indicators) {
      if (i.dir === targetDir) supW += i.weight;
      else if (i.dir !== 'neutral') oppW += i.weight;
    }
    const totalDirW = supW + oppW;
    const confidence = totalDirW > 0 ? Math.round((supW / totalDirW) * 100) : 50;

    return {
      score: cappedScore, corneScore, nickAdjustment,
      verdict, klass, strength, confidence,
      levelFit: levelFit ? Math.round(levelFit.fit) : null,
      levelFitReason: levelFit ? levelFit.reason : ''
    };
  }

  function fmtNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString('nl-NL');
    if (Math.abs(n) >= 1) return n.toFixed(2);
    if (Math.abs(n) >= 0.01) return n.toFixed(4);
    return n.toFixed(6);
  }

  return { buildIndicators, calculateAdvice };
})();

// ============================================================
// MAIN APP
// ============================================================
const DEFAULT_COINS = [
  { id: 'BTC', name: 'Bitcoin',  emoji: '₿', color: '#f7931a', color2: '#ff7a00' },
  { id: 'ETH', name: 'Ethereum', emoji: 'Ξ', color: '#627eea', color2: '#3c5ed8' },
  { id: 'SOL', name: 'Solana',   emoji: '◎', color: '#14f195', color2: '#9945ff' },
  { id: 'XRP', name: 'XRP',      emoji: 'X', color: '#23292f', color2: '#525252' },
  { id: 'BNB', name: 'BNB',      emoji: 'B', color: '#f3ba2f', color2: '#d4a017' },
  { id: 'ADA', name: 'Cardano',  emoji: 'A', color: '#0033ad', color2: '#003899' },
  { id: 'DOGE',name: 'Dogecoin', emoji: 'D', color: '#c2a633', color2: '#a78f2a' },
  { id: 'AVAX',name: 'Avalanche',emoji: '▲', color: '#e84142', color2: '#c93737' },
  { id: 'LINK',name: 'Chainlink',emoji: '⬡', color: '#2a5ada', color2: '#1f48b8' },
  { id: 'DOT', name: 'Polkadot', emoji: '●', color: '#e6007a', color2: '#bf0066' }
];

const MACRO_SOURCES = {
  eurUsd: 'https://api.frankfurter.dev/v1/latest?from=EUR&to=USD',
  paxg: 'https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT',
  ethBtc: 'https://api.binance.com/api/v3/ticker/24hr?symbol=ETHBTC',
  global: 'https://api.coingecko.com/api/v3/global',
  eurUsdHist: 'https://api.frankfurter.dev/v1/' + new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) + '..?from=EUR&to=USD'
};

const TOP_50_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=50&page=1&sparkline=false';
const SEARCH_URL = 'https://api.coingecko.com/api/v3/search?query=';

const els = {
  price: document.getElementById('price'), priceLabel: document.getElementById('priceLabel'),
  priceCard: document.getElementById('priceCard'), change: document.getElementById('change'),
  indicators: document.getElementById('indicators'), summary: document.getElementById('summaryText'),
  btn: document.getElementById('refreshBtn'), scanBtn: document.getElementById('scanBtn'),
  status: document.getElementById('statusDot'), source: document.getElementById('sourceInfo'),
  lastUpdate: document.getElementById('lastUpdate'),
  adviceCard: document.getElementById('adviceCard'), adviceLabel: document.getElementById('adviceLabel'),
  adviceVerdict: document.getElementById('adviceVerdict'), adviceStrength: document.getElementById('adviceStrength'),
  scoreFill: document.getElementById('scoreFill'), tfInfo: document.getElementById('tfInfo'),
  scoreVal: document.getElementById('scoreVal'), levelFitVal: document.getElementById('levelFitVal'),
  hybridDetail: document.getElementById('hybridDetail'),
  donutFill: document.getElementById('donutFill'), donutValue: document.getElementById('donutValue'),
  entryPrice: document.getElementById('entryPrice'), entryPct: document.getElementById('entryPct'),
  tpPrice: document.getElementById('tpPrice'), tpPct: document.getElementById('tpPct'),
  slPrice: document.getElementById('slPrice'), slPct: document.getElementById('slPct'),
  rrValue: document.getElementById('rrValue'), rrLabel: document.getElementById('rrLabel'),
  macroGrid: document.getElementById('macroGrid'), macroImpact: document.getElementById('macroImpact'),
  coinTabs: document.getElementById('coinTabs'), coinTabsWrapper: document.getElementById('coinTabsWrapper'),
  scannerResults: document.getElementById('scannerResults'),
  scannerContent: document.getElementById('scannerContent'),
  scannerClose: document.getElementById('scannerClose'),
  levelList: document.getElementById('levelList'), levelAction: document.getElementById('levelAction'),
  vpSvg: document.getElementById('vpSvg'),
  mtfGrid: document.getElementById('mtfGrid'),
  volHeatmapSvg: document.getElementById('volHeatmapSvg'), volHeatmapInfo: document.getElementById('volHeatmapInfo'),
  liqZones: document.getElementById('liqZones'), liqFunding: document.getElementById('liqFunding'),
  addCoinBtn: document.getElementById('addCoinBtn'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalInput: document.getElementById('modalInput'),
  modalResults: document.getElementById('modalResults'),
  modalCancel: document.getElementById('modalCancel'),
  longpressFeedback: document.getElementById('longpressFeedback')
};

// ---- STATE ----
let currentCoin = null;
let currentTimeframe = 12;
let cachedData = {};
let cachedMacro = null;
let allCoins = [...DEFAULT_COINS];
let searchTimeout = null;
let longPressTimer = null;

// Custom coins uit localStorage
function loadCustomCoins() {
  try {
    const saved = JSON.parse(localStorage.getItem('custom-coins') || '[]');
    return saved.filter(c => c.id && c.name);
  } catch (e) { return []; }
}
function saveCustomCoins(coins) {
  try { localStorage.setItem('custom-coins', JSON.stringify(coins)); } catch (e) {}
}
function addCustomCoin(coin) {
  const existing = allCoins.find(c => c.id === coin.id);
  if (existing) return false;
  const newCoin = {
    id: coin.id.toUpperCase(),
    name: coin.name,
    emoji: '⭐',
    color: '#fbbf24', color2: '#f59e0b',
    custom: true
  };
  allCoins.push(newCoin);
  const customs = loadCustomCoins();
  customs.push(newCoin);
  saveCustomCoins(customs);
  renderCoinTabs();
  return true;
}

// Initialize allCoins met saved customs
function initCoins() {
  const customs = loadCustomCoins();
  allCoins = [...DEFAULT_COINS, ...customs];
  currentCoin = allCoins[0];
}

function showLongpressFeedback(text) {
  els.longpressFeedback.textContent = text;
  els.longpressFeedback.classList.add('show');
  setTimeout(() => { els.longpressFeedback.classList.remove('show'); }, 2000);
}

// ---- FETCH HELPERS ----
async function fetchWithTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, mode: 'cors', cache: 'no-store' });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) { clearTimeout(t); throw e; }
}

async function fetchCoinData(coin, eurUsd) {
  async function fetchKlines(symbol, interval, limit) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const d = await fetchWithTimeout(url);
    return d.map(k => ({ time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
  }
  async function fetchTicker(symbol) {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    const d = await fetchWithTimeout(url);
    return { price: parseFloat(d.lastPrice), change24h: parseFloat(d.priceChangePercent) };
  }

  const eurSymbol = coin.id + 'EUR';
  const usdtSymbol = coin.id + 'USDT';
  let hourly, daily, fourH, oneH, price;
  let conversionFactor = 1;

  try {
    [hourly, daily, fourH, oneH, price] = await Promise.all([
      fetchKlines(eurSymbol, '1h', 500),
      fetchKlines(eurSymbol, '1d', 250),
      fetchKlines(eurSymbol, '4h', 200),
      fetchKlines(eurSymbol, '1h', 200),
      fetchTicker(eurSymbol)
    ]);
  } catch (e) {
    if (!eurUsd || eurUsd <= 0) throw new Error('Geen EUR/USD koers voor conversie');
    conversionFactor = 1 / eurUsd;
    [hourly, daily, fourH, oneH, price] = await Promise.all([
      fetchKlines(usdtSymbol, '1h', 500),
      fetchKlines(usdtSymbol, '1d', 250),
      fetchKlines(usdtSymbol, '4h', 200),
      fetchKlines(usdtSymbol, '1h', 200),
      fetchTicker(usdtSymbol)
    ]);
    const conv = c => ({ time: c.time, open: c.open * conversionFactor, high: c.high * conversionFactor, low: c.low * conversionFactor, close: c.close * conversionFactor, volume: c.volume });
    hourly = hourly.map(conv); daily = daily.map(conv); fourH = fourH.map(conv); oneH = oneH.map(conv);
    price = { price: price.price * conversionFactor, change24h: price.change24h };
  }

  // Probeer Binance Futures voor liquidation data
  let openInterest = null, fundingRate = null;
  try {
    const oi = await fetchWithTimeout(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${usdtSymbol}`, 5000);
    openInterest = parseFloat(oi.openInterest);
  } catch (e) {}
  try {
    const fr = await fetchWithTimeout(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${usdtSymbol}`, 5000);
    fundingRate = parseFloat(fr.lastFundingRate);
  } catch (e) {}

  return { hourly, daily, fourH, oneH, price, openInterest, fundingRate };
}

async function fetchMacro() {
  const result = {};
  try { const d = await fetchWithTimeout(MACRO_SOURCES.eurUsd); result.eurUsd = d.rates.USD; } catch (e) { result.eurUsd = null; }
  try {
    const d = await fetchWithTimeout(MACRO_SOURCES.eurUsdHist);
    const dates = Object.keys(d.rates).sort();
    if (dates.length >= 2) {
      const f = d.rates[dates[0]].USD, l = d.rates[dates[dates.length - 1]].USD;
      result.eurUsdChange30d = ((l - f) / f) * 100;
    }
  } catch (e) { result.eurUsdChange30d = null; }
  try { const d = await fetchWithTimeout(MACRO_SOURCES.paxg); result.gold = parseFloat(d.lastPrice); result.goldChange24h = parseFloat(d.priceChangePercent); } catch (e) { result.gold = null; }
  try { const d = await fetchWithTimeout(MACRO_SOURCES.ethBtc); result.ethBtc = parseFloat(d.lastPrice); result.ethBtcChange24h = parseFloat(d.priceChangePercent); } catch (e) { result.ethBtc = null; }
  try { const d = await fetchWithTimeout(MACRO_SOURCES.global); result.btcDominance = d.data.market_cap_percentage.btc; } catch (e) { result.btcDominance = null; }
  return result;
}

// ---- TRADE LEVELS ----
function calculateLevels(candles, advice, currentPrice, timeframe, srLevels) {
  if (advice.klass === 'neutral') return null;
  const lookback = Math.min(48, timeframe * 4);
  const candlesUsed = candles.slice(-lookback);
  const atrVal = window.Indicators.atr(candles, 14) || (currentPrice * 0.02);
  const recentHigh = Math.max(...candlesUsed.map(c => c.high));
  const recentLow = Math.min(...candlesUsed.map(c => c.low));
  let entry, tp, sl;
  if (advice.klass === 'long') {
    entry = Math.max(currentPrice - atrVal * 0.5, recentLow + atrVal * 0.3);
    sl = Math.min(recentLow - atrVal * 0.5, entry - atrVal * 1.5);
    tp = entry + atrVal * 3.0;
    if (srLevels && srLevels.support.length > 0 && srLevels.support[0].distance < 3) {
      entry = Math.max(entry, srLevels.support[0].price + atrVal * 0.2);
      sl = Math.min(sl, srLevels.support[0].price - atrVal * 0.5);
    }
    if (srLevels && srLevels.resistance.length > 0 && srLevels.resistance[0].distance < 6) {
      tp = Math.min(tp, srLevels.resistance[0].price - atrVal * 0.2);
    }
  } else {
    entry = Math.min(currentPrice + atrVal * 0.5, recentHigh - atrVal * 0.3);
    sl = Math.max(recentHigh + atrVal * 0.5, entry + atrVal * 1.5);
    tp = entry - atrVal * 3.0;
    if (srLevels && srLevels.resistance.length > 0 && srLevels.resistance[0].distance < 3) {
      entry = Math.min(entry, srLevels.resistance[0].price - atrVal * 0.2);
      sl = Math.max(sl, srLevels.resistance[0].price + atrVal * 0.5);
    }
    if (srLevels && srLevels.support.length > 0 && srLevels.support[0].distance < 6) {
      tp = Math.max(tp, srLevels.support[0].price + atrVal * 0.2);
    }
  }
  const risk = Math.abs(entry - sl), reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;
  return {
    entry, tp, sl, rr, atr: atrVal, side: advice.klass,
    entryPct: ((entry - currentPrice) / currentPrice) * 100,
    tpPct: ((tp - currentPrice) / currentPrice) * 100,
    slPct: ((sl - currentPrice) / currentPrice) * 100
  };
}

// ---- RENDER ----
function fmtPrice(n) {
  if (n >= 100) return '€ ' + Math.round(n).toLocaleString('nl-NL');
  if (n >= 1) return '€ ' + n.toFixed(2);
  if (n >= 0.01) return '€ ' + n.toFixed(4);
  return '€ ' + n.toFixed(6);
}

function renderCoinTabs() {
  els.coinTabs.innerHTML = allCoins.map(coin => `
    <button class="coin-btn ${coin.id === currentCoin.id ? 'active' : ''} ${coin.custom ? 'custom' : ''}"
            data-coin-id="${coin.id}"
            style="--coin-color: ${coin.color}; --coin-color-2: ${coin.color2};">
      ${coin.custom ? '<span class="star">⭐</span>' : `<span class="coin-emoji">${coin.emoji}</span>`}
      ${coin.id}
    </button>
  `).join('');
}

function renderPrice(price, coin) {
  els.price.textContent = fmtPrice(price.price);
  els.priceLabel.textContent = coin.id + ' / EUR';
  els.priceCard.style.background = `linear-gradient(135deg, ${coin.color}22, ${coin.color}08)`;
  els.priceCard.style.borderColor = coin.color + '44';
  if (price.change24h !== null && !isNaN(price.change24h)) {
    els.change.className = 'price-change ' + (price.change24h >= 0 ? 'up' : 'down');
    els.change.textContent = `${price.change24h >= 0 ? '▲' : '▼'} ${Math.abs(price.change24h).toFixed(2)}%`;
  } else { els.change.className = 'price-change'; els.change.textContent = 'Live'; }
}

function renderIndicators(list) {
  const cats = ['TREND', 'MOMENTUM', 'VOLATILITY', 'VOLUME', 'ACTION', 'MACRO'];
  const catNames = { TREND: '📈 Trend', MOMENTUM: '⚡ Momentum', VOLATILITY: '〰️ Volatility', VOLUME: '📊 Volume', ACTION: '🎯 Price Action', MACRO: '🌍 Macro' };
  let html = '';
  for (const cat of cats) {
    const items = list.filter(i => i.cat === cat);
    if (items.length === 0) continue;
    html += `<div class="indicator-category">${catNames[cat]} (${items.length})</div>`;
    html += items.map(i => `
      <div class="indicator">
        <div class="indicator-dot ${i.dir}"></div>
        <div class="indicator-info">
          <div class="indicator-name">${i.name}</div>
          <div class="indicator-desc">${i.desc}</div>
        </div>
        <div class="indicator-value ${i.dir}">${i.value}</div>
      </div>`).join('');
  }
  els.indicators.innerHTML = html;
}

function renderAdvice(advice, timeframe) {
  els.adviceCard.className = 'advice-card ' + advice.klass;
  els.adviceLabel.textContent = `Advies komende ${timeframe}u`;
  els.adviceVerdict.textContent = advice.verdict;
  els.adviceStrength.textContent = advice.strength;

  const fill = els.scoreFill;
  const widthPct = Math.min(Math.abs(advice.score) / 2, 50);
  if (advice.score >= 0) { fill.style.left = '50%'; fill.style.right = 'auto'; fill.style.width = widthPct + '%'; }
  else { fill.style.left = 'auto'; fill.style.right = '50%'; fill.style.width = widthPct + '%'; }

  // Confidence donut
  const circumference = 2 * Math.PI * 42;
  const dashLength = (advice.confidence / 100) * circumference;
  els.donutFill.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
  let donutColor = '#94a3b8';
  if (advice.confidence >= 70) donutColor = '#22c55e';
  else if (advice.confidence >= 55) donutColor = '#fbbf24';
  else donutColor = '#ef4444';
  els.donutFill.setAttribute('stroke', donutColor);
  els.donutValue.textContent = advice.confidence + '%';
  els.donutValue.style.color = donutColor;

  els.scoreVal.textContent = (advice.score >= 0 ? '+' : '') + advice.score.toFixed(1);
  els.levelFitVal.textContent = advice.levelFit !== null ? advice.levelFit + '%' : '—';
  if (advice.levelFit !== null) {
    if (advice.levelFit >= 70) els.levelFitVal.style.color = '#22c55e';
    else if (advice.levelFit >= 50) els.levelFitVal.style.color = '#fbbf24';
    else els.levelFitVal.style.color = '#ef4444';
  } else { els.levelFitVal.style.color = '#94a3b8'; }
  els.hybridDetail.textContent = `${advice.corneScore.toFixed(0)}/${advice.nickAdjustment >= 0 ? '+' : ''}${advice.nickAdjustment.toFixed(0)}`;
}

function renderMTF(allTimeframes) {
  const days = ['1u', '4u', '1d'];
  const cols = ['Trend', 'Momentum', 'Volume'];
  const dirIcon = { up: '▲', down: '▼', neutral: '–' };

  let html = '<div class="mtf-header"></div>';
  for (const c of cols) html += `<div class="mtf-header">${c}</div>`;

  const tfData = [
    { label: '1u', data: allTimeframes.h1 },
    { label: '4u', data: allTimeframes.h4 },
    { label: '1d', data: allTimeframes.d1 }
  ];

  for (const tf of tfData) {
    html += `<div class="mtf-row-label">${tf.label}</div>`;
    html += `<div class="mtf-cell ${tf.data.trend}">${dirIcon[tf.data.trend]} Trend</div>`;
    html += `<div class="mtf-cell ${tf.data.momentum}">${dirIcon[tf.data.momentum]} Mom</div>`;
    html += `<div class="mtf-cell ${tf.data.volume}">${dirIcon[tf.data.volume]} Vol</div>`;
  }

  els.mtfGrid.innerHTML = html;
}

function renderLevelContext(srLevels, zones, currentPrice, actionHint) {
  const items = [];
  srLevels.resistance.forEach((r, idx) => items.push({ type: 'r', icon: '▲', label: idx === 0 ? 'Eerste weerstand' : `Weerstand ${idx + 1}`, price: r.price, distance: r.distance, hits: r.hits }));
  zones.supply.forEach(z => {
    const dist = ((z.midPrice - currentPrice) / currentPrice) * 100;
    items.push({ type: 'supply', icon: '▲', label: 'Supply zone', price: z.midPrice, distance: dist, range: `${window.Levels.formatPrice(z.priceLow)}-${window.Levels.formatPrice(z.priceHigh)}` });
  });
  items.sort((a, b) => a.distance - b.distance);

  const belowItems = [];
  zones.demand.forEach(z => {
    const dist = ((currentPrice - z.midPrice) / currentPrice) * 100;
    belowItems.push({ type: 'demand', icon: '▼', label: 'Demand zone', price: z.midPrice, distance: dist, range: `${window.Levels.formatPrice(z.priceLow)}-${window.Levels.formatPrice(z.priceHigh)}` });
  });
  srLevels.support.forEach((s, idx) => belowItems.push({ type: 's', icon: '▼', label: idx === 0 ? 'Eerste support' : `Support ${idx + 1}`, price: s.price, distance: s.distance, hits: s.hits }));
  belowItems.sort((a, b) => a.distance - b.distance);

  let html = '';
  if (items.length > 0) {
    items.forEach(item => {
      html += `<div class="level-row">
        <div class="level-icon ${item.type}">${item.icon}</div>
        <div class="level-text">${item.label}: <span class="level-price">${window.Levels.formatPrice(item.price)}</span>${item.hits ? ` <span style="opacity:0.6;">· ${item.hits}× getest</span>` : ''}${item.range ? ` <span style="opacity:0.6;font-size:10px;">· ${item.range}</span>` : ''}</div>
        <div class="level-distance">+${item.distance.toFixed(1)}%</div>
      </div>`;
    });
  }
  html += `<div class="level-row" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3);">
    <div class="level-icon" style="color: #a5b4fc;">●</div>
    <div class="level-text"><strong>Huidige prijs: ${window.Levels.formatPrice(currentPrice)}</strong></div>
    <div class="level-distance" style="color: #a5b4fc;">NU</div>
  </div>`;
  if (belowItems.length > 0) {
    belowItems.forEach(item => {
      html += `<div class="level-row">
        <div class="level-icon ${item.type}">${item.icon}</div>
        <div class="level-text">${item.label}: <span class="level-price">${window.Levels.formatPrice(item.price)}</span>${item.hits ? ` <span style="opacity:0.6;">· ${item.hits}× getest</span>` : ''}${item.range ? ` <span style="opacity:0.6;font-size:10px;">· ${item.range}</span>` : ''}</div>
        <div class="level-distance">-${item.distance.toFixed(1)}%</div>
      </div>`;
    });
  }
  if (html === '') html = '<div style="text-align:center;color:#8b92a8;font-size:11px;padding:8px;">Geen sterke niveaus dichtbij gedetecteerd</div>';
  els.levelList.innerHTML = html;
  if (actionHint) { els.levelAction.style.display = 'block'; els.levelAction.innerHTML = `💡 <strong>${actionHint}</strong>`; }
  else { els.levelAction.style.display = 'none'; }
}

function renderLevels(levels) {
  if (!levels) {
    els.entryPrice.textContent = '—'; els.tpPrice.textContent = '—';
    els.slPrice.textContent = '—'; els.rrValue.textContent = '—';
    els.entryPct.textContent = 'Wacht'; els.tpPct.textContent = 'op';
    els.slPct.textContent = 'signaal'; els.rrLabel.textContent = '—';
    return;
  }
  els.entryPrice.textContent = fmtPrice(levels.entry);
  els.tpPrice.textContent = fmtPrice(levels.tp);
  els.slPrice.textContent = fmtPrice(levels.sl);
  els.entryPct.textContent = (levels.entryPct >= 0 ? '+' : '') + levels.entryPct.toFixed(2) + '%';
  els.tpPct.textContent = (levels.tpPct >= 0 ? '+' : '') + levels.tpPct.toFixed(2) + '%';
  els.slPct.textContent = (levels.slPct >= 0 ? '+' : '') + levels.slPct.toFixed(2) + '%';
  els.rrValue.textContent = '1 : ' + levels.rr.toFixed(1);
  els.rrLabel.textContent = levels.side.toUpperCase();
}

function renderMacro(macro) {
  if (!macro) return;
  const items = [];
  if (macro.eurUsd !== null && macro.eurUsd !== undefined) items.push({ name: 'EUR/USD', val: macro.eurUsd.toFixed(4), dir: macro.eurUsdChange30d > 0 ? 'up' : macro.eurUsdChange30d < 0 ? 'down' : 'neutral' });
  else items.push({ name: 'EUR/USD', val: '—', dir: 'neutral' });
  if (macro.eurUsdChange30d !== null && macro.eurUsdChange30d !== undefined) items.push({ name: 'DXY (30d)', val: (macro.eurUsdChange30d > 0 ? '↓' : '↑') + Math.abs(macro.eurUsdChange30d).toFixed(1) + '%', dir: macro.eurUsdChange30d > 0 ? 'up' : 'down' });
  else items.push({ name: 'DXY (30d)', val: '—', dir: 'neutral' });
  if (macro.gold !== null && macro.gold !== undefined) items.push({ name: 'Goud', val: '$' + Math.round(macro.gold) + ' (' + (macro.goldChange24h > 0 ? '+' : '') + macro.goldChange24h.toFixed(1) + '%)', dir: macro.goldChange24h > 0 ? 'down' : 'up' });
  else items.push({ name: 'Goud', val: '—', dir: 'neutral' });
  if (macro.ethBtc !== null && macro.ethBtc !== undefined) items.push({ name: 'ETH/BTC', val: macro.ethBtc.toFixed(5) + ' (' + (macro.ethBtcChange24h > 0 ? '+' : '') + macro.ethBtcChange24h.toFixed(1) + '%)', dir: macro.ethBtcChange24h > 0 ? 'up' : 'down' });
  else items.push({ name: 'ETH/BTC', val: '—', dir: 'neutral' });

  els.macroGrid.innerHTML = items.map(i => `<div class="macro-item"><span class="macro-name">${i.name}</span><span class="macro-val ${i.dir}">${i.val}</span></div>`).join('');

  let bullish = 0, bearish = 0;
  if (macro.eurUsdChange30d > 0.5) bullish++;
  if (macro.eurUsdChange30d < -0.5) bearish++;
  if (macro.goldChange24h > 1) bearish++;
  if (macro.goldChange24h < -1) bullish++;
  if (macro.ethBtcChange24h > 0.5) bullish++;
  if (macro.ethBtcChange24h < -0.5) bearish++;
  let impact;
  if (bullish > bearish + 1) impact = '✅ Macro bullish — risk-on';
  else if (bearish > bullish + 1) impact = '⚠️ Macro bearish — risk-off';
  else impact = '➖ Macro neutraal';
  if (macro.btcDominance) impact += ` · BTC dom: ${macro.btcDominance.toFixed(1)}%`;
  els.macroImpact.textContent = impact;
}

function renderLiquidation(liqData, currentPrice) {
  if (!liqData) {
    els.liqZones.innerHTML = '<div style="text-align:center;color:#8b92a8;font-size:11px;padding:8px;">Geen Futures-data</div>';
    return;
  }
  let html = '';
  liqData.short.forEach(z => {
    html += `<div class="liq-zone short">
      <div class="liq-info">
        <div class="liq-price">${window.Levels.formatPrice(z.price)}</div>
        <div class="liq-label">Hefboom: ${z.leverages.join('×, ')}×</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="liq-side">SHORT LIQ</span>
        <span class="liq-strength">+${z.distance.toFixed(1)}%</span>
      </div>
    </div>`;
  });
  // Current price marker
  html += `<div class="liq-zone" style="background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1;">
    <div class="liq-info">
      <div class="liq-price" style="color: #c7d2fe;">${window.Levels.formatPrice(currentPrice)}</div>
      <div class="liq-label">Huidige prijs</div>
    </div>
    <span style="color: #a5b4fc; font-size: 10px;">NU</span>
  </div>`;
  liqData.long.forEach(z => {
    html += `<div class="liq-zone long">
      <div class="liq-info">
        <div class="liq-price">${window.Levels.formatPrice(z.price)}</div>
        <div class="liq-label">Hefboom: ${z.leverages.join('×, ')}×</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="liq-side">LONG LIQ</span>
        <span class="liq-strength">-${z.distance.toFixed(1)}%</span>
      </div>
    </div>`;
  });
  if (liqData.short.length === 0 && liqData.long.length === 0) {
    html = '<div style="text-align:center;color:#8b92a8;font-size:11px;padding:8px;">Geen liquidation clusters geschat</div>';
  }
  els.liqZones.innerHTML = html;
  els.liqFunding.textContent = liqData.fundingDesc;
}

function renderSummary(advice, currentCoin, timeframe) {
  let txt;
  if (advice.klass === 'long') txt = `${currentCoin.id}: LONG ${timeframe}u, ${advice.strength.toLowerCase()} (${advice.confidence}% confidence).`;
  else if (advice.klass === 'short') txt = `${currentCoin.id}: SHORT ${timeframe}u, ${advice.strength.toLowerCase()} (${advice.confidence}% confidence).`;
  else txt = `${currentCoin.id}: geen duidelijk signaal.`;
  els.summary.textContent = txt;
}

function showError(msg) {
  els.indicators.innerHTML = `<div class="error"><b>Geen verbinding</b><br>${msg}</div>`;
  els.summary.textContent = 'Verbinding mislukt — probeer opnieuw.';
  els.status.classList.remove('live'); els.status.classList.add('error');
}

// ---- COMPUTE & SHOW ----
function computeAndShow() {
  const data = cachedData[currentCoin.id];
  if (!data) return;

  const indicators = window.Scoring.buildIndicators(currentTimeframe, data.hourly, data.daily, cachedMacro);
  const srLevels = window.Levels.findSupportResistance(data.hourly, data.price.price);
  const zones = window.Levels.findSupplyDemandZones(data.hourly, data.price.price);

  let prelim = 0, totalW = 0;
  for (const i of indicators) {
    if (typeof i.score === 'number' && !isNaN(i.score)) { prelim += i.score * i.weight; totalW += i.weight; }
  }
  const corneRough = totalW > 0 ? (prelim / totalW) * 100 : 0;
  const tempAdvice = { klass: corneRough > 0 ? 'long' : corneRough < 0 ? 'short' : 'neutral' };
  const levelFit = window.Levels.calculateLevelFit(tempAdvice, data.price.price, srLevels, zones);
  const advice = window.Scoring.calculateAdvice(indicators, levelFit);
  const actionHint = window.Levels.generateActionHint({ klass: advice.klass }, data.price.price, srLevels, zones);
  const tradeLevels = calculateLevels(data.hourly, advice, data.price.price, currentTimeframe, srLevels);

  // MTF
  const mtfData = {
    h1: window.MTF.evaluate(data.oneH || data.hourly, '1u'),
    h4: window.MTF.evaluate(data.fourH || data.hourly, '4u'),
    d1: window.MTF.evaluate(data.daily, '1d')
  };

  // Volume Profile (laatste 168 hourly = 7 dagen)
  const vpCandles = data.hourly.slice(-168);
  const vp = window.VolumeProfile.calculate(vpCandles, 30);

  // Volatility heatmap (alle hourly data)
  const volHM = window.VolatilityHeatmap.calculate(data.hourly);

  // Liquidation zones
  const lookback = data.hourly.slice(-168);
  const recentHigh = Math.max(...lookback.map(c => c.high));
  const recentLow = Math.min(...lookback.map(c => c.low));
  const liqData = window.LiquidationZones.estimate(data.price.price, recentHigh, recentLow, data.openInterest, data.fundingRate);

  // RENDER
  renderPrice(data.price, currentCoin);
  renderIndicators(indicators);
  renderAdvice(advice, currentTimeframe);
  renderMTF(mtfData);
  renderLevelContext(srLevels, zones, data.price.price, actionHint);
  renderLevels(tradeLevels);
  renderLiquidation(liqData, data.price.price);
  renderSummary(advice, currentCoin, currentTimeframe);

  // SVGs renderen na korte timeout zodat layout klaar is
  setTimeout(() => {
    if (els.vpSvg && vp) {
      const r = els.vpSvg.getBoundingClientRect();
      window.VolumeProfile.renderSVG(els.vpSvg, vp, data.price.price, r.width || 400, r.height || 160);
    }
    if (els.volHeatmapSvg && volHM) {
      window.VolatilityHeatmap.renderSVG(els.volHeatmapSvg, volHM);
      els.volHeatmapInfo.innerHTML = window.VolatilityHeatmap.getInfoText(volHM);
    }
  }, 50);

  const labels = { 6: '6u model', 12: '12u model', 24: '24u model' };
  els.tfInfo.textContent = labels[currentTimeframe];
  els.source.textContent = `${currentCoin.name} via Binance · ${srLevels.support.length}S/${srLevels.resistance.length}R · OI: ${data.openInterest ? 'ja' : 'nee'}`;
}

async function runCoin(coin) {
  if (els.btn.classList.contains('loading')) return;
  els.btn.classList.add('loading');
  els.status.classList.remove('live', 'error');
  els.summary.textContent = 'Bezig met laden…';
  els.adviceVerdict.textContent = '...';
  els.adviceStrength.textContent = 'Berekenen...';
  els.indicators.innerHTML = Array.from({length: 8}).map(() => `
    <div class="indicator">
      <div class="indicator-dot neutral"></div>
      <div class="indicator-info">
        <div class="indicator-name skeleton">Indicator</div>
        <div class="indicator-desc skeleton">Loading…</div>
      </div>
    </div>`).join('');
  els.levelList.innerHTML = '<div style="text-align:center;color:#8b92a8;font-size:11px;padding:8px;">Niveaus berekenen…</div>';
  els.liqZones.innerHTML = '<div style="text-align:center;color:#8b92a8;font-size:11px;padding:8px;">Berekenen…</div>';

  try {
    if (!cachedMacro) { cachedMacro = await fetchMacro(); renderMacro(cachedMacro); }
    const data = await fetchCoinData(coin, cachedMacro ? cachedMacro.eurUsd : null);
    cachedData[coin.id] = data;
    computeAndShow();
    els.status.classList.add('live');
    const now = new Date();
    els.lastUpdate.textContent = 'Bijgewerkt: ' + now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    console.error(e);
    showError(e.message);
  } finally {
    els.btn.classList.remove('loading');
  }
}

// ---- SCANNER (top 50) ----
async function runScanner() {
  els.scanBtn.disabled = true;
  els.scanBtn.innerHTML = '⏳ Scannen…';
  els.scannerResults.classList.add('show');

  const renderProgress = (current, total, status) => {
    els.scannerContent.innerHTML = `<div class="scanner-progress">${status}<br><small>${current} / ${total} coins</small><div class="scanner-progress-bar"><div class="scanner-progress-fill" style="width: ${(current/total)*100}%"></div></div></div>`;
  };

  try {
    renderProgress(0, 50, 'Top 50 coins ophalen…');
    const top50 = await fetchWithTimeout(TOP_50_URL, 15000);
    const skipSymbols = new Set(['USDT','USDC','DAI','BUSD','TUSD','FDUSD','USDE','PYUSD','WBTC','WETH','STETH','WSTETH','WEETH','RETH','CBBTC','BSC-USD']);
    const candidates = top50.filter(c => !skipSymbols.has(c.symbol.toUpperCase())).slice(0, 50);
    if (!cachedMacro) cachedMacro = await fetchMacro();

    const results = [];
    let processed = 0;
    for (const c of candidates) {
      processed++;
      const symbol = c.symbol.toUpperCase();
      renderProgress(processed, candidates.length, `Analyseren: ${symbol}`);
      try {
        const usdtSymbol = symbol + 'USDT';
        const conv = 1 / cachedMacro.eurUsd;
        const klinesData = await fetchWithTimeout(`https://api.binance.com/api/v3/klines?symbol=${usdtSymbol}&interval=1h&limit=300`, 8000);
        if (!klinesData || klinesData.length < 100) throw new Error('te weinig data');
        const hourly = klinesData.map(k => ({ time: k[0], open: parseFloat(k[1]) * conv, high: parseFloat(k[2]) * conv, low: parseFloat(k[3]) * conv, close: parseFloat(k[4]) * conv, volume: parseFloat(k[5]) }));
        const indicators = window.Scoring.buildIndicators(currentTimeframe, hourly, [], null);
        const advice = window.Scoring.calculateAdvice(indicators, null);
        results.push({ symbol, name: c.name, score: advice.score, verdict: advice.verdict, klass: advice.klass, confidence: advice.confidence, price: hourly[hourly.length - 1].close });
      } catch (e) { console.warn(`${symbol} skipped:`, e.message); }
      await new Promise(r => setTimeout(r, 80));
    }

    const longs = results.filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    const shorts = results.filter(r => r.score < 0).sort((a, b) => a.score - b.score).slice(0, 5);

    let html = `<div class="scanner-cols"><div class="scanner-col long"><div class="scanner-col-title">📈 Top 5 LONG</div>`;
    if (longs.length === 0) html += '<div style="text-align:center;font-size:11px;color:#8b92a8;padding:10px;">Geen bullish coins</div>';
    else html += longs.map(r => `<div class="scanner-coin" data-symbol="${r.symbol}" data-name="${r.name}"><div class="scanner-coin-info"><div class="scanner-coin-symbol">${r.symbol}</div><div class="scanner-coin-name">${r.name}</div></div><div class="scanner-coin-score">+${r.score.toFixed(1)}</div></div>`).join('');
    html += `</div><div class="scanner-col short"><div class="scanner-col-title">📉 Top 5 SHORT</div>`;
    if (shorts.length === 0) html += '<div style="text-align:center;font-size:11px;color:#8b92a8;padding:10px;">Geen bearish coins</div>';
    else html += shorts.map(r => `<div class="scanner-coin" data-symbol="${r.symbol}" data-name="${r.name}"><div class="scanner-coin-info"><div class="scanner-coin-symbol">${r.symbol}</div><div class="scanner-coin-name">${r.name}</div></div><div class="scanner-coin-score">${r.score.toFixed(1)}</div></div>`).join('');
    html += `</div></div><div class="scanner-hint">Tap = bekijken · Lang ingedrukt = toevoegen aan ⭐ favorieten</div><div style="text-align:center;font-size:10px;color:#5a627a;margin-top:6px;">${results.length} coins · ${currentTimeframe}u model</div>`;
    els.scannerContent.innerHTML = html;
  } catch (e) {
    console.error(e);
    els.scannerContent.innerHTML = `<div class="error"><b>Scan mislukt</b><br>${e.message}</div>`;
  } finally {
    els.scanBtn.disabled = false;
    els.scanBtn.innerHTML = '<span>🔍</span> Scan Top 50';
  }
}

// ---- MODAL: Coin search ----
async function searchCoins(query) {
  if (!query || query.length < 2) {
    els.modalResults.innerHTML = '<div class="modal-loading">Begin met typen om te zoeken…</div>';
    return;
  }
  els.modalResults.innerHTML = '<div class="modal-loading">Zoeken…</div>';
  try {
    const data = await fetchWithTimeout(SEARCH_URL + encodeURIComponent(query), 10000);
    const coins = (data.coins || []).slice(0, 15);
    if (coins.length === 0) {
      els.modalResults.innerHTML = '<div class="modal-loading">Geen resultaten</div>';
      return;
    }

    // Voor elke coin: check beschikbaarheid op Binance USDT pair
    if (!cachedMacro) cachedMacro = await fetchMacro();

    let html = '';
    for (const coin of coins) {
      const symbol = (coin.symbol || '').toUpperCase();
      if (!symbol) continue;
      // Check of al in lijst
      const exists = allCoins.find(c => c.id === symbol);
      const statusClass = exists ? 'unavailable' : '';
      const statusText = exists ? 'Al toegevoegd' : 'Toevoegen';
      const statusBg = exists ? 'unavailable' : '';
      html += `<div class="modal-result-item ${statusClass}" data-symbol="${symbol}" data-name="${coin.name || symbol}">
        <div>
          <div class="modal-result-symbol">${symbol}</div>
          <div class="modal-result-name">${coin.name || ''}</div>
        </div>
        <span class="modal-result-status ${statusBg}">${statusText}</span>
      </div>`;
    }
    els.modalResults.innerHTML = html;
  } catch (e) {
    els.modalResults.innerHTML = '<div class="modal-loading">Zoeken mislukt: ' + e.message + '</div>';
  }
}

function openModal() {
  els.modalBackdrop.classList.add('show');
  els.modalInput.value = '';
  els.modalInput.focus();
  els.modalResults.innerHTML = '<div class="modal-loading">Begin met typen om te zoeken…</div>';
}
function closeModal() {
  els.modalBackdrop.classList.remove('show');
}

// ---- EVENT LISTENERS ----
els.btn.addEventListener('click', () => {
  cachedData = {};
  cachedMacro = null;
  runCoin(currentCoin);
});

els.scanBtn.addEventListener('click', runScanner);
els.scannerClose.addEventListener('click', () => els.scannerResults.classList.remove('show'));

els.coinTabs.addEventListener('click', function(e) {
  const btn = e.target.closest('.coin-btn');
  if (!btn) return;
  const coinId = btn.dataset.coinId;
  const coin = allCoins.find(c => c.id === coinId);
  if (!coin || coin.id === currentCoin.id) return;
  currentCoin = coin;
  document.querySelectorAll('.coin-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (cachedData[coin.id]) computeAndShow();
  else runCoin(coin);
});

document.getElementById('tfTabs').addEventListener('click', function(e) {
  const btn = e.target.closest('.tf-btn');
  if (!btn) return;
  const tf = parseInt(btn.dataset.tf);
  if (tf === currentTimeframe) return;
  document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTimeframe = tf;
  if (cachedData[currentCoin.id]) computeAndShow();
});

// Scanner click + long-press
els.scannerContent.addEventListener('click', function(e) {
  const coinEl = e.target.closest('.scanner-coin');
  if (!coinEl) return;
  if (coinEl._wasLongPressed) {
    coinEl._wasLongPressed = false;
    return; // skip click na long press
  }
  const symbol = coinEl.dataset.symbol;
  const coin = allCoins.find(c => c.id === symbol);
  if (coin) {
    currentCoin = coin;
    document.querySelectorAll('.coin-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.coin-btn[data-coin-id="${symbol}"]`)?.classList.add('active');
    els.scannerResults.classList.remove('show');
    runCoin(coin);
  }
});

// Long-press handler op scanner items
els.scannerContent.addEventListener('touchstart', function(e) {
  const coinEl = e.target.closest('.scanner-coin');
  if (!coinEl) return;
  longPressTimer = setTimeout(() => {
    const symbol = coinEl.dataset.symbol;
    const name = coinEl.dataset.name;
    if (symbol && !allCoins.find(c => c.id === symbol)) {
      addCustomCoin({ id: symbol, name: name });
      showLongpressFeedback(`⭐ ${symbol} toegevoegd`);
      coinEl._wasLongPressed = true;
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, 600);
}, { passive: true });

els.scannerContent.addEventListener('touchend', function() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
}, { passive: true });

els.scannerContent.addEventListener('touchmove', function() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
}, { passive: true });

// Modal - coin add
els.addCoinBtn.addEventListener('click', openModal);
els.modalCancel.addEventListener('click', closeModal);
els.modalBackdrop.addEventListener('click', function(e) {
  if (e.target === els.modalBackdrop) closeModal();
});

els.modalInput.addEventListener('input', function(e) {
  if (searchTimeout) clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  searchTimeout = setTimeout(() => searchCoins(query), 400);
});

els.modalResults.addEventListener('click', function(e) {
  const item = e.target.closest('.modal-result-item');
  if (!item || item.classList.contains('unavailable')) return;
  const symbol = item.dataset.symbol;
  const name = item.dataset.name;
  if (addCustomCoin({ id: symbol, name: name })) {
    showLongpressFeedback(`⭐ ${symbol} toegevoegd`);
    closeModal();
  }
});

// Init
initCoins();
renderCoinTabs();
window.addEventListener('load', () => runCoin(currentCoin));

let lastRunTime = Date.now();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastRunTime > 60000) {
    lastRunTime = Date.now();
    cachedData = {};
    cachedMacro = null;
    runCoin(currentCoin);
  }
});
