import { RACING_BASE, RACING_TTL } from '../config/constants.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let racingCache = { data: null, ts: 0 };
let racingRateLimitedUntil = 0;
const racingLogger = logger.child({ component: 'racing-service', provider: 'The Racing API' });

function formatSourceMeta({
  provider,
  sourceType,
  mode,
  cached = false,
  generated = false,
  asOf = Date.now(),
  ttlMs = RACING_TTL,
  message = '',
}) {
  const cacheAge = Math.max(0, Math.round((Date.now() - asOf) / 1000));
  const ttlSec = Math.round(ttlMs / 1000);
  const freshnessStatus = cacheAge <= Math.round(ttlSec * 0.25)
    ? 'fresh'
    : cacheAge <= ttlSec
      ? 'cached'
      : 'stale';

  return {
    provider,
    sourceType,
    mode,
    cached,
    generated,
    asOf,
    asOfIso: new Date(asOf).toISOString(),
    cacheAge,
    cacheTtl: ttlSec,
    freshnessStatus,
    freshnessLabel: freshnessStatus === 'fresh'
      ? 'Fresh feed'
      : freshnessStatus === 'cached'
        ? `Cached ${Math.max(1, Math.round(cacheAge / 60))}m ago`
        : `Stale ${Math.max(1, Math.round(cacheAge / 60))}m old`,
    message,
  };
}

function racingAuthHeader() {
  return `Basic ${Buffer.from(`${env.RACING_API_USER}:${env.RACING_API_PASS}`).toString('base64')}`;
}

async function fetchRacingAPI(endpoint) {
  const response = await fetch(`${RACING_BASE}${endpoint}`, {
    headers: { Authorization: racingAuthHeader() },
  });
  if (!response.ok) throw new Error(`Racing API ${response.status}: ${response.statusText}`);
  return response.json();
}

async function fetchRealRacingData() {
  if (racingCache.data && Date.now() - racingCache.ts < RACING_TTL) {
    racingLogger.debug('racing.cache.hit', {
      cacheAgeSec: Math.round((Date.now() - racingCache.ts) / 1000),
      eventCount: racingCache.data.length,
    });
    return {
      events: racingCache.data,
      warnings: [],
      sourceSummary: [{
        label: 'Horse racing',
        ...formatSourceMeta({
          provider: 'The Racing API',
          sourceType: 'verified_data',
          mode: 'cached_feed',
          cached: true,
          asOf: racingCache.ts,
        }),
      }],
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [meetsToday, meetsTomorrow] = await Promise.all([
    fetchRacingAPI(`/australia/meets?date=${today}`),
    fetchRacingAPI(`/australia/meets?date=${tomorrow}`),
  ]);

  const allMeets = [...(meetsToday.meets || []), ...(meetsTomorrow.meets || [])];
  const events = [];

  const racePromises = allMeets.slice(0, 12).map(async (meet) => {
    try {
      const raceData = await fetchRacingAPI(`/australia/meets/${meet.meet_id}/races`);
      return { meet, races: raceData.races || [] };
    } catch (error) {
      racingLogger.warn('racing.meet_races.failed', {
        course: meet.course,
        meetId: meet.meet_id,
        error: { name: error.name, message: error.message },
      });
      return { meet, races: [] };
    }
  });

  const meetResults = await Promise.all(racePromises);

  for (const { meet, races } of meetResults) {
    for (const race of races) {
      if (race.is_trial || race.is_jump_out) continue;
      if (!race.runners?.length) continue;

      const runners = race.runners
        .filter((runner) => runner.horse && runner.scratched !== 'true' && runner.scratched !== true)
        .map((runner) => {
          const bestOdds = runner.odds?.reduce((best, oddsEntry) => {
            const winOdds = Number.parseFloat(oddsEntry.win_odds);
            return (!Number.isNaN(winOdds) && winOdds > 0 && (best === null || winOdds < best)) ? winOdds : best;
          }, null) || null;

          return {
            name: runner.horse,
            odds: bestOdds || 99,
            barrier: Number.parseInt(runner.draw, 10) || 0,
            jockey: runner.jockey || '',
            trainer: runner.trainer || '',
            form: runner.form || '',
            weight: runner.weight || '',
            age: runner.age || '',
            silk: runner.silk_url || null,
          };
        })
        .sort((a, b) => a.odds - b.odds);

      if (runners.length < 2) continue;

      const distanceLabel = race.distance || '';
      const distance = Number.parseInt(distanceLabel.replace(/[^0-9]/g, ''), 10) || 0;
      const raceNumber = Number.parseInt(race.race_number, 10) || 0;

      events.push({
        id: `racing_${meet.meet_id}_R${raceNumber}`,
        sport_key: 'horse_racing_au',
        home_team: runners[0].name,
        away_team: `R${raceNumber} ${meet.course}`,
        commence_time: race.off_time || `${race.date}T00:00:00.000Z`,
        venue: meet.course,
        state: meet.state || '',
        comp: race.class || race.race_group || 'Race',
        raceName: race.race_name || '',
        distance,
        distanceLabel,
        raceNumber,
        runners,
        going: race.going || '',
        prizeTotal: race.prize_total || '',
        isRacing: true,
        isLiveData: true,
      });
    }
  }

  events.sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));
  racingCache = { data: events, ts: Date.now() };
  racingLogger.info('racing.fetch.success', {
    raceCount: events.length,
    meetCount: allMeets.length,
  });

  return {
    events,
    warnings: [],
    sourceSummary: [{
      label: 'Horse racing',
      ...formatSourceMeta({
        provider: 'The Racing API',
        sourceType: 'verified_data',
        mode: 'live_feed',
        cached: false,
        asOf: racingCache.ts,
      }),
    }],
  };
}

