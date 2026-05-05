// ============================================================
// indicators.js - Technische indicator berekeningen
// Pure functions, geen DOM, geen state
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
      if (eFast[i] !== null && eSlow[i] !== null) {
        macdLineSeries.push(eFast[i] - eSlow[i]);
      }
    }
    if (macdLineSeries.length < sig) return null;
    const signal = ema(macdLineSeries, sig);
    const macdVal = macdLineSeries[macdLineSeries.length - 1];
    return { macd: macdVal, signal, hist: macdVal - signal };
  }

  function bollinger(arr, p = 20, mul = 2) {
    if (arr.length < p) return null;
    const s = arr.slice(-p);
    const mean = s.reduce((a, b) => a + b, 0) / p;
    const std = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / p);
    const last = arr[arr.length - 1];
    return { pctB: (last - (mean - 2 * std)) / (4 * std), upper: mean + 2*std, lower: mean - 2*std, mean };
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

  // Public API
  return {
    clamp, closes, highs, lows,
    sma, ema, emaSeries,
    rsi, macd, bollinger, stochastic,
    momentum, atr, williamsR, cci,
    adx, obv, vwap, mfi
  };
})();
// ============================================================
// levels.js - Support/Resistance & Supply/Demand detectie
// Nick Veldkamp (CryptoCoinTalk) methodiek
// ============================================================

