import { AI_TTL, ODDS_TTL } from '../../config/constants.js';
import { createPgPool } from './postgres-client.js';
import { clone, normalizeCompCode, normalizeEmail, normalizeUsername, safeArray, safeObject, toEpochMs, toIsoStringOrNull } from '../../utils/normalization.js';

function toDateFromTs(ts) {
  return new Date(toEpochMs(ts));
}

function buildTippingState(roundRows, submissionRows) {
  const rounds = {};
  const results = {};
  let activeRound = null;

  for (const row of roundRows) {
    rounds[row.round_key] = {
      round: row.round_key,
      sport: row.sport,
      lockout: row.lockout_at ? new Date(row.lockout_at).toISOString() : null,
      fixtures: row.fixtures || [],
      results: row.results || {},
    };
    if (row.is_active) activeRound = row.round_key;
  }

  for (const row of submissionRows) {
    if (!results[row.round_key]) results[row.round_key] = {};
    results[row.round_key][row.username] = row.tips || {};
  }

  return { rounds, results, activeRound };
}

export class PostgresRepository {
  constructor(config) {
    this.mode = 'postgres';
    this.pool = createPgPool(config);
  }

  async init() {
    await this.pool.query('select 1');
  }

  async close() {
    await this.pool.end();
  }

  async getStats() {
    const result = await this.pool.query('select count(*)::int as count from users');
    return {
      mode: this.mode,
      users: result.rows[0]?.count || 0,
      ready: true,
      hasDatabase: true,
    };
  }

  async countUsers() {
    const result = await this.pool.query('select count(*)::int as count from users');
    return result.rows[0]?.count || 0;
  }

  async getUsersMap() {
    const result = await this.pool.query(`
      select username, pin_hash, salt, sport, avatar, color, email, role, session_version, extract(epoch from created_at) * 1000 as created_at_ms
      from users
      order by username
    `);

    const users = {};
    for (const row of result.rows) {
      users[row.username] = {
        pinHash: row.pin_hash,
        salt: row.salt,
        sport: row.sport,
        avatar: row.avatar,
        color: row.color,
        email: row.email || '',
        role: row.role,
        sessionVersion: Number(row.session_version) || 1,
        createdAt: Math.round(Number(row.created_at_ms)),
      };
    }
    return users;
  }

  async getUserByUsername(username) {
    const cleanUsername = normalizeUsername(username);
    const result = await this.pool.query(`
      select username, pin_hash, salt, sport, avatar, color, email, role, session_version, extract(epoch from created_at) * 1000 as created_at_ms
      from users
      where username = $1
      limit 1
    `, [cleanUsername]);

    const row = result.rows[0];
    if (!row) return null;

    return {
      username: row.username,
      pinHash: row.pin_hash,
      salt: row.salt,
      sport: row.sport,
      avatar: row.avatar,
      color: row.color,
      email: row.email || '',
      role: row.role,
      sessionVersion: Number(row.session_version) || 1,
      createdAt: Math.round(Number(row.created_at_ms)),
    };
  }

  async createUser(user) {
    const cleanUsername = normalizeUsername(user.username);
    await this.pool.query(`
      insert into users (username, pin_hash, salt, sport, avatar, color, email, role, session_version, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))
    `, [
      cleanUsername,
      user.pinHash,
      user.salt,
      user.sport || 'AFL',
      user.avatar,
      user.color,
      normalizeEmail(user.email),
      user.role || null,
      Number(user.sessionVersion) || 1,
      toEpochMs(user.createdAt),
    ]);
    return this.getUserByUsername(cleanUsername);
  }

  async updateUser(username, updates) {
    const cleanUsername = normalizeUsername(username);
    const current = await this.getUserByUsername(cleanUsername);
    if (!current) return null;

    const next = {
      ...current,
      ...updates,
      email: updates.email !== undefined ? normalizeEmail(updates.email) : current.email,
      sessionVersion: updates.sessionVersion !== undefined ? (Number(updates.sessionVersion) || current.sessionVersion || 1) : (current.sessionVersion || 1),
    };

    await this.pool.query(`
      update users
      set pin_hash = $2,
          salt = $3,
          sport = $4,
          avatar = $5,
          color = $6,
          email = $7,
          role = $8,
          session_version = $9
      where username = $1
    `, [
      cleanUsername,
      next.pinHash,
      next.salt,
      next.sport,
      next.avatar,
      next.color,
      next.email || '',
      next.role || null,
      next.sessionVersion || 1,
    ]);

    return this.getUserByUsername(cleanUsername);
  }