const FALLBACK_VENUES = {
  greyhound: [
    { name: 'Sandown Park', state: 'VIC' }, { name: 'The Meadows', state: 'VIC' },
    { name: 'Wentworth Park', state: 'NSW' }, { name: 'Albion Park', state: 'QLD' },
    { name: 'Cannington', state: 'WA' }, { name: 'Angle Park', state: 'SA' },
  ],
  horse: [
    { name: 'Flemington', state: 'VIC' }, { name: 'Randwick', state: 'NSW' },
    { name: 'Eagle Farm', state: 'QLD' }, { name: 'Moonee Valley', state: 'VIC' },
    { name: 'Rosehill', state: 'NSW' }, { name: 'Caulfield', state: 'VIC' },
  ],
};

const FALLBACK_NAMES = {
  greyhound: [
    'Midnight Storm', 'Flying Ace', 'Blazing Speed', 'Cool Operator', 'Star Chaser', 'Thunder Roll',
    'Shadow Express', 'Fast Lane', 'Rapid Fire', 'Dark Comet', 'Lucky Strike', 'Jet Stream',
    'Wild Card', 'Bold Move', 'Iron Will', 'Swift Justice', 'Prime Time', 'Hot Shot',
    'Cash Flow', 'Power Play', 'Silver Bullet', 'Gold Rush', 'Night Hawk', 'Storm Chaser',
    'Quick Draw', 'Top Notch', 'Fire Ball', 'Blue Diamond', 'Red Arrow', 'Flash Point',
    'Aston Bolero', 'Fernando Mick', 'Bella Stellina', 'Zipping Lad', 'Shima Shine',
    'My Redeemer', 'Tornado Tears', 'Fanta Bale', 'Dyna Patty', 'Mystic Riot',
  ],
  horse: [
    'Northern Meteor', 'Southern Cross', 'Golden Slipper', 'Diamond Rain', 'Storm Rider', 'Royal Flush',
    'Midnight Run', 'Silver Lining', 'Thunder Bay', 'Crystal Clear', 'Iron Horse', 'Phoenix Rising',
    'River Dance', 'Ocean King', 'Mountain Peak', 'Desert Storm', 'Valley Girl', 'Harbour Bridge',
    'Autumn Gold', 'Spring Tide', 'Winter Star', 'Summer Breeze', 'Sunset Strip', 'Dawn Patrol',
    'Celtic Prince', 'Viking Warrior', 'Roman Empire', 'Spartan Hero', 'Trojan Star', 'Persian King',
    'Winx Legacy', 'Phar Lap Ghost', 'Tulloch Road', 'Makybe Star', 'Octagonal Lad', 'Sunline Spirit',
    'Kingston Rule', 'Carbine Prince', 'Bernborough Gold', 'Lonhro Bay', 'Saintly Son', 'Might And Power',
  ],
};