window.Levels = (function() {

  // ============================================================
  // PIVOT DETECTION
  // Een pivot high = candle waarvan high hoger is dan N candles
  // links én N candles rechts. Pivot low = vice versa.
  // ============================================================
  function findPivots(candles, lookback = 5) {
    const pivotHighs = [];
    const pivotLows = [];

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

  // ============================================================
  // CLUSTER LEVELS - groepeer pivots die dichtbij elkaar liggen
  // Punten binnen X% van elkaar = zelfde niveau (sterker = meer hits)
  // ============================================================
  function clusterPivots(pivots, currentPrice, clusterPct = 0.012) {
    if (pivots.length === 0) return [];

    const sorted = [...pivots].sort((a, b) => a.price - b.price);
    const clusters = [];
    let current = { prices: [sorted[0].price], times: [sorted[0].time], indexes: [sorted[0].index] };

    for (let i = 1; i < sorted.length; i++) {
      const lastPrice = current.prices[current.prices.length - 1];
      const diff = Math.abs(sorted[i].price - lastPrice) / lastPrice;
      if (diff < clusterPct) {
        current.prices.push(sorted[i].price);
        current.times.push(sorted[i].time);
        current.indexes.push(sorted[i].index);
      } else {
        clusters.push(current);
        current = { prices: [sorted[i].price], times: [sorted[i].time], indexes: [sorted[i].index] };
      }
    }
    clusters.push(current);

    // Bereken voor elk cluster: gemiddelde prijs, sterkte (hits), recency
    return clusters.map(cl => {
      const avgPrice = cl.prices.reduce((a, b) => a + b, 0) / cl.prices.length;
      const hits = cl.prices.length;
      const lastIndex = Math.max(...cl.indexes);
      return {
        price: avgPrice,
        hits: hits,
        lastIndex: lastIndex,
        strength: hits  // simpele eerste sterkte: aantal hits
      };
    });
  }

  // ============================================================
  // FIND SUPPORT & RESISTANCE LEVELS
  // Nick's methode: combineer pivot highs (resistance) en pivot lows (support)
  // Sorteer op afstand tot huidige prijs en relevantie
  // ============================================================
  function findSupportResistance(candles, currentPrice) {
    if (candles.length < 30) return { support: [], resistance: [] };

    // Lookback is afhankelijk van candle frequentie - 5 voor hourly is ~5u zwingen
    const { pivotHighs, pivotLows } = findPivots(candles, 5);

    // Cluster ze
    const resistanceClusters = clusterPivots(pivotHighs, currentPrice, 0.012);
    const supportClusters = clusterPivots(pivotLows, currentPrice, 0.012);

    // Filter op relevantie:
    // - Resistance moet boven huidige prijs zijn
    // - Support moet onder huidige prijs zijn
    // - Hits >= 1 (technisch al zo door cluster)
    const totalCandles = candles.length;

    function scoreLevel(cluster) {
      // Recency factor: hoe recenter, hoe relevanter (0 tot 1)
      const recency = cluster.lastIndex / totalCandles;
      // Sterkte: hits gewogen met recency
      return cluster.strength * (0.5 + 0.5 * recency);
    }

    const resistance = resistanceClusters
      .filter(c => c.price > currentPrice * 1.001) // minstens 0.1% boven
      .map(c => ({ ...c, score: scoreLevel(c), distance: ((c.price - currentPrice) / currentPrice) * 100 }))
      .sort((a, b) => a.distance - b.distance) // dichtstbijzijnde eerst
      .slice(0, 3); // top 3

    const support = supportClusters
      .filter(c => c.price < currentPrice * 0.999)
      .map(c => ({ ...c, score: scoreLevel(c), distance: ((currentPrice - c.price) / currentPrice) * 100 }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return { support, resistance };
  }

  // ============================================================
  // SUPPLY/DEMAND ZONES
  // Nick's methode: gebieden met grote price moves NA consolidatie
  // Demand zone = sterke up-move uit een base
  // Supply zone = sterke down-move uit een base
  // ============================================================
  function findSupplyDemandZones(candles, currentPrice) {
    if (candles.length < 20) return { demand: [], supply: [] };

    const demand = [];
    const supply = [];

    // Look for "base then big move" patterns
    // Een base = 3+ candles met low volatility
    // Big move = candle met body > 2x average body
    const bodySizes = candles.map(c => Math.abs(c.close - c.open));
    const avgBody = bodySizes.reduce((a, b) => a + b, 0) / bodySizes.length;

    for (let i = 4; i < candles.length - 1; i++) {
      const c = candles[i];
      const body = Math.abs(c.close - c.open);

      if (body < avgBody * 1.8) continue; // niet groot genoeg

      // Check the 3 candles before: low volatility (base)?
      const baseHigh = Math.max(candles[i-3].high, candles[i-2].high, candles[i-1].high);
      const baseLow = Math.min(candles[i-3].low, candles[i-2].low, candles[i-1].low);
      const baseRange = baseHigh - baseLow;

      if (baseRange > avgBody * 2.5) continue; // base is te volatiel

      const isBullish = c.close > c.open;

      if (isBullish && c.close > baseHigh) {
        // Demand zone: range van de base candles
        demand.push({
          priceLow: baseLow,
          priceHigh: baseHigh,
          midPrice: (baseLow + baseHigh) / 2,
          index: i,
          recency: i / candles.length
        });
      } else if (!isBullish && c.close < baseLow) {
        // Supply zone
        supply.push({
          priceLow: baseLow,
          priceHigh: baseHigh,
          midPrice: (baseLow + baseHigh) / 2,
          index: i,
          recency: i / candles.length
        });
      }
    }

    // Filter active zones (niet doorbroken)
    // Demand zone is "actief" als prijs er nog niet onderdoor is gegaan
    function isDemandActive(zone, candles) {
      for (let i = zone.index + 1; i < candles.length; i++) {
        if (candles[i].close < zone.priceLow * 0.99) return false;
      }
      return true;
    }
    function isSupplyActive(zone, candles) {
      for (let i = zone.index + 1; i < candles.length; i++) {
        if (candles[i].close > zone.priceHigh * 1.01) return false;
      }
      return true;
    }

    const activeDemand = demand
      .filter(z => isDemandActive(z, candles))
      .filter(z => z.midPrice < currentPrice)
      .sort((a, b) => b.recency - a.recency)
      .slice(0, 2);

    const activeSupply = supply
      .filter(z => isSupplyActive(z, candles))
      .filter(z => z.midPrice > currentPrice)
      .sort((a, b) => b.recency - a.recency)
      .slice(0, 2);

    return { demand: activeDemand, supply: activeSupply };
  }

  // ============================================================
  // NIVEAU-FIT SCORE
  // Deze score zegt hoeveel het advies "klopt" met niveaus.
  // - LONG advies + prijs net boven sterke support = sterk kloppend
  // - LONG advies + prijs vlak onder weerstand = waarschuwing
  // - SHORT advies + prijs net onder resistance = sterk kloppend
  // ============================================================
  function calculateLevelFit(advice, currentPrice, levels, zones) {
    if (advice.klass === 'neutral') return { fit: 50, reason: 'Neutraal advies' };

    let fitScore = 50; // start neutraal
    let reasons = [];

    if (advice.klass === 'long') {
      // LONG: dichtbij support is goed, dichtbij resistance is slecht
      if (levels.support.length > 0) {
        const nearestSupport = levels.support[0];
        if (nearestSupport.distance < 1.5) {
          // Heel dichtbij support = perfect
          fitScore += 25;
          reasons.push('Bij support');
        } else if (nearestSupport.distance < 3) {
          fitScore += 15;
          reasons.push('Dichtbij support');
        }
      }
      if (levels.resistance.length > 0) {
        const nearestResistance = levels.resistance[0];
        if (nearestResistance.distance < 1.5) {
          fitScore -= 25;
          reasons.push('Vlak onder weerstand');
        } else if (nearestResistance.distance < 3) {
          fitScore -= 10;
          reasons.push('Naderende weerstand');
        }
      }
      // Demand zone aanwezig en dichtbij = bonus
      if (zones.demand.length > 0) {
        const nearestDemand = zones.demand[0];
        const distPct = ((currentPrice - nearestDemand.midPrice) / currentPrice) * 100;
        if (distPct < 2) {
          fitScore += 15;
          reasons.push('Demand-zone actief');
        }
      }
    } else if (advice.klass === 'short') {
      if (levels.resistance.length > 0) {
        const nearestResistance = levels.resistance[0];
        if (nearestResistance.distance < 1.5) {
          fitScore += 25;
          reasons.push('Bij weerstand');
        } else if (nearestResistance.distance < 3) {
          fitScore += 15;
          reasons.push('Dichtbij weerstand');
        }
      }
      if (levels.support.length > 0) {
        const nearestSupport = levels.support[0];
        if (nearestSupport.distance < 1.5) {
          fitScore -= 25;
          reasons.push('Vlak boven support');
        } else if (nearestSupport.distance < 3) {
          fitScore -= 10;
          reasons.push('Support nadert');
        }
      }
      if (zones.supply.length > 0) {
        const nearestSupply = zones.supply[0];
        const distPct = ((nearestSupply.midPrice - currentPrice) / currentPrice) * 100;
        if (distPct < 2) {
          fitScore += 15;
          reasons.push('Supply-zone actief');
        }
      }
    }

    fitScore = Math.max(0, Math.min(100, fitScore));

    return { fit: fitScore, reason: reasons.join(', ') || 'Geen sterke niveaus dichtbij' };
  }

  // ============================================================
  // GENERATE ACTION HINT
  // "Wachten op breakout boven X" type adviezen
  // ============================================================
  function generateActionHint(advice, currentPrice, levels, zones, levelFit) {
    if (advice.klass === 'neutral') return null;

    const hints = [];

    if (advice.klass === 'long') {
      // Check if we're trapped onder resistance
      if (levels.resistance.length > 0) {
        const r = levels.resistance[0];
        if (r.distance < 2) {
          hints.push(`Wachten op breakout boven ${formatPrice(r.price)} voor sterkere entry`);
        }
      }
      // Check als we tussen support en resistance zitten
      if (levels.support.length > 0 && levels.resistance.length > 0 && hints.length === 0) {
        const s = levels.support[0];
        const r = levels.resistance[0];
        if (s.distance < 2.5 && r.distance < 4) {
          hints.push(`Range ${formatPrice(s.price)} - ${formatPrice(r.price)}, koop bij support`);
        }
      }
    } else if (advice.klass === 'short') {
      if (levels.support.length > 0) {
        const s = levels.support[0];
        if (s.distance < 2) {
          hints.push(`Wachten op breakdown onder ${formatPrice(s.price)} voor sterkere entry`);
        }
      }
      if (levels.support.length > 0 && levels.resistance.length > 0 && hints.length === 0) {
        const s = levels.support[0];
        const r = levels.resistance[0];
        if (r.distance < 2.5 && s.distance < 4) {
          hints.push(`Range ${formatPrice(s.price)} - ${formatPrice(r.price)}, short bij weerstand`);
        }
      }
    }

    return hints.length > 0 ? hints[0] : null;
  }

  // Helper voor prijs-format
  function formatPrice(n) {
    if (n >= 100) return '€' + Math.round(n).toLocaleString('nl-NL');
    if (n >= 1) return '€' + n.toFixed(2);
    if (n >= 0.01) return '€' + n.toFixed(4);
    return '€' + n.toFixed(6);
  }

  return {
    findPivots,
    clusterPivots,
    findSupportResistance,
    findSupplyDemandZones,
    calculateLevelFit,
    generateActionHint,
    formatPrice
  };
})();
// ============================================================
// volume-profile.js - Volume Profile berekening + SVG heatmap
// Per prijsbucket: hoeveel volume is daar verhandeld?
// POC = Point of Control = bucket met meeste volume
// Value Area = 70% van het totale volume rond POC
// ============================================================

window.VolumeProfile = (function() {

  // ============================================================
  // BEREKEN VOLUME PROFILE
  // Verdeel prijsrange in N buckets, tel volume per bucket
  // ============================================================
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
      volume: 0,
      // Bullish vs bearish volume (TPO-stijl)
      bullVolume: 0,
      bearVolume: 0
    }));

    // Verdeel de volume van elke candle over de buckets die hij raakt
    for (const c of candles) {
      const candleRange = c.high - c.low;
      if (candleRange === 0) {
        // Doji - allocate to one bucket
        const bIdx = Math.min(bucketCount - 1, Math.max(0, Math.floor((c.close - priceMin) / bucketSize)));
        buckets[bIdx].volume += c.volume;
        if (c.close >= c.open) buckets[bIdx].bullVolume += c.volume;
        else buckets[bIdx].bearVolume += c.volume;
        continue;
      }

      // Bepaal welke buckets deze candle aanraakt
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

    // Vind POC (Point of Control)
    let pocIdx = 0;
    let maxVol = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].volume > maxVol) {
        maxVol = buckets[i].volume;
        pocIdx = i;
      }
    }

    // Bereken Value Area (70% van totaal volume rond POC)
    const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0);
    const targetVA = totalVolume * 0.70;

    let vaLowIdx = pocIdx, vaHighIdx = pocIdx;
    let cumVol = buckets[pocIdx].volume;

    while (cumVol < targetVA && (vaLowIdx > 0 || vaHighIdx < buckets.length - 1)) {
      // Pak de zijde met het hogere aangrenzende volume
      const lowVol = vaLowIdx > 0 ? buckets[vaLowIdx - 1].volume : -1;
      const highVol = vaHighIdx < buckets.length - 1 ? buckets[vaHighIdx + 1].volume : -1;

      if (lowVol < 0 && highVol < 0) break;

      if (highVol >= lowVol) {
        vaHighIdx++;
        cumVol += buckets[vaHighIdx].volume;
      } else {
        vaLowIdx--;
        cumVol += buckets[vaLowIdx].volume;
      }
    }

    return {
      buckets: buckets,
      pocIdx: pocIdx,
      pocPrice: buckets[pocIdx].priceMid,
      maxVol: maxVol,
      vaLow: buckets[vaLowIdx].priceLow,
      vaHigh: buckets[vaHighIdx].priceHigh,
      vaLowIdx: vaLowIdx,
      vaHighIdx: vaHighIdx,
      priceMin: priceMin,
      priceMax: priceMax
    };
  }

  // ============================================================
  // RENDER SVG HEATMAP
  // Horizontale balken: prijs van laag (onder) naar hoog (boven)
  // Lengte balk = volume (genormaliseerd)
  // Kleur: POC = goud, Value Area = groen-tint, buiten = grijs
  // Bull/bear ratio in elk balk
  // ============================================================
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

    // Render buckets van boven naar beneden (hoogste prijs bovenaan)
    for (let i = numBuckets - 1; i >= 0; i--) {
      const b = buckets[i];
      const yIdx = numBuckets - 1 - i;
      const y = yIdx * bucketHeight;
      const barWidth = (b.volume / profile.maxVol) * maxBarWidth;

      const isPOC = i === profile.pocIdx;
      const inVA = i >= profile.vaLowIdx && i <= profile.vaHighIdx;

      // Bull/bear ratio voor dual-color staaf
      const total = b.bullVolume + b.bearVolume;
      const bullRatio = total > 0 ? b.bullVolume / total : 0.5;
      const bullWidth = barWidth * bullRatio;
      const bearWidth = barWidth * (1 - bullRatio);

      let bullColor, bearColor;
      if (isPOC) {
        bullColor = 'rgba(251, 191, 36, 0.95)';
        bearColor = 'rgba(251, 191, 36, 0.55)';
      } else if (inVA) {
        bullColor = 'rgba(34, 197, 94, 0.7)';
        bearColor = 'rgba(239, 68, 68, 0.55)';
      } else {
        bullColor = 'rgba(34, 197, 94, 0.35)';
        bearColor = 'rgba(239, 68, 68, 0.3)';
      }

      // Bull part (groen, links)
      if (bullWidth > 0) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', 0);
        rect.setAttribute('y', y + 0.5);
        rect.setAttribute('width', bullWidth);
        rect.setAttribute('height', Math.max(1, bucketHeight - 1));
        rect.setAttribute('fill', bullColor);
        svgElement.appendChild(rect);
      }
      // Bear part (rood, rechts van bull)
      if (bearWidth > 0) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', bullWidth);
        rect.setAttribute('y', y + 0.5);
        rect.setAttribute('width', bearWidth);
        rect.setAttribute('height', Math.max(1, bucketHeight - 1));
        rect.setAttribute('fill', bearColor);
        svgElement.appendChild(rect);
      }

      // POC label (rechterkant)
      if (isPOC) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', width - 4);
        text.setAttribute('y', y + bucketHeight / 2 + 3);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', '#fbbf24');
        text.setAttribute('font-size', '9');
        text.setAttribute('font-weight', 'bold');
        text.textContent = 'POC ' + formatPriceCompact(b.priceMid);
        svgElement.appendChild(text);
      }
    }

    // Current price line - horizontale lijn op huidige prijspositie
    const priceRange = profile.priceMax - profile.priceMin;
    if (priceRange > 0 && currentPrice >= profile.priceMin && currentPrice <= profile.priceMax) {
      const yRatio = 1 - (currentPrice - profile.priceMin) / priceRange;
      const yLine = yRatio * height;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('x2', width);
      line.setAttribute('y1', yLine);
      line.setAttribute('y2', yLine);
      line.setAttribute('stroke', '#e8eaf0');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4,3');
      svgElement.appendChild(line);

      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 4);
      text.setAttribute('y', yLine - 3);
      text.setAttribute('fill', '#e8eaf0');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', 'bold');
      text.textContent = '◀ ' + formatPriceCompact(currentPrice);
      svgElement.appendChild(text);
    }

    // Top en bottom price labels
    const topText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    topText.setAttribute('x', 4);
    topText.setAttribute('y', 11);
    topText.setAttribute('fill', '#5a627a');
    topText.setAttribute('font-size', '8');
    topText.textContent = formatPriceCompact(profile.priceMax);
    svgElement.appendChild(topText);

    const bottomText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bottomText.setAttribute('x', 4);
    bottomText.setAttribute('y', height - 3);
    bottomText.setAttribute('fill', '#5a627a');
    bottomText.setAttribute('font-size', '8');
    bottomText.textContent = formatPriceCompact(profile.priceMin);
    svgElement.appendChild(bottomText);
  }

  function formatPriceCompact(n) {
    if (n >= 1000) return '€' + (n / 1000).toFixed(1) + 'k';
    if (n >= 100) return '€' + Math.round(n);
    if (n >= 1) return '€' + n.toFixed(2);
    if (n >= 0.01) return '€' + n.toFixed(3);
    return '€' + n.toFixed(5);
  }

  return {
    calculate,
    renderSVG
  };
})();
// ============================================================
// scoring.js - Hybride scoring: Corné (60%) + Nick (40%)
// + altijd richting + confidence + niveau-fit
// ============================================================

