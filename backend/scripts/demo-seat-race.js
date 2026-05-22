require('dotenv').config();
const axios = require('axios');
const Redis = require('ioredis');

const API_URL = (process.env.DEMO_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const EVENT_ID = process.env.DEMO_EVENT_ID || '';
const SEAT_LABEL = process.env.DEMO_SEAT_LABEL || '';
const PASSWORD = process.env.DEMO_PASSWORD || 'TicketRush123';
const PREP_ONLY = process.env.DEMO_PREP_ONLY === '1';
const USERS = [
  {
    email: process.env.DEMO_USER1_EMAIL || 'demo-race-1@ticketrush.local',
    fullName: process.env.DEMO_USER1_NAME || 'Demo Race User 1',
  },
  {
    email: process.env.DEMO_USER2_EMAIL || 'demo-race-2@ticketrush.local',
    fullName: process.env.DEMO_USER2_NAME || 'Demo Race User 2',
  },
];

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function listKey(eventId) { return `vq:${eventId}:list`; }
function activeKey(eventId) { return `vq:${eventId}:active`; }
function waitingKey(eventId, memberId) { return `vq:${eventId}:waiting:${memberId}`; }
function tokenKey(eventId, memberId) { return `vq:${eventId}:token:${memberId}`; }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatResult(label, result) {
  if (result.status === 'fulfilled') {
    const data = result.value.data;
    return {
      user: label,
      httpStatus: result.value.status,
      outcome: 'SUCCESS',
      bookingId: data.bookingId,
      seatId: data.seatId,
      seatLabel: data.seatLabel,
      message: 'Giu ghe thanh cong',
    };
  }

  const response = result.reason?.response;
  return {
    user: label,
    httpStatus: response?.status || 'NO_RESPONSE',
    outcome: 'FAILED',
    message: response?.data?.message || result.reason.message,
    errors: response?.data?.errors ? JSON.stringify(response.data.errors) : undefined,
  };
}

async function registerIfNeeded(user) {
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: user.email,
      password: PASSWORD,
      fullName: user.fullName,
      dob: '2000-01-01',
      gender: 'OTHER',
    });
    console.log(`Created demo account: ${user.email}`);
  } catch (error) {
    if (error.response?.status !== 409) {
      throw error;
    }
  }
}

async function login(user) {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: user.email,
      password: PASSWORD,
    });
    return {
      ...user,
      token: res.data.token,
      userId: res.data.user?.id,
    };
  } catch (error) {
    if (error.response?.status !== 401) {
      throw error;
    }
    await registerIfNeeded(user);
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: user.email,
      password: PASSWORD,
    });
    return {
      ...user,
      token: res.data.token,
      userId: res.data.user?.id,
    };
  }
}

function authClient(session) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

