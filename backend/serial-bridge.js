#!/usr/bin/env node
// Serial -> Backend Arduino event bridge (ESM)
// Usage: node serial-bridge.js --port COM3 --baud 9600 --host http://localhost:4000

import axios from 'axios';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));
const portName = args.port || process.env.SERIAL_PORT || 'COM3';
const baudRate = parseInt(args.baud || process.env.SERIAL_BAUD || '9600', 10);
const backend = args.host || process.env.BACKEND_HOST || 'http://localhost:4000';

console.log(`Serial bridge starting: ${portName} @ ${baudRate} -> ${backend}`);

const port = new SerialPort({ path: portName, baudRate, autoOpen: false });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// pairing state for removed -> placed
let lastRemoved = null; // { square, piece, ts }
const PAIR_WINDOW_MS = 10000; // 10 seconds to pair removal->placement

async function getTurnFromHealth() {
  try {
    const r = await axios.get(`${backend}/health`, { timeout: 3000 });
    return r.data && r.data.turn ? r.data.turn : null;
  } catch (err) {
    console.warn('Could not fetch /health:', err.message || err);
    return null;
  }
}

async function sendMove(from, to) {
  try {
    const turn = await getTurnFromHealth();
    const endpoint = turn === 'black' ? '/black/move' : '/white/move';
    const url = `${backend}${endpoint}`;
    console.log(`Sending move POST ${url} -> {from:${from}, to:${to}} (detected turn: ${turn})`);
    const res = await axios.post(url, { from: from.toLowerCase(), to: to.toLowerCase() }, { timeout: 5000 });
    console.log('Move response:', res.data);
    return res.data;
  } catch (err) {
    console.error('Failed to send move:', err.response ? err.response.data : err.message || err);
    throw err;
  }
}

function postEvent(ev) {
  return axios.post(`${backend}/arduino/event`, ev, { timeout: 5000 })
    .then(r => r.data)
    .catch(err => { throw err; });
}

function tryParseLine(line) {
  line = line.trim();
  if (!line) return null;

  // If line is JSON and contains a move, return it directly
  if (line.startsWith('{')) {
    try {
      const obj = JSON.parse(line);
      if (obj && obj.from && obj.to) {
        return { type: 'move_json', from: obj.from.toUpperCase(), to: obj.to.toUpperCase() };
      }
    } catch (e) {
      // not JSON, continue
    }
  }
  // First, support machine tokens if present: e.g. REMOVED:H2:Pawn or PLACED:H2:Pawn
  const tokenMatch = line.match(/^(REMOVED|PLACED)\s*:\s*([^:\s]+)\s*:\s*(.+)$/i);
  if (tokenMatch) {
    const type = tokenMatch[1].toLowerCase();
    const square = tokenMatch[2].toUpperCase();
    const piece = tokenMatch[3];
    return { type, square, piece };
  }

  // Parse human-readable lines from the current sketch
  // Example placement: "EVENT: PLACED | Location: H2 | Piece: Pawn Detected"
  let m = line.match(/EVENT:\s*PLACED\s*\|\s*Location:\s*([A-H][1-8])\s*\|\s*Piece:\s*(\w+)/i);
  if (m) return { type: 'placed', square: m[1].toUpperCase(), piece: m[2] };

  // Example removal: "EVENT: REMOVED | Piece: Pawn | Path Shown from: H2"
  m = line.match(/EVENT:\s*REMOVED\s*\|\s*Piece:\s*(\w+)\s*\|\s*Path Shown from:\s*([A-H][1-8])/i);
  if (m) return { type: 'removed', square: m[2].toUpperCase(), piece: m[1] };

  // Some debug lines include order reversed; try alternate removal pattern
  m = line.match(/EVENT:\s*REMOVED\s*\|\s*Path Shown from:\s*([A-H][1-8])\s*\|\s*Piece:\s*(\w+)/i);
  if (m) return { type: 'removed', square: m[1].toUpperCase(), piece: m[2] };

  return null;
}

parser.on('data', async (raw) => {
  try {
    const line = raw.toString();
    console.log('SERIAL:', line.trim());
    const parsed = tryParseLine(line);
    if (!parsed) return;

    // If parsed is a JSON move coming from Arduino directly
    if (parsed.type === 'move_json') {
      const from = parsed.from;
      const to = parsed.to;
      console.log('Detected JSON move from serial:', { from, to });
      try {
        await sendMove(from, to);
      } catch (err) {
        console.error('Failed to send JSON move to backend:', err.message || err);
      }
      return;
    }

    const payload = { type: parsed.type, square: parsed.square, piece: parsed.piece };
    console.log('Parsed event ->', payload);

    // Always post raw event for visibility
    try {
      const resp = await postEvent(payload);
      console.log('Posted raw event to /arduino/event:', resp);
    } catch (err) {
      console.error('Failed to post raw event:', err.message || err);
    }

    // Pairing logic: if removal, record; if placement, try to pair and send move
    if (parsed.type === 'removed') {
      lastRemoved = { square: parsed.square, piece: parsed.piece, ts: Date.now() };
      console.log('Recorded lastRemoved ->', lastRemoved);
      return;
    }

    if (parsed.type === 'placed') {
      if (lastRemoved && (Date.now() - lastRemoved.ts) <= PAIR_WINDOW_MS && lastRemoved.square !== parsed.square) {
        const from = lastRemoved.square;
        const to = parsed.square;
        console.log(`Pair detected: ${from} -> ${to} (piece ${lastRemoved.piece} -> ${parsed.piece})`);
        try {
          await sendMove(from, to);
        } catch (err) {
          console.error('Error posting move:', err.message || err);
        }
        lastRemoved = null;
      } else {
        console.log('No valid pairing found for placed event (waiting for removal or removal too old)');
      }
      return;
    }
  } catch (err) {
    console.error('Parser error:', err);
  }
});

port.open((err) => {
  if (err) return console.error('Failed open serial:', err.message || err);
  console.log('Serial port opened');
});

process.on('SIGINT', () => {
  console.log('Shutting down bridge');
  port.close(() => process.exit(0));
});