window.Scoring = (function() {

  const I = window.Indicators;

  // ============================================================
  // BUILD INDICATORS - de 20 Corné-indicatoren
  // ============================================================
  function buildIndicators(timeframe, hourly, daily, macro) {
    const list = [];
    const candles = hourly;
    const c = I.closes(candles);
    const last = c[c.length - 1];

    const cfg = {
      6: {
        rsi: 5, stoch: 7, emaShort: 5, emaLong: 13, ema3: 30,
        momentum: 4, bb: 14,
        weights: {
          ema_cross: 1.7, ema_long: 1.0, rsi: 1.5, stoch: 1.3,
          macd: 1.2, bb: 0.9, mom: 1.6, vol: 1.4, trend: 0.6,
          adx: 0.9, cci: 0.9, willr: 0.9, mfi: 1.2, obv: 0.9,
          vwap: 1.5, action: 1.1, ema200: 0.4, golden: 0.3,
          macro: 0.6, eth_btc: 0.6, gold: 0.4
        }
      },
      12: {
        rsi: 9, stoch: 14, emaShort: 9, emaLong: 21, ema3: 50,
        momentum: 8, bb: 20,
        weights: {
          ema_cross: 1.5, ema_long: 1.1, rsi: 1.3, stoch: 1.1,
          macd: 1.4, bb: 1.0, mom: 1.3, vol: 1.2, trend: 0.8,
          adx: 1.1, cci: 0.8, willr: 0.8, mfi: 1.1, obv: 1.0,
          vwap: 1.2, action: 1.0, ema200: 0.6, golden: 0.5,
          macro: 0.9, eth_btc: 0.8, gold: 0.5
        }
      },
      24: {
        rsi: 14, stoch: 14, emaShort: 12, emaLong: 26, ema3: 50,
        momentum: 12, bb: 20,
        weights: {
          ema_cross: 1.4, ema_long: 1.2, rsi: 1.2, stoch: 1.0,
          macd: 1.5, bb: 1.0, mom: 1.1, vol: 1.0, trend: 1.0,
          adx: 1.2, cci: 0.9, willr: 0.7, mfi: 1.0, obv: 1.0,
          vwap: 1.0, action: 0.9, ema200: 0.8, golden: 0.7,
          macro: 1.0, eth_btc: 0.9, gold: 0.6
        }
      }
    };

    const C = cfg[timeframe];

    // TREND
    const emaShort = I.ema(c, C.emaShort);
    const emaLong = I.ema(c, C.emaLong);
    if (emaShort !== null && emaLong !== null) {
      const diff = (emaShort - emaLong) / emaLong;
      list.push({
        cat: 'TREND', name: `EMA ${C.emaShort}/${C.emaLong}`,
        desc: emaShort > emaLong ? 'Bullish cross' : 'Bearish cross',
        value: fmtNum(emaShort),
        dir: emaShort > emaLong ? 'up' : 'down',
        score: I.clamp(diff / 0.05, -1, 1), weight: C.weights.ema_cross
      });
    }

    const ema3 = I.ema(c, C.ema3);
    if (ema3 !== null) {
      const dev = (last - ema3) / ema3;
      list.push({
        cat: 'TREND', name: `EMA ${C.ema3}`,
        desc: last > ema3 ? 'Boven trend-lijn' : 'Onder trend-lijn',
        value: fmtNum(ema3),
        dir: last > ema3 ? 'up' : 'down',
        score: I.clamp(dev / 0.08, -1, 1), weight: C.weights.ema_long
      });
    }

    if (daily && daily.length >= 200) {
      const dailyClose = I.closes(daily);
      const e200 = I.ema(dailyClose, 200);
      if (e200 !== null) {
        const dev = (last - e200) / e200;
        list.push({
          cat: 'TREND', name: 'EMA 200 (D)',
          desc: 'Daily lange-termijn',
          value: fmtNum(e200),
          dir: last > e200 ? 'up' : 'down',
          score: I.clamp(dev / 0.15, -1, 1), weight: C.weights.ema200
        });
      }
      const e50d = I.ema(dailyClose, 50);
      if (e50d !== null && e200 !== null) {
        const diff = (e50d - e200) / e200;
        list.push({
          cat: 'TREND', name: 'EMA 50/200 (D)',
          desc: e50d > e200 ? 'Golden Cross zone' : 'Death Cross zone',
          value: ((diff) * 100).toFixed(1) + '%',
          dir: e50d > e200 ? 'up' : 'down',
          score: I.clamp(diff / 0.10, -1, 1) * 0.7, weight: C.weights.golden
        });
      }
    }

    const s50 = I.sma(c, 50);
    if (s50 !== null) {
      const dev = (last - s50) / s50;
      list.push({
        cat: 'TREND', name: 'Trend Strength',
        desc: 'Afwijking SMA 50',
        value: (dev > 0 ? '+' : '') + (dev * 100).toFixed(2) + '%',
        dir: dev > 0 ? 'up' : 'down',
        score: I.clamp(dev / 0.04, -1, 1), weight: C.weights.trend
      });
    }

    const adxVal = I.adx(candles, 14);
    if (adxVal !== null) {
      const isStrongTrend = adxVal.adx > 25;
      const isBullish = adxVal.plusDI > adxVal.minusDI;
      let score = isStrongTrend
        ? (isBullish ? I.clamp(adxVal.adx / 50, 0, 1) : -I.clamp(adxVal.adx / 50, 0, 1))
        : (isBullish ? 0.2 : -0.2);
      list.push({
        cat: 'TREND', name: 'ADX',
        desc: isStrongTrend ? `Sterke ${isBullish ? 'bullish' : 'bearish'} trend` : 'Zwakke trend',
        value: adxVal.adx.toFixed(1),
        dir: isBullish ? 'up' : 'down',
        score, weight: C.weights.adx
      });
    }

    // MOMENTUM
    const r = I.rsi(c, C.rsi);
    if (r !== null) {
      let score, dir, desc;
      if (r < 30) { score = 0.8; dir = 'up'; desc = 'Oversold'; }
      else if (r > 70) { score = -0.8; dir = 'down'; desc = 'Overbought'; }
      else {
        score = (r - 50) / 40;
        dir = r > 50 ? 'up' : 'down';
        desc = r > 60 ? 'Bullish momentum' : r < 40 ? 'Bearish momentum' : 'Neutraal';
      }
      list.push({ cat: 'MOMENTUM', name: `RSI ${C.rsi}`, desc, value: r.toFixed(1), dir, score, weight: C.weights.rsi });
    }

    const st = I.stochastic(c, C.stoch);
    if (st !== null) {
      let score, dir, desc;
      if (st < 20) { score = 0.7; dir = 'up'; desc = 'Oversold'; }
      else if (st > 80) { score = -0.7; dir = 'down'; desc = 'Overbought'; }
      else { score = (st - 50) / 50; dir = st > 50 ? 'up' : 'down'; desc = 'Neutraal'; }
      list.push({ cat: 'MOMENTUM', name: 'Stochastic', desc, value: st.toFixed(1), dir, score, weight: C.weights.stoch });
    }

    const m = I.macd(c);
    if (m && m.signal !== null) {
      const histRel = m.hist / last;
      list.push({
        cat: 'MOMENTUM', name: 'MACD',
        desc: m.macd > m.signal ? 'Bullish kruising' : 'Bearish kruising',
        value: m.hist > 1 ? m.hist.toFixed(0) : m.hist.toFixed(4),
        dir: m.macd > m.signal ? 'up' : 'down',
        score: I.clamp(histRel * 100, -1, 1), weight: C.weights.macd
      });
    }

    const mom = I.momentum(c, C.momentum);
    if (mom !== null) {
      list.push({
        cat: 'MOMENTUM', name: `Momentum ${C.momentum}`,
        desc: `${C.momentum}-perioden change`,
        value: (mom > 0 ? '+' : '') + mom.toFixed(2) + '%',
        dir: mom > 0 ? 'up' : 'down',
        score: I.clamp(mom / 8, -1, 1), weight: C.weights.mom
      });
    }

    const wr = I.williamsR(candles, 14);
    if (wr !== null) {
      let score, dir, desc;
      if (wr < -80) { score = 0.6; dir = 'up'; desc = 'Oversold'; }
      else if (wr > -20) { score = -0.6; dir = 'down'; desc = 'Overbought'; }
      else { score = (wr + 50) / 50; dir = wr > -50 ? 'up' : 'down'; desc = 'Neutraal'; }
      list.push({ cat: 'MOMENTUM', name: 'Williams %R', desc, value: wr.toFixed(1), dir, score, weight: C.weights.willr });
    }

    const cciVal = I.cci(candles, 20);
    if (cciVal !== null) {
      let score, dir, desc;
      if (cciVal < -100) { score = 0.6; dir = 'up'; desc = 'Oversold'; }
      else if (cciVal > 100) { score = -0.6; dir = 'down'; desc = 'Overbought'; }
      else { score = cciVal / 200; dir = cciVal > 0 ? 'up' : 'down'; desc = 'Normaal'; }
      list.push({ cat: 'MOMENTUM', name: 'CCI', desc, value: cciVal.toFixed(1), dir, score, weight: C.weights.cci });
    }

    // VOLATILITY
    const bb = I.bollinger(c, C.bb);
    if (bb !== null) {
      let score, dir, desc;
      if (bb.pctB < 0.2) { score = 0.6; dir = 'up'; desc = 'Bij lower band'; }
      else if (bb.pctB > 0.8) { score = -0.6; dir = 'down'; desc = 'Bij upper band'; }
      else { score = (bb.pctB - 0.5) * -1.0; dir = bb.pctB > 0.5 ? 'down' : 'up'; desc = 'Binnen banden'; }
      list.push({ cat: 'VOLATILITY', name: 'Bollinger %B', desc, value: bb.pctB.toFixed(2), dir, score, weight: C.weights.bb });
    }

    // VOLUME
    if (candles.length >= 20 && candles[0].volume > 0) {
      const recentVol = candles.slice(-5).reduce((a, b) => a + b.volume, 0) / 5;
      const avgVol = candles.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;
      const recentReturn = (c[c.length - 1] - c[c.length - 5]) / c[c.length - 5];
      const volRatio = recentVol / avgVol;
      const score = I.clamp(recentReturn * 20 * Math.min(volRatio, 2), -1, 1);
      list.push({
        cat: 'VOLUME', name: 'Volume Trend',
        desc: volRatio > 1.5 ? 'Hoog volume bevestigt' : volRatio < 0.7 ? 'Laag volume' : 'Normaal',
        value: volRatio.toFixed(2) + 'x',
        dir: score > 0.05 ? 'up' : score < -0.05 ? 'down' : 'neutral',
        score, weight: C.weights.vol
      });
    }

    if (candles.length >= 30 && candles[0].volume > 0) {
      const obvNow = I.obv(candles);
      const obvBack = I.obv(candles.slice(0, -10));
      if (obvNow !== null && obvBack !== null && obvBack !== 0) {
        const trend = (obvNow - obvBack) / Math.abs(obvBack);
        list.push({
          cat: 'VOLUME', name: 'OBV',
          desc: trend > 0 ? 'Accumulatie' : 'Distributie',
          value: (trend > 0 ? '+' : '') + (trend * 100).toFixed(0) + '%',
          dir: trend > 0 ? 'up' : 'down',
          score: I.clamp(trend * 2, -1, 1), weight: C.weights.obv
        });
      }
    }

    if (candles.length >= 20 && candles[0].volume > 0) {
      const v = I.vwap(candles, 24);
      if (v !== null) {
        const dev = (last - v) / v;
        list.push({
          cat: 'VOLUME', name: 'VWAP',
          desc: last > v ? 'Boven VWAP (bullish)' : 'Onder VWAP (bearish)',
          value: fmtNum(v),
          dir: last > v ? 'up' : 'down',
          score: I.clamp(dev / 0.03, -1, 1), weight: C.weights.vwap
        });
      }
    }

    if (candles[0].volume > 0) {
      const mfiVal = I.mfi(candles, 14);
      if (mfiVal !== null) {
        let score, dir, desc;
        if (mfiVal < 20) { score = 0.7; dir = 'up'; desc = 'Geld stroomt in'; }
        else if (mfiVal > 80) { score = -0.7; dir = 'down'; desc = 'Geld stroomt uit'; }
        else { score = (mfiVal - 50) / 40; dir = mfiVal > 50 ? 'up' : 'down'; desc = 'Neutraal'; }
        list.push({ cat: 'VOLUME', name: 'MFI', desc, value: mfiVal.toFixed(1), dir, score, weight: C.weights.mfi });
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
      list.push({
        cat: 'ACTION', name: 'Price Action',
        desc: hh > ll ? 'Higher highs' : ll > hh ? 'Lower lows' : 'Sideways',
        value: hh + 'H / ' + ll + 'L',
        dir: net > 0 ? 'up' : net < 0 ? 'down' : 'neutral',
        score: I.clamp(net / 6, -1, 1), weight: C.weights.action
      });
    }

    // MACRO
    if (macro) {
      if (macro.eurUsdChange30d !== null && macro.eurUsdChange30d !== undefined) {
        list.push({
          cat: 'MACRO', name: 'EUR/USD trend',
          desc: macro.eurUsdChange30d > 0 ? 'Zwakke USD (bullish)' : 'Sterke USD (bearish)',
          value: (macro.eurUsdChange30d > 0 ? '+' : '') + macro.eurUsdChange30d.toFixed(2) + '%',
          dir: macro.eurUsdChange30d > 0 ? 'up' : 'down',
          score: I.clamp(macro.eurUsdChange30d / 3, -1, 1), weight: C.weights.macro
        });
      }
      if (macro.ethBtcChange24h !== null && macro.ethBtcChange24h !== undefined) {
        list.push({
          cat: 'MACRO', name: 'ETH/BTC',
          desc: macro.ethBtcChange24h > 0 ? 'Risk-on (alts sterk)' : 'Risk-off',
          value: (macro.ethBtcChange24h > 0 ? '+' : '') + macro.ethBtcChange24h.toFixed(2) + '%',
          dir: macro.ethBtcChange24h > 0 ? 'up' : 'down',
          score: I.clamp(macro.ethBtcChange24h / 4, -1, 1) * 0.7, weight: C.weights.eth_btc
        });
      }
      if (macro.goldChange24h !== null && macro.goldChange24h !== undefined) {
        list.push({
          cat: 'MACRO', name: 'Goud',
          desc: macro.goldChange24h > 1 ? 'Goud rally' : macro.goldChange24h < -1 ? 'Goud zwak' : 'Stabiel',
          value: (macro.goldChange24h > 0 ? '+' : '') + macro.goldChange24h.toFixed(2) + '%',
          dir: macro.goldChange24h < 0 ? 'up' : macro.goldChange24h > 0 ? 'down' : 'neutral',
          score: I.clamp(-macro.goldChange24h / 3, -1, 1) * 0.5, weight: C.weights.gold
        });
      }
    }

    return list;
  }

  // ============================================================
  // CALCULATE FINAL ADVICE - hybride Corné (60%) + Nick (40%)
  // ============================================================
  function calculateAdvice(indicators, levelFit, currentPrice, levels, zones) {
    // Corné score: gewogen gemiddelde van indicatoren
    let totalScore = 0, totalWeight = 0;
    for (const i of indicators) {
      if (typeof i.score === 'number' && !isNaN(i.score)) {
        totalScore += i.score * i.weight;
        totalWeight += i.weight;
      }
    }
    const corneScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

    // Nick adjustment: levelFit (0-100) wordt vertaald naar -50 tot +50 boost
    // 50 = neutraal (geen invloed), >50 = ondersteunt advies, <50 = tegenspreekt
    // We berekenen Nick's bijdrage zo dat hij de Corné score versterkt of tegen werkt
    let nickAdjustment = 0;
    if (levelFit !== null) {
      // levelFit 50 = neutraal. We mappen naar -1 tot +1
      const levelBoost = (levelFit.fit - 50) / 50;
      // Nick adjustment heeft dezelfde teken als Corné direction, vermenigvuldigd met level fit
      const corneSign = Math.sign(corneScore);
      // Als levelFit goed is (>50), versterken we het Corné signal
      // Als levelFit slecht is (<50), verzwakken we het
      nickAdjustment = corneSign * levelBoost * 25;
    }

    // Hybride: Corné 60% + Nick 40%
    // Beide draaien dezelfde kant op meestal
    const finalScore = corneScore * 0.6 + (corneScore + nickAdjustment) * 0.4;
    const cappedScore = Math.max(-100, Math.min(100, finalScore));

    // Verdict (drempel verlaagd van ±8 naar ±5 voor minder WACHTEN)
    let verdict, klass, strength;
    if (cappedScore >= 35) { verdict = 'LONG'; klass = 'long'; strength = 'Sterk signaal'; }
    else if (cappedScore >= 18) { verdict = 'LONG'; klass = 'long'; strength = 'Matig signaal'; }
    else if (cappedScore >= 5) { verdict = 'LONG'; klass = 'long'; strength = 'Zwak signaal'; }
    else if (cappedScore <= -35) { verdict = 'SHORT'; klass = 'short'; strength = 'Sterk signaal'; }
    else if (cappedScore <= -18) { verdict = 'SHORT'; klass = 'short'; strength = 'Matig signaal'; }
    else if (cappedScore <= -5) { verdict = 'SHORT'; klass = 'short'; strength = 'Zwak signaal'; }
    else {
      // Heel kleine WACHTEN-zone, en zelfs dan tonen we nog richting
      if (cappedScore > 0) { verdict = 'LONG'; klass = 'long'; strength = 'Erg zwak (afwachten)'; }
      else if (cappedScore < 0) { verdict = 'SHORT'; klass = 'short'; strength = 'Erg zwak (afwachten)'; }
      else { verdict = 'WACHTEN'; klass = 'neutral'; strength = 'Neutraal'; }
    }

    // Confidence: hoeveel % van het indicator-gewicht ondersteunt de richting
    let supportingWeight = 0, opposingWeight = 0;
    const targetDir = cappedScore > 0 ? 'up' : 'down';
    for (const i of indicators) {
      if (i.dir === targetDir) supportingWeight += i.weight;
      else if (i.dir !== 'neutral') opposingWeight += i.weight;
    }
    const totalDirectionalWeight = supportingWeight + opposingWeight;
    const confidence = totalDirectionalWeight > 0
      ? Math.round((supportingWeight / totalDirectionalWeight) * 100)
      : 50;

    return {
      score: cappedScore,
      corneScore: corneScore,
      nickAdjustment: nickAdjustment,
      verdict, klass, strength,
      confidence: confidence,
      levelFit: levelFit ? Math.round(levelFit.fit) : null,
      levelFitReason: levelFit ? levelFit.reason : ''
    };
  }

  // Helper
  function fmtNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString('nl-NL');
    if (Math.abs(n) >= 1) return n.toFixed(2);
    if (Math.abs(n) >= 0.01) return n.toFixed(4);
    return n.toFixed(6);
  }

  return {
    buildIndicators,
    calculateAdvice
  };
})();
// ============================================================
// app.js - Main orchestrator
// Verbindt indicators, levels, volume profile, scoring met UI
// ============================================================