const FALLBACK_JOCKEYS = {
  horse: ['J. McDonald', 'D. Lane', 'J. Bowman', 'C. Williams', 'K. McEvoy', 'D. Oliver', 'M. Zahra', 'R. Moore', 'B. Melham', 'H. Bowman', 'T. Marquand', 'J. McNeil', 'W. Pike', 'C. Newitt', 'L. Currie', 'B. Avdulla', 'R. Dolan', 'N. Rawiller', 'G. Boss', 'S. Clipperton'],
  greyhound: [],
};

const FALLBACK_TRAINERS = {
  horse: ['C. Waller', 'G. Waterhouse', 'J. Cummings', 'L. Freedman', 'D. Hayes', 'T. Busuttin', 'M. Price', 'C. Maher', 'A. Neasham', 'P. Moody', 'B. Laming', 'K. Lees', 'M. Smith', 'R. Quinton', 'J. Thompson', 'M. Newnham'],
  greyhound: ['J. Bale', 'G. Hall', 'R. Britton', 'A. Dailly', 'S. Karakatsanis', 'M. Delbridge', 'B. Azzopardi', 'D. Geall', 'P. Enright', 'K. Greenough', 'T. Dailly', 'A. Gibbons'],
};

const FALLBACK_COMPS = {
  greyhound: ['Maiden', 'Grade 5', 'Grade 4', 'Free For All', 'Listed Race', 'Group 3', 'Novice', 'Mixed 4/5'],
  horse: ['Maiden Plate', 'Benchmark 72', 'Benchmark 82', 'Class 3 Handicap', 'Listed Race', 'Group 3', 'Benchmark 64', 'Class 1', 'Open Handicap', 'Group 2'],
};

const FALLBACK_RACE_NAMES = {
  horse: ['', '', '', 'Tab Highway', 'Everest Carnival', 'Winter Challenge', 'Provincial Cup', 'Country Classic', 'Inglis Sprint', 'Civic Stakes', 'Tramway Handicap', 'Show County Quality', 'Ajax Stakes', 'Canterbury Cup', 'Epsom Preview'],
  greyhound: ['', '', '', 'Sandown Cup Heats', 'Speed Star', 'Bold Trease', 'Melbourne Cup Heats', 'Topgun', 'National Sprint', 'Silver Chief', 'Harrison-Dawson', 'Zoom Top'],
};

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807 + 0) % 2147483647;
    return value / 2147483647;
  };
}

function generateForm(rng) {
  const chars = ['1', '2', '3', '4', '5', '6', '7', '8', 'x'];
  return Array.from({ length: 5 }, () => chars[Math.floor(rng() * chars.length)]).join('');
}

function generateCareer(rng) {
  const starts = 8 + Math.floor(rng() * 40);
  const winRate = 0.08 + rng() * 0.35;
  const placeRate = 0.12 + rng() * 0.25;
  const wins = Math.max(0, Math.round(starts * winRate));
  const places = Math.max(0, Math.round(starts * placeRate));
  return {
    starts,
    wins,
    places,
    earnings: Math.round((wins * 25000 + places * 8000 + starts * 1200) * (0.5 + rng())),
  };
}

function generateOddsMovement(rng, currentOdds) {
  const shift = (rng() - 0.5) * 0.4;
  const openOdds = Math.max(1.2, currentOdds * (1 + shift));
  return { open: Math.round(openOdds * 100) / 100, current: currentOdds };
}

