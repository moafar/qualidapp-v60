/**
 * src/core/report/DatasetProfiler.js
 * Responsabilidad: Derivar métricas descriptivas del dataset cargado para la UI.
 */
export class DatasetProfiler {
  constructor(options = {}) {
    this.maxBins = options.maxBins ?? 10;
    this.sampleSize = options.sampleSize ?? 5000;
    this.distinctLimit = options.distinctLimit ?? 10000;
    this.frequencyLimit = options.frequencyLimit ?? 1000;
  }

  profile({ rows = [], columnsData = {}, datasetColumns = [], contractColumns = [] } = {}) {
    const contractList = Array.isArray(contractColumns) ? contractColumns : [];
    const contractMap = new Map(
      contractList
        .filter((c) => c && c.name)
        .map((c) => [c.name, c])
    );

    const orderedDatasetColumns = Array.isArray(datasetColumns)
      ? datasetColumns
      : Object.keys(columnsData || {});

    const columns = [];

    orderedDatasetColumns.forEach((name) => {
      const values = columnsData?.[name] || [];
      const contractCol = contractMap.get(name);
      columns.push(this._profileExistingColumn(name, values, contractCol));
    });

    contractList.forEach((col) => {
      if (!col?.name) return;
      if (orderedDatasetColumns.includes(col.name)) return;
      columns.push(this._profileMissingColumn(col));
    });

    const missingColumns = contractList
      .filter((c) => c?.name && !orderedDatasetColumns.includes(c.name))
      .map((c) => c.name);
    const extraColumns = orderedDatasetColumns.filter((name) => !contractMap.has(name));

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRows: rows.length,
        totalColumns: orderedDatasetColumns.length,
        contractColumns: contractList.length,
        missingColumns,
        missingCount: missingColumns.length,
        extraColumns,
        extraCount: extraColumns.length,
        columnsAnalyzed: columns.length,
        nullAverage: this._calcNullAverage(columns),
      },
      columns,
    };
  }

  _profileExistingColumn(name, values, contractCol) {
    const totalValues = values.length;
    let nullCount = 0;
    const examples = [];
    const typeCounts = { numeric: 0, datetime: 0, boolean: 0, text: 0 };
    const freqMap = new Map();

    const numericAgg = {
      min: Infinity,
      max: -Infinity,
      sum: 0,
      sumSquares: 0,
      count: 0,
      samples: [],
      seen: 0,
    };
    const dateAgg = {
      min: Infinity,
      max: -Infinity,
      count: 0,
      samples: [],
    };
    const boolAgg = { trueCount: 0, falseCount: 0 };
    const textAgg = { totalLength: 0, minLength: Infinity, maxLength: -Infinity, count: 0 };

    let distinctSet = new Set();
    let distinctOverflow = false;

    values.forEach((raw) => {
      const normalized = this._normalizeValue(raw);
      if (normalized.isBlank) {
        nullCount += 1;
        return;
      }

      if (examples.length < 3) examples.push(String(normalized.value).slice(0, 80));

      if (!distinctOverflow) {
        const key = normalized.forKey;
        if (!distinctSet.has(key)) {
          distinctSet.add(key);
          if (distinctSet.size >= this.distinctLimit) {
            distinctOverflow = true;
          }
        }
      }

      const classifications = this._classifyValue(normalized.value);
      classifications.forEach((cls) => {
        typeCounts[cls] += 1;
      });

      if (classifications.includes('numeric')) {
        const num = normalized.asNumber;
        if (Number.isFinite(num)) {
          numericAgg.count += 1;
          numericAgg.sum += num;
          numericAgg.sumSquares += num * num;
          numericAgg.min = Math.min(numericAgg.min, num);
          numericAgg.max = Math.max(numericAgg.max, num);
          this._pushSample(numericAgg.samples, num, numericAgg.count);
        }
      }

      if (classifications.includes('datetime')) {
        const timestamp = normalized.asTimestamp;
        if (Number.isFinite(timestamp)) {
          dateAgg.count += 1;
          dateAgg.min = Math.min(dateAgg.min, timestamp);
          dateAgg.max = Math.max(dateAgg.max, timestamp);
          this._pushSample(dateAgg.samples, timestamp, dateAgg.count);
        }
      }

      if (classifications.includes('boolean')) {
        boolAgg[normalized.asBoolean ? 'trueCount' : 'falseCount'] += 1;
      }

      if (typeof normalized.value === 'string') {
        textAgg.count += 1;
        textAgg.totalLength += normalized.value.length;
        textAgg.minLength = Math.min(textAgg.minLength, normalized.value.length);
        textAgg.maxLength = Math.max(textAgg.maxLength, normalized.value.length);
      }

      const freqKey = normalized.forKey;
      if (freqMap.has(freqKey) || freqMap.size < this.frequencyLimit) {
        freqMap.set(freqKey, (freqMap.get(freqKey) || 0) + 1);
      }
    });

    const filledCount = totalValues - nullCount;
    const distinctCount = distinctOverflow ? this.distinctLimit : distinctSet.size;

    const typeDecision = this._decideType({
      typeCounts,
      filledCount,
      distinctCount,
      contractType: contractCol?.expected_type,
      boolAgg,
      examples,
    });

    const stats = {
      totalValues,
      filledCount,
      nullCount,
      nullPct: totalValues ? nullCount / totalValues : 0,
      coveragePct: totalValues ? filledCount / totalValues : 0,
      distinctCount,
      distinctIsCapped: distinctOverflow,
      uniqueRatio: filledCount ? Math.min(distinctCount, filledCount) / filledCount : 0,
      examples,
      booleanTruePct: this._calcBooleanPct(boolAgg, true),
      booleanFalsePct: this._calcBooleanPct(boolAgg, false),
      numeric: this._numericStats(numericAgg),
      text: this._textStats(textAgg),
      topValues: this._topValues(freqMap, filledCount),
    };

    const histogram = this._buildHistogram({
      type: typeDecision.type,
      numericAgg,
      dateAgg,
      freqMap,
      totalCount: filledCount,
    });

    const status = contractCol ? 'ok' : 'extra';
    const flags = [];
    if (contractCol && contractCol.expected_type && typeDecision.type && typeDecision.type !== 'empty') {
      const sameType = this._normalizeType(contractCol.expected_type) === typeDecision.type;
      if (!sameType) flags.push('type_mismatch');
    }
    if (status === 'ok' && stats.nullPct >= 0.5) flags.push('high_nulls');

    return {
      name,
      status,
      inContract: Boolean(contractCol),
      expectedType: contractCol?.expected_type || null,
      criticality: contractCol?.criticality || null,
      sensitivity: contractCol?.sensitivity || null,
      rulesCount: Array.isArray(contractCol?.rules) ? contractCol.rules.length : 0,
      typeInferred: typeDecision.type,
      typeConfidence: typeDecision.confidence,
      stats,
      histogram,
      flags,
    };
  }

  _profileMissingColumn(contractCol) {
    return {
      name: contractCol.name,
      status: 'missing',
      inContract: true,
      expectedType: contractCol.expected_type || null,
      criticality: contractCol.criticality || null,
      sensitivity: contractCol.sensitivity || null,
      rulesCount: Array.isArray(contractCol.rules) ? contractCol.rules.length : 0,
      typeInferred: null,
      typeConfidence: 0,
      stats: {
        totalValues: 0,
        filledCount: 0,
        nullCount: null,
        nullPct: 1,
        coveragePct: 0,
        distinctCount: 0,
        distinctIsCapped: false,
        uniqueRatio: 0,
        examples: [],
        topValues: [],
      },
      histogram: null,
      flags: ['missing_in_dataset'],
    };
  }

  _calcNullAverage(columns) {
    const withData = columns.filter((c) => c.stats && c.stats.totalValues > 0);
    if (!withData.length) return 0;
    const total = withData.reduce((acc, col) => acc + (col.stats.nullPct || 0), 0);
    return total / withData.length;
  }

  _numericStats(agg) {
    if (!agg.count) return null;
    const mean = agg.sum / agg.count;
    const variance = Math.max(agg.sumSquares / agg.count - mean * mean, 0);
    return {
      min: agg.min,
      max: agg.max,
      mean,
      stdDev: Math.sqrt(variance),
      count: agg.count,
    };
  }

  _textStats(agg) {
    if (!agg.count) return null;
    return {
      avgLength: agg.totalLength / agg.count,
      minLength: agg.minLength === Infinity ? 0 : agg.minLength,
      maxLength: agg.maxLength === -Infinity ? 0 : agg.maxLength,
    };
  }

  _calcBooleanPct(boolAgg, flag) {
    const total = boolAgg.trueCount + boolAgg.falseCount;
    if (!total) return null;
    return flag ? boolAgg.trueCount / total : boolAgg.falseCount / total;
  }

  _decideType({ typeCounts, filledCount, distinctCount, contractType, boolAgg }) {
    if (!filledCount) {
      return { type: 'empty', confidence: 0 };
    }

    const normalizedType = this._normalizeType(contractType);
    const boolRatio = (boolAgg.trueCount + boolAgg.falseCount) / filledCount;
    if (boolRatio >= 0.95) return { type: 'boolean', confidence: boolRatio };

    const numericRatio = typeCounts.numeric / filledCount;
    const datetimeRatio = typeCounts.datetime / filledCount;

    if (normalizedType === 'datetime' && datetimeRatio >= 0.3) {
      return { type: 'datetime', confidence: datetimeRatio };
    }
    if (normalizedType === 'numeric' && numericRatio >= 0.4) {
      return { type: 'numeric', confidence: numericRatio };
    }

    if (numericRatio >= 0.65) {
      return { type: 'numeric', confidence: numericRatio };
    }

    if (datetimeRatio >= 0.65) {
      return { type: 'datetime', confidence: datetimeRatio };
    }

    if (boolRatio >= 0.6) {
      return { type: 'boolean', confidence: boolRatio };
    }

    const uniqueness = Math.min(distinctCount, filledCount) / filledCount;
    if (normalizedType === 'identifier' || uniqueness >= 0.9) {
      return { type: 'identifier', confidence: uniqueness };
    }

    const distinctRatio = distinctCount / filledCount;
    if (distinctCount <= 20 || distinctRatio <= 0.2) {
      return { type: 'categorical', confidence: 1 - distinctRatio };
    }

    return { type: 'text', confidence: 1 - Math.min(distinctRatio, 0.8) };
  }

  _buildHistogram({ type, numericAgg, dateAgg, freqMap, totalCount }) {
    if (type === 'numeric') {
      return this._buildContinuousHistogram(numericAgg, totalCount, 'numeric');
    }
    if (type === 'datetime') {
      return this._buildContinuousHistogram(dateAgg, totalCount, 'datetime');
    }
    if (type === 'boolean' || type === 'categorical' || type === 'identifier' || type === 'text') {
      return this._buildCategoricalHistogram(freqMap, totalCount, type === 'boolean');
    }
    return null;
  }

  _buildContinuousHistogram(agg, totalCount, kind) {
    if (!agg.count || agg.min === Infinity || agg.max === -Infinity) return null;
    const samples = agg.samples.length ? agg.samples : [];
    if (!samples.length) return null;

    const bucketCount = Math.min(this.maxBins, Math.max(4, Math.ceil(Math.sqrt(samples.length))));
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const range = max - min || 1;
    const bucketSize = range / bucketCount;

    const buckets = Array.from({ length: bucketCount }).map((_, idx) => {
      const from = min + idx * bucketSize;
      const to = idx === bucketCount - 1 ? max : from + bucketSize;
      return { from, to, count: 0 };
    });

    samples.forEach((value) => {
      let bucketIndex = Math.floor(((value - min) / range) * bucketCount);
      if (!Number.isFinite(bucketIndex) || bucketIndex < 0) bucketIndex = 0;
      if (bucketIndex >= bucketCount) bucketIndex = bucketCount - 1;
      buckets[bucketIndex].count += 1;
    });

    return {
      kind,
      bins: buckets.map((b) => ({
        label: kind === 'datetime' ? this._formatDateRange(b.from, b.to) : `${this._formatNumber(b.from)} – ${this._formatNumber(b.to)}`,
        from: b.from,
        to: b.to,
        count: b.count,
        pct: samples.length ? b.count / samples.length : 0,
      })),
      totalCount,
      sampled: agg.count > samples.length,
    };
  }

  _buildCategoricalHistogram(freqMap, totalCount, isBoolean) {
    if (!freqMap.size) return null;
    const pairs = Array.from(freqMap.entries()).map(([label, count]) => ({ label, count }));
    pairs.sort((a, b) => b.count - a.count);

    const limit = isBoolean ? 2 : 8;
    const top = pairs.slice(0, limit);
    const restCount = pairs.slice(limit).reduce((acc, item) => acc + item.count, 0);
    if (restCount > 0) {
      top.push({ label: 'Otros', count: restCount, isOther: true });
    }

    return {
      kind: 'categorical',
      bins: top.map((item) => ({
        label: item.label,
        count: item.count,
        pct: totalCount ? item.count / totalCount : 0,
        isOther: Boolean(item.isOther),
      })),
      totalCount,
      sampled: false,
    };
  }

  _formatDateRange(from, to) {
    const fmt = (ts) => {
      if (!Number.isFinite(ts)) return '—';
      const date = new Date(ts);
      return date.toISOString().slice(0, 10);
    };
    return `${fmt(from)} – ${fmt(to)}`;
  }

  _formatNumber(value) {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
      return value.toExponential(2);
    }
    return Number(value.toFixed(2));
  }

  _classifyValue(value) {
    const matches = [];
    if (this._isBoolean(value)) matches.push('boolean');
    if (this._isNumeric(value)) matches.push('numeric');
    if (this._isDate(value)) matches.push('datetime');
    matches.push('text');
    return matches;
  }

  _isBoolean(value) {
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return value === 0 || value === 1;
    if (typeof value === 'string') {
      const val = value.trim().toLowerCase();
      return ['true', 'false', '0', '1', 'si', 'sí', 'no'].includes(val);
    }
    return false;
  }

  _isNumeric(value) {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '.');
      if (!normalized.trim()) return false;
      const num = Number(normalized);
      return Number.isFinite(num);
    }
    return false;
  }

  _isDate(value) {
    if (value instanceof Date) return true;
    if (typeof value === 'number') return value > 10000000;
    if (typeof value === 'string') {
      const txt = value.trim();
      if (!txt) return false;
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(txt)) return true;
      if (/^\d{4}-\d{2}-\d{2}/.test(txt)) return true;
      const parsed = Date.parse(txt);
      return Number.isFinite(parsed);
    }
    return false;
  }

  _normalizeValue(value) {
    if (value === null || value === undefined) {
      return {
        value: null,
        isBlank: true,
        forKey: '__null__',
        asNumber: null,
        asTimestamp: null,
        asBoolean: null,
      };
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return {
          value: '',
          isBlank: true,
          forKey: '__blank__',
          asNumber: null,
          asTimestamp: null,
          asBoolean: null,
        };
      }
      return {
        value: trimmed,
        isBlank: false,
        forKey: trimmed,
        asNumber: this._isNumeric(trimmed) ? Number(trimmed.replace(/,/g, '.')) : null,
        asTimestamp: this._isDate(trimmed) ? this._parseDate(trimmed) : null,
        asBoolean: this._isBoolean(trimmed) ? this._toBoolean(trimmed) : null,
      };
    }

    return {
      value,
      isBlank: false,
      forKey: String(value),
      asNumber: typeof value === 'number' ? value : Number(value),
      asTimestamp: this._isDate(value) ? this._parseDate(value) : null,
      asBoolean: this._isBoolean(value) ? this._toBoolean(value) : null,
    };
  }

  _parseDate(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    const txt = typeof value === 'string' ? value.trim() : String(value);
    if (window?.dayjs) {
      const parsed = window.dayjs(txt, ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY'], true);
      if (parsed.isValid()) return parsed.toDate().getTime();
    }
    const fallback = Date.parse(txt);
    return Number.isFinite(fallback) ? fallback : null;
  }

  _toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const txt = value.trim().toLowerCase();
      return txt === '1' || txt === 'true' || txt === 'si' || txt === 'sí';
    }
    return null;
  }

  _pushSample(collection, value, seen) {
    if (collection.length < this.sampleSize) {
      collection.push(value);
      return;
    }
    const idx = Math.floor(Math.random() * seen);
    if (idx < collection.length) {
      collection[idx] = value;
    }
  }

  _topValues(freqMap, filledCount) {
    if (!freqMap.size) return [];
    return Array.from(freqMap.entries())
      .map(([label, count]) => ({ label, count, pct: filledCount ? count / filledCount : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  _normalizeType(value) {
    if (!value) return null;
    const map = {
      numeric: 'numeric',
      number: 'numeric',
      text: 'text',
      string: 'text',
      categorical: 'categorical',
      datetime: 'datetime',
      date: 'datetime',
      boolean: 'boolean',
      bool: 'boolean',
      identifier: 'identifier',
    };
    return map[value.toLowerCase?.()] || value;
  }
}