const TOP_COINS = [
  { id: 'BTC', name: 'Bitcoin',  emoji: '₿', color: '#f7931a', color2: '#ff7a00', binanceEur: 'BTCEUR', binanceUsdt: 'BTCUSDT' },
  { id: 'ETH', name: 'Ethereum', emoji: 'Ξ', color: '#627eea', color2: '#3c5ed8', binanceEur: 'ETHEUR', binanceUsdt: 'ETHUSDT' },
  { id: 'SOL', name: 'Solana',   emoji: '◎', color: '#14f195', color2: '#9945ff', binanceEur: 'SOLEUR', binanceUsdt: 'SOLUSDT' },
  { id: 'XRP', name: 'XRP',      emoji: 'X', color: '#23292f', color2: '#525252', binanceEur: 'XRPEUR', binanceUsdt: 'XRPUSDT' },
  { id: 'BNB', name: 'BNB',      emoji: 'B', color: '#f3ba2f', color2: '#d4a017', binanceEur: 'BNBEUR', binanceUsdt: 'BNBUSDT' },
  { id: 'ADA', name: 'Cardano',  emoji: 'A', color: '#0033ad', color2: '#003899', binanceEur: 'ADAEUR', binanceUsdt: 'ADAUSDT' },
  { id: 'DOGE',name: 'Dogecoin', emoji: 'D', color: '#c2a633', color2: '#a78f2a', binanceEur: 'DOGEEUR',binanceUsdt: 'DOGEUSDT' },
  { id: 'AVAX',name: 'Avalanche',emoji: '▲', color: '#e84142', color2: '#c93737', binanceEur: 'AVAXEUR',binanceUsdt: 'AVAXUSDT' },
  { id: 'LINK',name: 'Chainlink',emoji: '⬡', color: '#2a5ada', color2: '#1f48b8', binanceEur: 'LINKEUR',binanceUsdt: 'LINKUSDT' },
  { id: 'DOT', name: 'Polkadot', emoji: '●', color: '#e6007a', color2: '#bf0066', binanceEur: 'DOTEUR', binanceUsdt: 'DOTUSDT' }
];