function generateRacingData(type) {
  const now = new Date();
  const daySeed = Math.floor(now.getTime() / (6 * 60 * 60 * 1000));
  const windowStart = new Date(daySeed * 6 * 60 * 60 * 1000);
  const rng = seededRandom(daySeed + (type === 'horse' ? 7777 : 3333));
  const venues = FALLBACK_VENUES[type];
  const names = FALLBACK_NAMES[type];
  const comps = FALLBACK_COMPS[type];
  const jockeys = FALLBACK_JOCKEYS[type];
  const trainers = FALLBACK_TRAINERS[type];
  const raceNames = FALLBACK_RACE_NAMES[type];
  const goingOptions = ['Good 3', 'Good 4', 'Soft 5', 'Soft 6', 'Soft 7', 'Heavy 8', 'Heavy 9', 'Firm 1', 'Firm 2'];
  const events = [];
  const numVenues = 3 + Math.floor(rng() * 3);
  const usedVenues = [];

  for (let venueIndex = 0; venueIndex < numVenues; venueIndex += 1) {
    const venue = venues[Math.floor(rng() * venues.length)];
    if (usedVenues.includes(venue.name)) continue;

    usedVenues.push(venue.name);
    const numRaces = 6 + Math.floor(rng() * 4);
    const venueGoing = goingOptions[Math.floor(rng() * goingOptions.length)];

    for (let raceIndex = 0; raceIndex < numRaces; raceIndex += 1) {
      const hoursAhead = 0.5 + rng() * 48;
      const raceTime = new Date(windowStart.getTime() + hoursAhead * 3600000);
      const numRunners = type === 'greyhound' ? 8 : (8 + Math.floor(rng() * 8));
      const runners = [];
      const usedNames = new Set();
      const usedJockeys = new Set();

      for (let runnerIndex = 0; runnerIndex < numRunners; runnerIndex += 1) {
        let name;
        do {
          name = names[Math.floor(rng() * names.length)];
        } while (usedNames.has(name));
        usedNames.add(name);

        const baseOdds = Math.round((1.5 + rng() * 20) * 100) / 100;
        let jockey = '';
        if (jockeys.length) {
          do {
            jockey = jockeys[Math.floor(rng() * jockeys.length)];
          } while (usedJockeys.has(jockey) && usedJockeys.size < jockeys.length);
          usedJockeys.add(jockey);
        }

        const trainer = trainers[Math.floor(rng() * trainers.length)];
        const form = generateForm(rng);
        const career = generateCareer(rng);
        const oddsMovement = generateOddsMovement(rng, baseOdds);
        const weight = type === 'horse' ? (52 + Math.round(rng() * 9 * 10) / 10) : '';
        const age = type === 'horse' ? `${2 + Math.floor(rng() * 6)}yo` : `${1 + Math.floor(rng() * 4)}yo`;
        const daysSinceRun = 5 + Math.floor(rng() * 50);
        const last5 = form.split('').map((char) => (char === 'x' ? 'L' : Number.parseInt(char, 10) <= 3 ? (Number.parseInt(char, 10) === 1 ? 'W' : 'P') : 'L'));

        runners.push({
          name,
          odds: baseOdds,
          barrier: runnerIndex + 1,
          jockey,
          trainer,
          form,
          weight,
          age,
          daysSinceRun,
          last5: last5.join('-'),
          career: `${career.starts}: ${career.wins}-${career.places}-${career.starts - career.wins - career.places}`,
          careerEarnings: career.earnings,
          oddsOpen: oddsMovement.open,
        });
      }

      runners.sort((a, b) => a.odds - b.odds);
      const distance = type === 'greyhound'
        ? [315, 395, 515, 595, 715][Math.floor(rng() * 5)]
        : [1000, 1100, 1200, 1400, 1600, 2000, 2400, 3200][Math.floor(rng() * 8)];
      const raceName = raceNames[Math.floor(rng() * raceNames.length)];
      const prize = type === 'horse' ? (25000 + Math.floor(rng() * 475000)) : (5000 + Math.floor(rng() * 70000));

      events.push({
        id: `${type}_${venue.name.replace(/\s/g, '')}_R${raceIndex + 1}_${daySeed}`,
        sport_key: type === 'horse' ? 'horse_racing_au' : 'greyhound_racing_au',
        home_team: runners[0].name,
        away_team: `${numRunners} runners`,
        commence_time: raceTime.toISOString(),
        venue: venue.name,
        state: venue.state,
        comp: comps[Math.floor(rng() * comps.length)],
        raceName: raceName || '',
        distance,
        distanceLabel: `${distance}m`,
        raceNumber: raceIndex + 1,
        runners,
        isRacing: true,
        isLiveData: false,
        going: venueGoing,
        prizeTotal: prize,
      });
    }
  }

  return events.sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));
}