  async bumpUserSessionVersion(username) {
    const cleanUsername = normalizeUsername(username);
    const result = await this.pool.query(`
      update users
      set session_version = coalesce(session_version, 1) + 1
      where username = $1
      returning session_version
    `, [cleanUsername]);

    return Number(result.rows[0]?.session_version) || null;
  }

  async getUserBets(username) {
    const cleanUsername = normalizeUsername(username);
    const result = await this.pool.query(`
      select external_id, match_name, team_name, sport, stake, odds, result, bet_date, label, notes
      from bets
      where username = $1
      order by sort_order asc
    `, [cleanUsername]);

    return result.rows.map((row) => ({
      id: row.external_id,
      match: row.match_name,
      team: row.team_name,
      sport: row.sport,
      stake: Number(row.stake),
      odds: Number(row.odds),
      result: row.result,
      date: row.bet_date,
      label: row.label,
      notes: row.notes,
    }));
  }

  async replaceUserBets(username, bets) {
    const cleanUsername = normalizeUsername(username);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from bets where username = $1', [cleanUsername]);

      for (let index = 0; index < bets.length; index += 1) {
        const bet = bets[index];
        await client.query(`
          insert into bets (
            username, sort_order, external_id, match_name, team_name, sport, stake, odds, result, bet_date, label, notes
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          cleanUsername,
          index,
          String(bet.id || ''),
          String(bet.match || ''),
          String(bet.team || ''),
          String(bet.sport || 'Other'),
          Number(bet.stake) || 0,
          Number(bet.odds) || 1,
          String(bet.result || 'pending'),
          String(bet.date || new Date().toISOString()),
          String(bet.label || ''),
          String(bet.notes || ''),
        ]);
      }

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLeaderboardEntries() {
    const result = await this.pool.query(`
      with bet_stats as (
        select
          username,
          count(*)::int as total_bets,
          count(*) filter (where result <> 'pending')::int as settled,
          count(*) filter (where result = 'win')::int as wins,
          coalesce(sum(case when result <> 'pending' then stake else 0 end), 0) as total_stake,
          coalesce(sum(case when result = 'win' then stake * odds else 0 end), 0) as total_return
        from bets
        group by username
      ),
      recent as (
        select username, json_agg(result order by sort_order asc) as recent_results
        from (
          select
            username,
            result,
            sort_order,
            row_number() over (partition by username order by sort_order desc) as rn
          from bets
        ) ranked
        where rn <= 5
        group by username
      )
      select
        u.username,
        u.avatar,
        u.color,
        coalesce(bs.total_bets, 0)::int as total_bets,
        coalesce(bs.settled, 0)::int as settled,
        coalesce(bs.wins, 0)::int as wins,
        round(coalesce(bs.total_stake, 0)::numeric, 2) as total_stake,
        case
          when coalesce(bs.total_stake, 0) > 0 then round((((coalesce(bs.total_return, 0) - coalesce(bs.total_stake, 0)) / bs.total_stake) * 100)::numeric, 1)
          else 0
        end as roi,
        coalesce(recent.recent_results, '[]'::json) as recent_results
      from users u
      left join bet_stats bs on bs.username = u.username
      left join recent on recent.username = u.username
      order by u.username asc
    `);

    return result.rows.map((row) => ({
      username: row.username,
      avatar: row.avatar,
      color: row.color,
      totalBets: row.total_bets,
      settled: row.settled,
      wins: row.wins,
      losses: row.settled - row.wins,
      winRate: row.settled ? Math.round((row.wins / row.settled) * 100) : 0,
      totalStake: Number(row.total_stake),
      roi: Number(row.roi),
      recentResults: safeArray(row.recent_results),
    }));
  }

  async getTippingState() {
    const [roundsResult, submissionsResult] = await Promise.all([
      this.pool.query(`
        select round_key, sport, lockout_at, fixtures, results, is_active
        from tipping_rounds
        order by round_key asc
      `),
      this.pool.query(`
        select round_key, username, tips
        from tipping_submissions
      `),
    ]);

    return buildTippingState(roundsResult.rows, submissionsResult.rows);
  }

  async saveTippingRound(roundKey, roundData) {
    await this.pool.query(`
      insert into tipping_rounds (round_key, sport, lockout_at, fixtures, results, is_active, updated_at)
      values ($1, $2, $3::timestamptz, $4::jsonb, $5::jsonb, false, now())
      on conflict (round_key) do update
      set sport = excluded.sport,
          lockout_at = excluded.lockout_at,
          fixtures = excluded.fixtures,
          results = excluded.results,
          updated_at = now()
    `, [
      roundKey,
      roundData.sport || null,
      toIsoStringOrNull(roundData.lockout),
      JSON.stringify(safeArray(roundData.fixtures)),
      JSON.stringify(safeObject(roundData.results)),
    ]);
  }

  async setActiveTippingRound(roundKey) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('update tipping_rounds set is_active = false where is_active = true');
      if (roundKey) {
        await client.query('update tipping_rounds set is_active = true, updated_at = now() where round_key = $1', [roundKey]);
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async saveTippingSubmission(roundKey, username, tips) {
    await this.pool.query(`
      insert into tipping_submissions (round_key, username, tips, updated_at)
      values ($1, $2, $3::jsonb, now())
      on conflict (round_key, username) do update
      set tips = excluded.tips,
          updated_at = now()
    `, [roundKey, normalizeUsername(username), JSON.stringify(safeObject(tips))]);
  }

  async saveRoundResults(roundKey, results) {
    await this.pool.query(`
      update tipping_rounds
      set results = $2::jsonb,
          updated_at = now()
      where round_key = $1
    `, [roundKey, JSON.stringify(safeObject(results))]);
  }

  async getCompsState() {
    const [compsResult, membershipsResult] = await Promise.all([
      this.pool.query(`
        select code, name, sport, creator_username, created_at
        from comps
        order by code asc
      `),
      this.pool.query(`
        select comp_code, username
        from comp_memberships
        order by comp_code asc, username asc
      `),
    ]);

    const memberships = {};
    const membersByCode = {};

    for (const row of membershipsResult.rows) {
      if (!memberships[row.username]) memberships[row.username] = [];
      memberships[row.username].push(row.comp_code);

      if (!membersByCode[row.comp_code]) membersByCode[row.comp_code] = [];
      membersByCode[row.comp_code].push(row.username);
    }

    const comps = {};
    for (const row of compsResult.rows) {
      comps[row.code] = {
        code: row.code,
        name: row.name,
        sport: row.sport,
        creator: row.creator_username,
        members: membersByCode[row.code] || [],
        createdAt: new Date(row.created_at).toISOString(),
      };
    }

    return { comps, memberships };
  }

  async createComp(comp) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const code = normalizeCompCode(comp.code);
      const creator = normalizeUsername(comp.creator);
      const members = [...new Set(safeArray(comp.members).map(normalizeUsername))];

      await client.query(`
        insert into comps (code, name, sport, creator_username, created_at)
        values ($1, $2, $3, $4, $5::timestamptz)
      `, [code, String(comp.name || ''), String(comp.sport || 'all'), creator, comp.createdAt || new Date().toISOString()]);

      for (const member of members) {
        await client.query(`
          insert into comp_memberships (comp_code, username)
          values ($1, $2)
          on conflict do nothing
        `, [code, member]);
      }

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async addCompMembership(code, username) {
    await this.pool.query(`
      insert into comp_memberships (comp_code, username)
      values ($1, $2)
      on conflict do nothing
    `, [normalizeCompCode(code), normalizeUsername(username)]);
  }

  async restoreAiCache() {
    await this.pool.query('delete from ai_cache where expires_at <= now()');
    const result = await this.pool.query(`
      select event_id, payload, extract(epoch from cached_at) * 1000 as cached_at_ms
      from ai_cache
      where expires_at > now()
    `);

    const restored = {};
    for (const row of result.rows) {
      restored[row.event_id] = {
        data: row.payload,
        ts: Math.round(Number(row.cached_at_ms)),
      };
    }
    return restored;
  }

  async saveAiCacheEntry(eventId, entry) {
    const ts = toEpochMs(entry.ts);
    await this.pool.query(`
      insert into ai_cache (event_id, payload, cached_at, expires_at)
      values ($1, $2::jsonb, $3::timestamptz, $4::timestamptz)
      on conflict (event_id) do update
      set payload = excluded.payload,
          cached_at = excluded.cached_at,
          expires_at = excluded.expires_at
    `, [
      eventId,
      JSON.stringify(entry.data),
      new Date(ts).toISOString(),
      new Date(ts + AI_TTL).toISOString(),
    ]);
  }

  async removeAiCacheEntry(eventId) {
    await this.pool.query('delete from ai_cache where event_id = $1', [eventId]);
  }

  async restoreOddsCache() {
    await this.pool.query('delete from odds_cache where expires_at <= now()');
    const result = await this.pool.query(`
      select sport_key, payload, extract(epoch from cached_at) * 1000 as cached_at_ms
      from odds_cache
      where expires_at > now()
    `);

    const restored = {};
    for (const row of result.rows) {
      restored[row.sport_key] = {
        data: safeArray(row.payload),
        ts: Math.round(Number(row.cached_at_ms)),
      };
    }
    return restored;
  }

  async saveOddsCacheEntry(sportKey, entry) {
    const ts = toEpochMs(entry.ts);
    await this.pool.query(`
      insert into odds_cache (sport_key, payload, cached_at, expires_at)
      values ($1, $2::jsonb, $3::timestamptz, $4::timestamptz)
      on conflict (sport_key) do update
      set payload = excluded.payload,
          cached_at = excluded.cached_at,
          expires_at = excluded.expires_at
    `, [
      sportKey,
      JSON.stringify(safeArray(entry.data)),
      new Date(ts).toISOString(),
      new Date(ts + ODDS_TTL).toISOString(),
    ]);
  }

  async deleteOddsCacheEntry(sportKey) {
    await this.pool.query('delete from odds_cache where sport_key = $1', [sportKey]);
  }

  async importSnapshot(snapshot, { reset = true } = {}) {
    const client = await this.pool.connect();

    const users = safeObject(snapshot.users);
    const bets = safeObject(snapshot.bets);
    const tipping = {
      rounds: safeObject(snapshot.tipping?.rounds),
      results: safeObject(snapshot.tipping?.results),
      activeRound: snapshot.tipping?.activeRound || null,
    };
    const comps = {
      comps: safeObject(snapshot.comps?.comps),
      memberships: safeObject(snapshot.comps?.memberships),
    };
    const aiCache = safeObject(snapshot.aiCache);
    const oddsCache = safeObject(snapshot.oddsCache);

    try {
      await client.query('begin');

      if (reset) {
        await client.query(`
          truncate table
            comp_memberships,
            comps,
            tipping_submissions,
            tipping_rounds,
            bets,
            ai_cache,
            odds_cache,
            users
          restart identity cascade
        `);
      }

      for (const [rawUsername, user] of Object.entries(users)) {
        const username = normalizeUsername(rawUsername);
        await client.query(`
          insert into users (username, pin_hash, salt, sport, avatar, color, email, role, session_version, created_at)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))
          on conflict (username) do update
          set pin_hash = excluded.pin_hash,
              salt = excluded.salt,
              sport = excluded.sport,
              avatar = excluded.avatar,
              color = excluded.color,
              email = excluded.email,
              role = excluded.role,
              session_version = excluded.session_version,
              created_at = excluded.created_at
        `, [
          username,
          user.pinHash,
          user.salt,
          user.sport || 'AFL',
          user.avatar || '🎯',
          user.color || '#aaa',
          normalizeEmail(user.email || ''),
          user.role || null,
          Number(user.sessionVersion) || 1,
          toEpochMs(user.createdAt),
        ]);
      }

      for (const [rawUsername, userBets] of Object.entries(bets)) {
        const username = normalizeUsername(rawUsername);
        await client.query('delete from bets where username = $1', [username]);
        for (let index = 0; index < safeArray(userBets).length; index += 1) {
          const bet = userBets[index];
          await client.query(`
            insert into bets (
              username, sort_order, external_id, match_name, team_name, sport, stake, odds, result, bet_date, label, notes
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            username,
            index,
            String(bet.id || ''),
            String(bet.match || ''),
            String(bet.team || ''),
            String(bet.sport || 'Other'),
            Number(bet.stake) || 0,
            Number(bet.odds) || 1,
            String(bet.result || 'pending'),
            String(bet.date || new Date().toISOString()),
            String(bet.label || ''),
            String(bet.notes || ''),
          ]);
        }
      }

      for (const [roundKey, roundData] of Object.entries(tipping.rounds)) {
        await client.query(`
          insert into tipping_rounds (round_key, sport, lockout_at, fixtures, results, is_active, updated_at)
          values ($1, $2, $3::timestamptz, $4::jsonb, $5::jsonb, $6, now())
          on conflict (round_key) do update
          set sport = excluded.sport,
              lockout_at = excluded.lockout_at,
              fixtures = excluded.fixtures,
              results = excluded.results,
              is_active = excluded.is_active,
              updated_at = now()
        `, [
          roundKey,
          roundData.sport || null,
          toIsoStringOrNull(roundData.lockout),
          JSON.stringify(safeArray(roundData.fixtures)),
          JSON.stringify(safeObject(roundData.results)),
          tipping.activeRound === roundKey,
        ]);
      }

      for (const [roundKey, roundSubmissions] of Object.entries(tipping.results)) {
        for (const [rawUsername, tips] of Object.entries(safeObject(roundSubmissions))) {
          await client.query(`
            insert into tipping_submissions (round_key, username, tips, updated_at)
            values ($1, $2, $3::jsonb, now())
            on conflict (round_key, username) do update
            set tips = excluded.tips,
                updated_at = now()
          `, [roundKey, normalizeUsername(rawUsername), JSON.stringify(safeObject(tips))]);
        }
      }

      const membershipPairs = new Set();
      for (const [code, comp] of Object.entries(comps.comps)) {
        const cleanCode = normalizeCompCode(code);
        const creator = normalizeUsername(comp.creator);
        await client.query(`
          insert into comps (code, name, sport, creator_username, created_at)
          values ($1, $2, $3, $4, $5::timestamptz)
          on conflict (code) do update
          set name = excluded.name,
              sport = excluded.sport,
              creator_username = excluded.creator_username,
              created_at = excluded.created_at
        `, [
          cleanCode,
          String(comp.name || ''),
          String(comp.sport || 'all'),
          creator,
          comp.createdAt || new Date().toISOString(),
        ]);

        for (const member of safeArray(comp.members).map(normalizeUsername)) {
          membershipPairs.add(`${cleanCode}:${member}`);
        }
      }

      for (const [rawUsername, codes] of Object.entries(comps.memberships)) {
        const username = normalizeUsername(rawUsername);
        for (const code of safeArray(codes).map(normalizeCompCode)) {
          membershipPairs.add(`${code}:${username}`);
        }
      }

      for (const pair of membershipPairs) {
        const [code, username] = pair.split(':');
        await client.query(`
          insert into comp_memberships (comp_code, username)
          values ($1, $2)
          on conflict do nothing
        `, [code, username]);
      }

      for (const [eventId, entry] of Object.entries(aiCache)) {
        const ts = toEpochMs(entry?.ts);
        await client.query(`
          insert into ai_cache (event_id, payload, cached_at, expires_at)
          values ($1, $2::jsonb, $3::timestamptz, $4::timestamptz)
          on conflict (event_id) do update
          set payload = excluded.payload,
              cached_at = excluded.cached_at,
              expires_at = excluded.expires_at
        `, [
          eventId,
          JSON.stringify(entry?.data || {}),
          new Date(ts).toISOString(),
          new Date(ts + AI_TTL).toISOString(),
        ]);
      }

      for (const [sportKey, entry] of Object.entries(oddsCache)) {
        const ts = toEpochMs(entry?.ts);
        await client.query(`
          insert into odds_cache (sport_key, payload, cached_at, expires_at)
          values ($1, $2::jsonb, $3::timestamptz, $4::timestamptz)
          on conflict (sport_key) do update
          set payload = excluded.payload,
              cached_at = excluded.cached_at,
              expires_at = excluded.expires_at
        `, [
          sportKey,
          JSON.stringify(safeArray(entry?.data)),
          new Date(ts).toISOString(),
          new Date(ts + ODDS_TTL).toISOString(),
        ]);
      }

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