const MACRO_SOURCES = {
  eurUsd: 'https://api.frankfurter.dev/v1/latest?from=EUR&to=USD',
  paxg: 'https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT',
  ethBtc: 'https://api.binance.com/api/v3/ticker/24hr?symbol=ETHBTC',
  global: 'https://api.coingecko.com/api/v3/global',
  eurUsdHist: 'https://api.frankfurter.dev/v1/' +
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) +
    '..?from=EUR&to=USD'
};

const TOP_30_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=30&page=1&sparkline=false';

const els = {
  price: document.getElementById('price'),
  priceLabel: document.getElementById('priceLabel'),
  priceCard: document.getElementById('priceCard'),
  change: document.getElementById('change'),
  indicators: document.getElementById('indicators'),
  summary: document.getElementById('summaryText'),
  btn: document.getElementById('refreshBtn'),
  scanBtn: document.getElementById('scanBtn'),
  status: document.getElementById('statusDot'),
  source: document.getElementById('sourceInfo'),
  lastUpdate: document.getElementById('lastUpdate'),
  adviceCard: document.getElementById('adviceCard'),
  adviceLabel: document.getElementById('adviceLabel'),
  adviceVerdict: document.getElementById('adviceVerdict'),
  adviceStrength: document.getElementById('adviceStrength'),
  adviceMeta: document.getElementById('adviceMeta'),
  scoreFill: document.getElementById('scoreFill'),
  tfInfo: document.getElementById('tfInfo'),
  scoreVal: document.getElementById('scoreVal'),
  confidenceVal: document.getElementById('confidenceVal'),
  levelFitVal: document.getElementById('levelFitVal'),
  entryPrice: document.getElementById('entryPrice'),
  entryPct: document.getElementById('entryPct'),
  tpPrice: document.getElementById('tpPrice'),
  tpPct: document.getElementById('tpPct'),
  slPrice: document.getElementById('slPrice'),
  slPct: document.getElementById('slPct'),
  rrValue: document.getElementById('rrValue'),
  rrLabel: document.getElementById('rrLabel'),
  macroGrid: document.getElementById('macroGrid'),
  macroImpact: document.getElementById('macroImpact'),
  coinTabs: document.getElementById('coinTabs'),
  scannerResults: document.getElementById('scannerResults'),
  scannerContent: document.getElementById('scannerContent'),
  scannerClose: document.getElementById('scannerClose'),
  levelList: document.getElementById('levelList'),
  levelAction: document.getElementById('levelAction'),
  vpSvg: document.getElementById('vpSvg')
};

let currentCoin = TOP_COINS[0];
let currentTimeframe = 12;
let cachedData = {};
let cachedMacro = null;