export async function getRacingEvents() {
  let horseEvents = [];
  const warnings = [];
  const sourceSummary = [];
  const now = Date.now();

  if (env.RACING_API_USER && env.RACING_API_PASS && now > racingRateLimitedUntil) {
    try {
      const horsePayload = await fetchRealRacingData();
      horseEvents = horsePayload.events || [];
      sourceSummary.push(...(horsePayload.sourceSummary || []));
      if (!horseEvents.length) {
        racingLogger.warn('racing.fetch.empty_fallback', {
          reason: 'no_live_events',
        });
        horseEvents = generateRacingData('horse');
        warnings.push({
          type: 'racing-fallback',
          severity: 'warning',
          title: 'Horse racing feed unavailable',
          message: 'Showing generated horse-racing fields while the live racing feed is unavailable.',
        });
      }
    } catch (error) {
      if (error.message && error.message.includes('429')) {
        racingRateLimitedUntil = now + 30 * 60 * 1000;
        racingLogger.warn('racing.rate_limited', {
          cooldownSec: 30 * 60,
          error: { name: error.name, message: error.message },
        });
        warnings.push({
          type: 'racing-rate-limit',
          severity: 'warning',
          title: 'Racing feed cooling down',
          message: 'Live horse-racing data is temporarily rate limited, so generated fallback fields are being shown.',
        });
      } else {
        racingLogger.error('racing.fetch.failed', {
          error: { name: error.name, message: error.message },
          fallback: 'generated_horse_cards',
        });
        warnings.push({
          type: 'racing-fallback',
          severity: 'warning',
          title: 'Horse racing feed unavailable',
          message: 'Showing generated horse-racing fields while the live racing feed is unavailable.',
        });
      }
      horseEvents = generateRacingData('horse');
    }
  } else {
    if (now <= racingRateLimitedUntil) {
      racingLogger.info('racing.cooldown_active', {
        cooldownRemainingSec: Math.max(0, Math.round((racingRateLimitedUntil - now) / 1000)),
      });
      warnings.push({
        type: 'racing-rate-limit',
        severity: 'warning',
        title: 'Racing feed cooling down',
        message: 'Live horse-racing data is temporarily rate limited, so generated fallback fields are being shown.',
      });
    }
    horseEvents = generateRacingData('horse');
  }

  const greyhoundEvents = generateRacingData('greyhound');
  const existingHorseSource = sourceSummary.find((entry) => entry.label === 'Horse racing');
  const horseSourceMeta = existingHorseSource || formatSourceMeta({
      provider: 'EdgeIQ generated race cards',
      sourceType: 'projected_data',
      mode: 'generated_fallback',
      cached: false,
      generated: true,
      asOf: now,
      message: 'Generated from schedule assumptions and representative racing fields.',
    });
  const greyhoundSourceMeta = formatSourceMeta({
    provider: 'EdgeIQ generated race cards',
    sourceType: 'projected_data',
    mode: 'generated_fallback',
    cached: false,
    generated: true,
    asOf: now,
    message: 'Generated from schedule assumptions and representative racing fields.',
  });

  if (!existingHorseSource) {
    sourceSummary.push({ label: 'Horse racing', ...horseSourceMeta });
  }
  sourceSummary.push({ label: 'Greyhound racing', ...greyhoundSourceMeta });

  const decorateEvent = (event, dataMeta) => ({
    ...event,
    dataMeta,
  });

  return {
    events: [
      ...horseEvents.map((event) => decorateEvent(event, horseEvents[0]?.isLiveData ? horseSourceMeta : horseSourceMeta)),
      ...greyhoundEvents.map((event) => decorateEvent(event, greyhoundSourceMeta)),
    ],
    warnings,
    sourceSummary,
  };
}