async function clearDemoQueueSlots(sessions, eventId) {
  const redis = new Redis(REDIS_URL, {
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redis.on('error', () => {});

  try {
    await redis.connect();
    const keys = [listKey(eventId), activeKey(eventId)];
    const membersByKey = await Promise.all(
      keys.map(async (key) => {
        const type = await redis.type(key);
        if (type === 'none') return { key, members: [] };
        if (type !== 'zset') {
          await redis.del(key);
          return { key, members: [] };
        }
        return { key, members: await redis.zrange(key, 0, -1) };
      })
    );

    const demoUserIds = new Set(sessions.map((session) => session.userId).filter(Boolean));
    const demoMembers = new Set();

    for (const { members } of membersByKey) {
      for (const memberId of members) {
        const userId = memberId.includes(':') ? memberId.split(':')[0] : memberId;
        if (demoUserIds.has(userId)) demoMembers.add(memberId);
      }
    }

    if (demoMembers.size === 0) return;

    const pipeline = redis.pipeline();
    for (const memberId of demoMembers) {
      pipeline.zrem(listKey(eventId), memberId);
      pipeline.zrem(activeKey(eventId), memberId);
      pipeline.del(tokenKey(eventId, memberId));
      pipeline.del(waitingKey(eventId, memberId));
    }
    await pipeline.exec();
    console.log(`Cleared ${demoMembers.size} old queue slot(s) for demo users.`);
  } catch (error) {
    console.log(`Could not clear old demo queue slots directly: ${error.message}`);
    console.log('If queue admission fails, set QUEUE_CAPACITY=4 or close the demo browser tabs for 45 seconds.');
  } finally {
    redis.disconnect();
  }
}

function makeQueueSessionId(session) {
  const safeEmail = session.email.replace(/[^a-zA-Z0-9]/g, '-');
  return `demo-race-${safeEmail}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function acquireQueueAccess(session, eventId) {
  const client = authClient(session);
  const queueSessionId = makeQueueSessionId(session);
  let result = (await client.post(`/queue/${eventId}/join`, { queueSessionId })).data;

  for (let attempt = 0; attempt < 20 && !(result.admitted && result.token); attempt += 1) {
    await sleep(1000);
    result = (await client.get(`/queue/${eventId}/status`, { params: { queueSessionId } })).data;
  }

  if (!(result.admitted && result.token)) {
    throw new Error(`Queue did not admit ${session.email}. Try again or increase QUEUE_CAPACITY for demo.`);
  }

  return {
    queueToken: result.token,
    queueSessionId,
  };
}

async function cleanupPendingLocks(session, eventId) {
  const client = authClient(session);
  const res = await client.get('/bookings/pending', { params: { eventId } });
  const locks = res.data?.data || [];

  for (const lock of locks) {
    try {
      await client.delete(`/bookings/${lock.bookingId}/release`);
      console.log(`Released old demo lock: ${session.email} - ${lock.seatLabel}`);
    } catch (error) {
      console.log(`Could not release old lock ${lock.bookingId}: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function pickEventId() {
  if (EVENT_ID) return EVENT_ID;

  const res = await axios.get(`${API_URL}/events`);
  const events = res.data?.events || [];
  if (events.length === 0) {
    throw new Error('Khong co event PUBLISHED nao. Hay publish event truoc, hoac set DEMO_EVENT_ID.');
  }
  return events[0].id;
}

async function pickSeat(eventId) {
  const res = await axios.get(`${API_URL}/events/${eventId}`);
  const event = res.data?.event;
  if (!event) {
    throw new Error(`Khong tim thay event ${eventId}`);
  }

  const seats = (event.zones || []).flatMap((zone) =>
    (zone.seats || []).map((seat) => ({
      ...seat,
      zoneId: zone.id,
      zoneName: zone.name,
    }))
  );

  const target = seats.find((seat) => {
    const labelMatches = !SEAT_LABEL || seat.label.toLowerCase() === SEAT_LABEL.toLowerCase();
    return labelMatches && seat.status === 'AVAILABLE';
  });

  if (!target) {
    const available = seats.filter((seat) => seat.status === 'AVAILABLE').slice(0, 10);
    const hint = available.length
      ? `Ghe available gan nhat: ${available.map((seat) => seat.label).join(', ')}`
      : 'Khong con ghe AVAILABLE trong event nay.';
    throw new Error(`Khong tim thay ghe "${SEAT_LABEL || '(auto)'}" dang AVAILABLE. ${hint}`);
  }

  return { event, seat: target };
}

async function main() {
  console.log('=== TicketRush race-condition demo ===');
  console.log(`API: ${API_URL}`);

  const sessions = await Promise.all(USERS.map(login));
  const eventId = await pickEventId();

  await Promise.all(sessions.map((session) => cleanupPendingLocks(session, eventId)));
  await clearDemoQueueSlots(sessions, eventId);
  await sleep(300);

  const { event, seat } = await pickSeat(eventId);

  console.log(`Event: ${event.title}`);
  console.log(`Seat: ${seat.label} (${seat.id}) - Zone: ${seat.zoneName}`);

  if (PREP_ONLY) {
    console.log('PREP ONLY: demo accounts are ready. No seat was locked.');
    console.log('Login browser 1 with:', sessions[0].email, '/', PASSWORD);
    console.log('Login browser 2 with:', sessions[1].email, '/', PASSWORD);
    console.log(`Open frontend route: /events/${event.id}/seats`);
    return;
  }

  console.log('Sending 2 lock requests at the same time...');

  const queueAccess = await Promise.all(
    sessions.map((session) => acquireQueueAccess(session, eventId))
  );

  const startedAt = new Date();
  const results = await Promise.allSettled(
    sessions.map((session, index) =>
      authClient(session).post('/bookings/lock', {
        seatId: seat.id,
        socketId: `demo-script-${session.email}`,
        queueToken: queueAccess[index].queueToken,
        queueSessionId: queueAccess[index].queueSessionId,
      })
    )
  );
  const finishedAt = new Date();

  const formatted = results.map((result, index) => formatResult(sessions[index].email, result));
  console.table(formatted);

  const successCount = formatted.filter((item) => item.outcome === 'SUCCESS').length;
  const failedCount = formatted.filter((item) => item.outcome === 'FAILED').length;

  console.log(`Started:  ${startedAt.toISOString()}`);
  console.log(`Finished: ${finishedAt.toISOString()}`);
  console.log(`Result: ${successCount} success, ${failedCount} failed`);

  if (successCount === 1 && failedCount === 1) {
    console.log('OK: Chi 1 user giu ghe thanh cong. Neu 2 trinh duyet dang mo dung event, UI se cap nhat realtime.');
    return;
  }

  process.exitCode = 1;
  console.log('Unexpected result: hay kiem tra lai transaction/row locking hoac trang thai ghe.');
}

main().catch((error) => {
  process.exitCode = 1;
  console.error(error.response?.data || error.message);
});
