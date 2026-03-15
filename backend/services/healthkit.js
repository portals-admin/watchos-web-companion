/**
 * HealthKit data parsing, validation, and aggregation.
 *
 * All quantities use SI / Apple standard units:
 *   heartRate        - count/min (bpm)
 *   stepCount        - count
 *   activeEnergyBurned - kcal
 *   basalEnergyBurned  - kcal
 *   exerciseTime     - min
 *   standTime        - min  (standHours uses count)
 *   distanceWalkingRunning - km
 *   bloodOxygen      - % (0–100)
 *   respiratoryRate  - breaths/min
 *   bodyMass         - kg
 *   sleepAnalysis    - categorical: 'inBed' | 'asleep' | 'awake' | 'rem' | 'core' | 'deep'
 *   workout          - { workoutType, duration (min), energy (kcal), distance (km) }
 */

const store = require('./store');

const SUPPORTED_TYPES = [
  'heartRate',
  'stepCount',
  'activeEnergyBurned',
  'basalEnergyBurned',
  'exerciseTime',
  'standTime',
  'distanceWalkingRunning',
  'bloodOxygen',
  'respiratoryRate',
  'bodyMass',
  'sleepAnalysis',
  'workout',
];

// --- Validators per type ---

const VALIDATORS = {
  heartRate: (v) => typeof v === 'number' && v > 0 && v < 350,
  stepCount: (v) => typeof v === 'number' && v >= 0 && v <= 100000,
  activeEnergyBurned: (v) => typeof v === 'number' && v >= 0 && v <= 10000,
  basalEnergyBurned: (v) => typeof v === 'number' && v >= 0 && v <= 5000,
  exerciseTime: (v) => typeof v === 'number' && v >= 0 && v <= 1440,
  standTime: (v) => typeof v === 'number' && v >= 0 && v <= 1440,
  distanceWalkingRunning: (v) => typeof v === 'number' && v >= 0 && v <= 500,
  bloodOxygen: (v) => typeof v === 'number' && v >= 0 && v <= 100,
  respiratoryRate: (v) => typeof v === 'number' && v > 0 && v < 100,
  bodyMass: (v) => typeof v === 'number' && v > 0 && v < 700,
  sleepAnalysis: (v) => ['inBed', 'asleep', 'awake', 'rem', 'core', 'deep'].includes(v),
  workout: (v) =>
    v !== null &&
    typeof v === 'object' &&
    typeof v.workoutType === 'string' &&
    typeof v.duration === 'number' &&
    v.duration >= 0,
};

function validateSample(sample) {
  const errors = [];

  if (!sample || typeof sample !== 'object') {
    return { valid: false, errors: ['Sample must be an object'] };
  }
  if (!SUPPORTED_TYPES.includes(sample.type)) {
    errors.push(`Unsupported type: ${sample.type}`);
  }
  if (!sample.startDate || isNaN(new Date(sample.startDate))) {
    errors.push('Invalid or missing startDate (ISO 8601 required)');
  }
  if (!sample.endDate || isNaN(new Date(sample.endDate))) {
    errors.push('Invalid or missing endDate (ISO 8601 required)');
  }
  if (sample.startDate && sample.endDate && new Date(sample.startDate) > new Date(sample.endDate)) {
    errors.push('startDate must be before endDate');
  }
  if (sample.value === undefined || sample.value === null) {
    errors.push('value is required');
  } else if (VALIDATORS[sample.type] && !VALIDATORS[sample.type](sample.value)) {
    errors.push(`value out of range or wrong type for ${sample.type}`);
  }

  // Reject future-dated samples (with 5-minute tolerance for clock skew)
  const fiveMinutesAhead = Date.now() + 5 * 60 * 1000;
  if (sample.startDate && new Date(sample.startDate) > fiveMinutesAhead) {
    errors.push('startDate is in the future');
  }

  return { valid: errors.length === 0, errors };
}

function parsAndValidateSamples(rawSamples) {
  const valid = [];
  const invalid = [];
  const errors = [];

  for (let i = 0; i < rawSamples.length; i++) {
    const result = validateSample(rawSamples[i]);
    if (result.valid) {
      valid.push({
        ...rawSamples[i],
        _savedAt: new Date().toISOString(),
      });
    } else {
      invalid.push(rawSamples[i]);
      errors.push({ index: i, errors: result.errors });
    }
  }

  return { valid, invalid, errors };
}

// --- Aggregation ---

function buildDailySummary(userId, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const getSum = (type) => {
    const samples = store.getHealthSamples(userId, type, start, end, 10000);
    return samples.reduce((acc, s) => acc + (typeof s.value === 'number' ? s.value : 0), 0);
  };

  const getLatest = (type) => {
    const samples = store.getHealthSamples(userId, type, start, end, 10000);
    return samples.length ? samples[samples.length - 1].value : null;
  };

  const getAvg = (type) => {
    const samples = store.getHealthSamples(userId, type, start, end, 10000);
    const nums = samples.filter((s) => typeof s.value === 'number');
    return nums.length ? nums.reduce((a, s) => a + s.value, 0) / nums.length : null;
  };

  const steps = getSum('stepCount');
  const activeEnergy = getSum('activeEnergyBurned');
  const exerciseMinutes = getSum('exerciseTime');
  const standMinutes = getSum('standTime');
  const distance = getSum('distanceWalkingRunning');

  // Activity rings (goals: 500 kcal move, 30 min exercise, 12 stand hours)
  const moveGoal = 500;
  const exerciseGoal = 30;
  const standGoal = 12;

  const rings = {
    move: { current: Math.round(activeEnergy), goal: moveGoal, percent: Math.min(100, Math.round((activeEnergy / moveGoal) * 100)) },
    exercise: { current: Math.round(exerciseMinutes), goal: exerciseGoal, percent: Math.min(100, Math.round((exerciseMinutes / exerciseGoal) * 100)) },
    stand: { current: Math.round(standMinutes / 60), goal: standGoal, percent: Math.min(100, Math.round(((standMinutes / 60) / standGoal) * 100)) },
  };

  const hrSamples = store.getHealthSamples(userId, 'heartRate', start, end, 10000);
  const hrValues = hrSamples.map((s) => s.value).filter((v) => typeof v === 'number');
  const heartRate = hrValues.length
    ? { current: hrValues[hrValues.length - 1], avg: Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length), min: Math.min(...hrValues), max: Math.max(...hrValues), samples: hrValues.length }
    : null;

  return {
    date: start.toISOString().slice(0, 10),
    rings,
    steps,
    activeEnergy: Math.round(activeEnergy),
    exerciseMinutes: Math.round(exerciseMinutes),
    standHours: Math.round(standMinutes / 60),
    distance: Math.round(distance * 100) / 100,
    heartRate,
    bloodOxygen: getLatest('bloodOxygen'),
    respiratoryRate: getAvg('respiratoryRate') ? Math.round(getAvg('respiratoryRate')) : null,
    bodyMass: getLatest('bodyMass'),
  };
}

function buildHistory(userId, numDays) {
  const history = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    history.push(buildDailySummary(userId, d));
  }
  return history;
}

function handleRealtimeUpdate(userId, sample) {
  const result = validateSample(sample);
  if (!result.valid) return { accepted: false, errors: result.errors };
  store.saveHealthSamples(userId, [{ ...sample, _savedAt: new Date().toISOString() }]);
  return { accepted: true, errors: [] };
}

module.exports = { SUPPORTED_TYPES, parsAndValidateSamples, validateSample, buildDailySummary, buildHistory, handleRealtimeUpdate };