// ============================================================
// FETCH HELPERS
// ============================================================
async function fetchWithTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, mode: 'cors', cache: 'no-store' });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

async function fetchCoinData(coin, eurUsd) {
  async function fetchKlines(symbol, interval, limit) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const d = await fetchWithTimeout(url);
    return d.map(k => ({
      time: k[0],
      open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  }
  async function fetchTicker(symbol) {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    const d = await fetchWithTimeout(url);
    return {
      price: parseFloat(d.lastPrice),
      change24h: parseFloat(d.priceChangePercent)
    };
  }

  let hourly, daily, price;
  let symbol = coin.binanceEur;
  let conversionFactor = 1;

  try {
    [hourly, daily, price] = await Promise.all([
      fetchKlines(symbol, '1h', 500),
      fetchKlines(symbol, '1d', 250),
      fetchTicker(symbol)
    ]);
  } catch (e) {
    symbol = coin.binanceUsdt;
    if (!eurUsd || eurUsd <= 0) throw new Error('Geen EUR/USD koers voor conversie');
    conversionFactor = 1 / eurUsd;
    [hourly, daily, price] = await Promise.all([
      fetchKlines(symbol, '1h', 500),
      fetchKlines(symbol, '1d', 250),
      fetchTicker(symbol)
    ]);
    hourly = hourly.map(c => ({
      time: c.time,
      open: c.open * conversionFactor,
      high: c.high * conversionFactor,
      low: c.low * conversionFactor,
      close: c.close * conversionFactor,
      volume: c.volume
    }));
    daily = daily.map(c => ({
      time: c.time,
      open: c.open * conversionFactor,
      high: c.high * conversionFactor,
      low: c.low * conversionFactor,
      close: c.close * conversionFactor,
      volume: c.volume
    }));
    price = {
      price: price.price * conversionFactor,
      change24h: price.change24h
    };
  }

  return { hourly, daily, price, symbol, conversionFactor };
}

async function fetchMacro() {
  const result = {};
  try {
    const d = await fetchWithTimeout(MACRO_SOURCES.eurUsd);
    result.eurUsd = d.rates.USD;
  } catch (e) { result.eurUsd = null; }
  try {
    const d = await fetchWithTimeout(MACRO_SOURCES.eurUsdHist);
    const dates = Object.keys(d.rates).sort();
    if (dates.length >= 2) {
      const first = d.rates[dates[0]].USD;
      const last = d.rates[dates[dates.length - 1]].USD;
      result.eurUsdChange30d = ((last - first) / first) * 100;
    }
  } catch (e) { result.eurUsdChange30d = null; }
  try {
    const d = await fetchWithTimeout(MACRO_SOURCES.paxg);
    result.gold = parseFloat(d.lastPrice);
    result.goldChange24h = parseFloat(d.priceChangePercent);
  } catch (e) { result.gold = null; }
  try {
    const d = await fetchWithTimeout(MACRO_SOURCES.ethBtc);
    result.ethBtc = parseFloat(d.lastPrice);
    result.ethBtcChange24h = parseFloat(d.priceChangePercent);
  } catch (e) { result.ethBtc = null; }
  try {
    const d = await fetchWithTimeout(MACRO_SOURCES.global);
    result.btcDominance = d.data.market_cap_percentage.btc;
  } catch (e) { result.btcDominance = null; }
  return result;
}

// ============================================================
// TRADE LEVELS - met integratie van support/resistance
// ============================================================
function calculateLevels(candles, advice, currentPrice, timeframe, srLevels) {
  if (advice.klass === 'neutral') return null;

  const lookback = Math.min(48, timeframe * 4);
  const candlesUsed = candles.slice(-lookback);
  const atrVal = window.Indicators.atr(candles, 14) || (currentPrice * 0.02);
  const atrMultEntry = 0.5;
  const atrMultSL = 1.5;
  const atrMultTP = 3.0;

  const recentHigh = Math.max(...candlesUsed.map(c => c.high));
  const recentLow = Math.min(...candlesUsed.map(c => c.low));

  let entry, tp, sl;

  if (advice.klass === 'long') {
    entry = Math.max(currentPrice - atrVal * atrMultEntry, recentLow + atrVal * 0.3);
    sl = Math.min(recentLow - atrVal * 0.5, entry - atrVal * atrMultSL);
    tp = entry + atrVal * atrMultTP;

    // Nick-tweak: als support dichtbij is, gebruik die als basis voor entry/SL
    if (srLevels && srLevels.support.length > 0) {
      const nearestSupport = srLevels.support[0];
      if (nearestSupport.distance < 3) {
        entry = Math.max(entry, nearestSupport.price + atrVal * 0.2);
        sl = Math.min(sl, nearestSupport.price - atrVal * 0.5);
      }
    }
    // Tweak TP: cap bij eerste resistance
    if (srLevels && srLevels.resistance.length > 0) {
      const nearestResistance = srLevels.resistance[0];
      if (nearestResistance.distance < 6) {
        tp = Math.min(tp, nearestResistance.price - atrVal * 0.2);
      }
    }
  } else if (advice.klass === 'short') {
    entry = Math.min(currentPrice + atrVal * atrMultEntry, recentHigh - atrVal * 0.3);
    sl = Math.max(recentHigh + atrVal * 0.5, entry + atrVal * atrMultSL);
    tp = entry - atrVal * atrMultTP;

    if (srLevels && srLevels.resistance.length > 0) {
      const nearestResistance = srLevels.resistance[0];
      if (nearestResistance.distance < 3) {
        entry = Math.min(entry, nearestResistance.price - atrVal * 0.2);
        sl = Math.max(sl, nearestResistance.price + atrVal * 0.5);
      }
    }
    if (srLevels && srLevels.support.length > 0) {
      const nearestSupport = srLevels.support[0];
      if (nearestSupport.distance < 6) {
        tp = Math.max(tp, nearestSupport.price + atrVal * 0.2);
      }
    }
  }

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;

  return {
    entry, tp, sl, rr, atr: atrVal, side: advice.klass,
    entryPct: ((entry - currentPrice) / currentPrice) * 100,
    tpPct: ((tp - currentPrice) / currentPrice) * 100,
    slPct: ((sl - currentPrice) / currentPrice) * 100
  };
}

// ============================================================
// RENDER FUNCTIES
// ============================================================
function fmtPrice(n) {
  if (n >= 100) return '€ ' + Math.round(n).toLocaleString('nl-NL');
  if (n >= 1) return '€ ' + n.toFixed(2);
  if (n >= 0.01) return '€ ' + n.toFixed(4);
  return '€ ' + n.toFixed(6);
}

function renderCoinTabs() {
  els.coinTabs.innerHTML = TOP_COINS.map(coin => `
    <button class="coin-btn ${coin.id === currentCoin.id ? 'active' : ''}"
            data-coin-id="${coin.id}"
            style="--coin-color: ${coin.color}; --coin-color-2: ${coin.color2};">
      <span class="coin-emoji">${coin.emoji}</span>
      ${coin.id}
    </button>
  `).join('');
}

function renderPrice(price, coin) {
  els.price.textContent = fmtPrice(price.price);
  els.priceLabel.textContent = coin.id + ' / EUR';
  els.priceCard.style.background = `linear-gradient(135deg, ${coin.color}22, ${coin.color}08)`;
  els.priceCard.style.borderColor = coin.color + '44';
  if (price.change24h !== null && price.change24h !== undefined && !isNaN(price.change24h)) {
    const c = price.change24h;
    els.change.className = 'price-change ' + (c >= 0 ? 'up' : 'down');
    els.change.textContent = `${c >= 0 ? '▲' : '▼'} ${Math.abs(c).toFixed(2)}%`;
  } else {
    els.change.className = 'price-change';
    els.change.textContent = 'Live';
  }
}

function renderIndicators(list) {
  const cats = ['TREND', 'MOMENTUM', 'VOLATILITY', 'VOLUME', 'ACTION', 'MACRO'];
  const catNames = {
    TREND: '📈 Trend', MOMENTUM: '⚡ Momentum', VOLATILITY: '〰️ Volatility',
    VOLUME: '📊 Volume', ACTION: '🎯 Price Action', MACRO: '🌍 Macro'
  };
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
      </div>
    `).join('');
  }
  els.indicators.innerHTML = html;
}

function renderAdvice(advice, timeframe) {
  els.adviceCard.className = 'advice-card ' + advice.klass;
  els.adviceLabel.textContent = `Advies komende ${timeframe}u`;
  els.adviceVerdict.textContent = advice.verdict;
  els.adviceStrength.textContent = advice.strength;

  const fill = els.scoreFill;
  const absScore = Math.abs(advice.score);
  const widthPct = Math.min(absScore / 2, 50);
  if (advice.score >= 0) {
    fill.style.left = '50%';
    fill.style.right = 'auto';
    fill.style.width = widthPct + '%';
  } else {
    fill.style.left = 'auto';
    fill.style.right = '50%';
    fill.style.width = widthPct + '%';
  }

  els.adviceMeta.textContent = `Hybride: Corné ${advice.corneScore.toFixed(1)} + Nick adj ${advice.nickAdjustment >= 0 ? '+' : ''}${advice.nickAdjustment.toFixed(1)}`;

  // Confidence row
  els.scoreVal.textContent = (advice.score >= 0 ? '+' : '') + advice.score.toFixed(1);
  els.confidenceVal.textContent = advice.confidence + '%';
  els.levelFitVal.textContent = advice.levelFit !== null ? advice.levelFit + '%' : '—';

  // Color the confidence values
  if (advice.confidence >= 70) els.confidenceVal.style.color = '#22c55e';
  else if (advice.confidence >= 55) els.confidenceVal.style.color = '#fbbf24';
  else els.confidenceVal.style.color = '#ef4444';

  if (advice.levelFit !== null) {
    if (advice.levelFit >= 70) els.levelFitVal.style.color = '#22c55e';
    else if (advice.levelFit >= 50) els.levelFitVal.style.color = '#fbbf24';
    else els.levelFitVal.style.color = '#ef4444';
  } else {
    els.levelFitVal.style.color = '#94a3b8';
  }
}

function renderLevelContext(srLevels, zones, currentPrice, actionHint) {
  const items = [];

  // Resistance levels (boven huidige prijs)
  srLevels.resistance.forEach((r, idx) => {
    items.push({
      type: 'r',
      icon: 'R',
      label: idx === 0 ? 'Eerste weerstand' : `Weerstand ${idx + 1}`,
      price: r.price,
      distance: r.distance,
      hits: r.hits
    });
  });

  // Supply zones
  zones.supply.forEach(z => {
    const dist = ((z.midPrice - currentPrice) / currentPrice) * 100;
    items.push({
      type: 'supply',
      icon: 'S',
      label: 'Supply zone',
      price: z.midPrice,
      distance: dist,
      range: `${window.Levels.formatPrice(z.priceLow)}-${window.Levels.formatPrice(z.priceHigh)}`
    });
  });

  // Sorteer alles boven prijs van laag naar hoog (dichtstbij eerst)
  items.sort((a, b) => a.distance - b.distance);

  // Demand zones
  const belowItems = [];
  zones.demand.forEach(z => {
    const dist = ((currentPrice - z.midPrice) / currentPrice) * 100;
    belowItems.push({
      type: 'demand',
      icon: 'D',
      label: 'Demand zone',
      price: z.midPrice,
      distance: dist,
      range: `${window.Levels.formatPrice(z.priceLow)}-${window.Levels.formatPrice(z.priceHigh)}`
    });
  });

  // Support levels
  srLevels.support.forEach((s, idx) => {
    belowItems.push({
      type: 's',
      icon: 'S',
      label: idx === 0 ? 'Eerste support' : `Support ${idx + 1}`,
      price: s.price,
      distance: s.distance,
      hits: s.hits
    });
  });

  belowItems.sort((a, b) => a.distance - b.distance);

  // Render
  let html = '';
  if (items.length > 0) {
    items.forEach(item => {
      html += `
        <div class="level-row">
          <div class="level-icon ${item.type}">▲</div>
          <div class="level-text">
            ${item.label}: <span class="level-price">${window.Levels.formatPrice(item.price)}</span>
            ${item.hits ? `<span style="opacity:0.6;">· ${item.hits}× getest</span>` : ''}
            ${item.range ? `<span style="opacity:0.6;font-size:10px;">· ${item.range}</span>` : ''}
          </div>
          <div class="level-distance">+${item.distance.toFixed(1)}%</div>
        </div>
      `;
    });
  }

  // Current price marker
  html += `
    <div class="level-row" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3);">
      <div class="level-icon" style="color: #a5b4fc;">●</div>
      <div class="level-text">
        <strong>Huidige prijs: ${window.Levels.formatPrice(currentPrice)}</strong>
      </div>
      <div class="level-distance" style="color: #a5b4fc;">NU</div>
    </div>
  `;

  if (belowItems.length > 0) {
    belowItems.forEach(item => {
      html += `
        <div class="level-row">
          <div class="level-icon ${item.type}">▼</div>
          <div class="level-text">
            ${item.label}: <span class="level-price">${window.Levels.formatPrice(item.price)}</span>
            ${item.hits ? `<span style="opacity:0.6;">· ${item.hits}× getest</span>` : ''}
            ${item.range ? `<span style="opacity:0.6;font-size:10px;">· ${item.range}</span>` : ''}
          </div>
          <div class="level-distance">-${item.distance.toFixed(1)}%</div>
        </div>
      `;
    });
  }

  if (html === '') {
    html = '<div style="text-align:center;color:#8b92a8;font-size:11px;padding:8px;">Geen sterke niveaus dichtbij gedetecteerd</div>';
  }

  els.levelList.innerHTML = html;

  if (actionHint) {
    els.levelAction.style.display = 'block';
    els.levelAction.innerHTML = `💡 <strong>${actionHint}</strong>`;
  } else {
    els.levelAction.style.display = 'none';
  }
}

function renderLevels(levels) {
  if (!levels) {
    els.entryPrice.textContent = '—';
    els.tpPrice.textContent = '—';
    els.slPrice.textContent = '—';
    els.rrValue.textContent = '—';
    els.entryPct.textContent = 'Wacht';
    els.tpPct.textContent = 'op';
    els.slPct.textContent = 'signaal';
    els.rrLabel.textContent = '—';
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
  if (macro.eurUsd !== null && macro.eurUsd !== undefined) {
    items.push({
      name: 'EUR/USD', val: macro.eurUsd.toFixed(4),
      dir: macro.eurUsdChange30d > 0 ? 'up' : macro.eurUsdChange30d < 0 ? 'down' : 'neutral'
    });
  } else { items.push({ name: 'EUR/USD', val: '—', dir: 'neutral' }); }

  if (macro.eurUsdChange30d !== null && macro.eurUsdChange30d !== undefined) {
    items.push({
      name: 'DXY (30d)',
      val: (macro.eurUsdChange30d > 0 ? '↓' : '↑') + Math.abs(macro.eurUsdChange30d).toFixed(1) + '%',
      dir: macro.eurUsdChange30d > 0 ? 'up' : 'down'
    });
  } else { items.push({ name: 'DXY (30d)', val: '—', dir: 'neutral' }); }

  if (macro.gold !== null && macro.gold !== undefined) {
    items.push({
      name: 'Goud',
      val: '$' + Math.round(macro.gold) + ' (' + (macro.goldChange24h > 0 ? '+' : '') + macro.goldChange24h.toFixed(1) + '%)',
      dir: macro.goldChange24h > 0 ? 'down' : 'up'
    });
  } else { items.push({ name: 'Goud', val: '—', dir: 'neutral' }); }

  if (macro.ethBtc !== null && macro.ethBtc !== undefined) {
    items.push({
      name: 'ETH/BTC',
      val: macro.ethBtc.toFixed(5) + ' (' + (macro.ethBtcChange24h > 0 ? '+' : '') + macro.ethBtcChange24h.toFixed(1) + '%)',
      dir: macro.ethBtcChange24h > 0 ? 'up' : 'down'
    });
  } else { items.push({ name: 'ETH/BTC', val: '—', dir: 'neutral' }); }

  els.macroGrid.innerHTML = items.map(i => `
    <div class="macro-item">
      <span class="macro-name">${i.name}</span>
      <span class="macro-val ${i.dir}">${i.val}</span>
    </div>
  `).join('');

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

function renderSummary(advice, currentCoin, timeframe) {
  let txt;
  if (advice.klass === 'long') {
    txt = `${currentCoin.id}: LONG ${timeframe}u, ${advice.strength.toLowerCase()} (${advice.confidence}% confidence).`;
  } else if (advice.klass === 'short') {
    txt = `${currentCoin.id}: SHORT ${timeframe}u, ${advice.strength.toLowerCase()} (${advice.confidence}% confidence).`;
  } else {
    txt = `${currentCoin.id}: geen duidelijk signaal — wachten.`;
  }
  els.summary.textContent = txt;
}

function showError(msg) {
  els.indicators.innerHTML = `<div class="error"><b>Geen verbinding</b><br>${msg}</div>`;
  els.summary.textContent = 'Verbinding mislukt — probeer opnieuw.';
  els.status.classList.remove('live');
  els.status.classList.add('error');
}

// ============================================================
// COMPUTE & SHOW (de hele pijplijn)
// ============================================================
function computeAndShow() {
  const data = cachedData[currentCoin.id];
  if (!data) return;

  // 1. Indicatoren
  const indicators = window.Scoring.buildIndicators(currentTimeframe, data.hourly, data.daily, cachedMacro);

  // 2. Support/Resistance + Supply/Demand zones (Nick-method)
  const candlesForLevels = currentTimeframe <= 12 ? data.hourly : data.hourly;
  const srLevels = window.Levels.findSupportResistance(candlesForLevels, data.price.price);
  const zones = window.Levels.findSupplyDemandZones(candlesForLevels, data.price.price);

  // 3. Build advice with hybrid scoring
  // First we need to know the rough Corné direction to do level-fit
  let preliminaryScore = 0, totalW = 0;
  for (const i of indicators) {
    if (typeof i.score === 'number' && !isNaN(i.score)) {
      preliminaryScore += i.score * i.weight;
      totalW += i.weight;
    }
  }
  const corneRoughScore = totalW > 0 ? (preliminaryScore / totalW) * 100 : 0;
  const tempAdvice = { klass: corneRoughScore > 0 ? 'long' : corneRoughScore < 0 ? 'short' : 'neutral' };
  const levelFit = window.Levels.calculateLevelFit(tempAdvice, data.price.price, srLevels, zones);

  // 4. Final advice
  const advice = window.Scoring.calculateAdvice(indicators, levelFit, data.price.price, srLevels, zones);

  // 5. Action hint
  const actionHint = window.Levels.generateActionHint(
    { klass: advice.klass }, data.price.price, srLevels, zones, levelFit
  );

  // 6. Trade levels (with level integration)
  const tradeLevels = calculateLevels(data.hourly, advice, data.price.price, currentTimeframe, srLevels);

  // 7. Volume Profile (gebruikt laatste ~7 dagen aan hourly = 168 candles)
  const vpCandles = data.hourly.slice(-168);
  const vp = window.VolumeProfile.calculate(vpCandles, 30);

  // RENDER
  renderPrice(data.price, currentCoin);
  renderIndicators(indicators);
  renderAdvice(advice, currentTimeframe);
  renderLevelContext(srLevels, zones, data.price.price, actionHint);
  renderLevels(tradeLevels);
  renderSummary(advice, currentCoin, currentTimeframe);

  // Render Volume Profile (na timeout zodat layout klaar is)
  setTimeout(() => {
    if (els.vpSvg && vp) {
      const rect = els.vpSvg.getBoundingClientRect();
      window.VolumeProfile.renderSVG(els.vpSvg, vp, data.price.price,
        rect.width || 400, rect.height || 160);
    }
  }, 50);

  const labels = { 6: '6u model', 12: '12u model', 24: '24u model' };
  els.tfInfo.textContent = labels[currentTimeframe];
  els.source.textContent = `${currentCoin.name} via Binance · Niveaus: ${srLevels.support.length}S/${srLevels.resistance.length}R`;
}

// ============================================================
// RUN COIN (load data + show)
// ============================================================
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
    </div>
  `).join('');

  els.levelList.innerHTML = '<div style="text-align:center;color:#8b92a8;font-size:11px;padding:8px;">Niveaus berekenen…</div>';

  try {
    if (!cachedMacro) {
      cachedMacro = await fetchMacro();
      renderMacro(cachedMacro);
    }
    const data = await fetchCoinData(coin, cachedMacro ? cachedMacro.eurUsd : null);
    cachedData[coin.id] = data;

    computeAndShow();
    els.status.classList.add('live');

    const now = new Date();
    els.lastUpdate.textContent = 'Bijgewerkt: ' + now.toLocaleTimeString('nl-NL', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch (e) {
    console.error(e);
    showError(e.message);
  } finally {
    els.btn.classList.remove('loading');
  }
}

// ============================================================
// SCANNER: top 30
// ============================================================
async function runScanner() {
  els.scanBtn.disabled = true;
  els.scanBtn.innerHTML = '⏳ Scannen…';
  els.scannerResults.classList.add('show');

  const renderProgress = (current, total, status) => {
    els.scannerContent.innerHTML = `
      <div class="scanner-progress">
        ${status}<br>
        <small>${current} / ${total} coins</small>
        <div class="scanner-progress-bar">
          <div class="scanner-progress-fill" style="width: ${(current/total)*100}%"></div>
        </div>
      </div>
    `;
  };

  try {
    renderProgress(0, 30, 'Top 30 coins ophalen…');
    const top30 = await fetchWithTimeout(TOP_30_URL, 15000);

    const skipSymbols = new Set(['USDT','USDC','DAI','BUSD','TUSD','FDUSD','USDE','PYUSD',
      'WBTC','WETH','STETH','WSTETH','WEETH']);
    const candidates = top30.filter(c => !skipSymbols.has(c.symbol.toUpperCase())).slice(0, 30);

    if (!cachedMacro) cachedMacro = await fetchMacro();

    const results = [];
    let processed = 0;

    for (const c of candidates) {
      processed++;
      const symbol = c.symbol.toUpperCase();
      renderProgress(processed, candidates.length, `Analyseren: ${symbol}`);

      try {
        const usdtSymbol = symbol + 'USDT';
        const conversionFactor = 1 / cachedMacro.eurUsd;
        const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=${usdtSymbol}&interval=1h&limit=300`;
        const klinesData = await fetchWithTimeout(klinesUrl, 8000);
        if (!klinesData || klinesData.length < 100) throw new Error('te weinig data');

        const hourly = klinesData.map(k => ({
          time: k[0],
          open: parseFloat(k[1]) * conversionFactor,
          high: parseFloat(k[2]) * conversionFactor,
          low: parseFloat(k[3]) * conversionFactor,
          close: parseFloat(k[4]) * conversionFactor,
          volume: parseFloat(k[5])
        }));

        const indicators = window.Scoring.buildIndicators(currentTimeframe, hourly, [], null);
        const advice = window.Scoring.calculateAdvice(indicators, null, hourly[hourly.length-1].close, {support:[],resistance:[]}, {demand:[],supply:[]});

        results.push({
          symbol: symbol, name: c.name, score: advice.score,
          verdict: advice.verdict, klass: advice.klass,
          confidence: advice.confidence,
          price: hourly[hourly.length - 1].close
        });
      } catch (e) {
        console.warn(`${symbol} skipped:`, e.message);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    const longs = results.filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    const shorts = results.filter(r => r.score < 0).sort((a, b) => a.score - b.score).slice(0, 5);

    let html = `<div class="scanner-cols">
      <div class="scanner-col long">
        <div class="scanner-col-title">📈 Top 5 LONG</div>`;
    if (longs.length === 0) {
      html += '<div style="text-align:center;font-size:11px;color:#8b92a8;padding:10px;">Geen bullish coins</div>';
    } else {
      html += longs.map(r => `
        <div class="scanner-coin" data-symbol="${r.symbol}">
          <div class="scanner-coin-info">
            <div class="scanner-coin-symbol">${r.symbol}</div>
            <div class="scanner-coin-name">${r.name}</div>
          </div>
          <div class="scanner-coin-score">+${r.score.toFixed(1)}</div>
        </div>
      `).join('');
    }
    html += `</div><div class="scanner-col short">
      <div class="scanner-col-title">📉 Top 5 SHORT</div>`;
    if (shorts.length === 0) {
      html += '<div style="text-align:center;font-size:11px;color:#8b92a8;padding:10px;">Geen bearish coins</div>';
    } else {
      html += shorts.map(r => `
        <div class="scanner-coin" data-symbol="${r.symbol}">
          <div class="scanner-coin-info">
            <div class="scanner-coin-symbol">${r.symbol}</div>
            <div class="scanner-coin-name">${r.name}</div>
          </div>
          <div class="scanner-coin-score">${r.score.toFixed(1)}</div>
        </div>
      `).join('');
    }
    html += `</div></div>
    <div style="text-align:center;font-size:10px;color:#5a627a;margin-top:8px;">
      ${results.length} coins · ${currentTimeframe}u model
    </div>`;
    els.scannerContent.innerHTML = html;
  } catch (e) {
    console.error(e);
    els.scannerContent.innerHTML = `<div class="error"><b>Scan mislukt</b><br>${e.message}</div>`;
  } finally {
    els.scanBtn.disabled = false;
    els.scanBtn.innerHTML = '<span>🔍</span> Scan Top 30';
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
els.btn.addEventListener('click', () => {
  cachedData = {};
  cachedMacro = null;
  runCoin(currentCoin);
});

els.scanBtn.addEventListener('click', runScanner);
els.scannerClose.addEventListener('click', () => {
  els.scannerResults.classList.remove('show');
});

els.coinTabs.addEventListener('click', function(e) {
  const btn = e.target.closest('.coin-btn');
  if (!btn) return;
  const coinId = btn.dataset.coinId;
  const coin = TOP_COINS.find(c => c.id === coinId);
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

els.scannerContent.addEventListener('click', function(e) {
  const coinEl = e.target.closest('.scanner-coin');
  if (!coinEl) return;
  const symbol = coinEl.dataset.symbol;
  const coin = TOP_COINS.find(c => c.id === symbol);
  if (coin) {
    currentCoin = coin;
    document.querySelectorAll('.coin-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.coin-btn[data-coin-id="${symbol}"]`)?.classList.add('active');
    els.scannerResults.classList.remove('show');
    runCoin(coin);
  }
});

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
