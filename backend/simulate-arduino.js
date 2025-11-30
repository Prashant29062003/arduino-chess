#!/usr/bin/env node
// Simple Arduino event simulator for local development
// Usage examples:
//  node simulate-arduino.js --host http://localhost:4000 --removed H2 Pawn --placed G1 Pawn --execute
//  node simulate-arduino.js --host http://localhost:4000 --event placed H2 Pawn

import axios from 'axios';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));
const host = args.host || process.env.BACKEND_HOST || 'http://localhost:4000';

async function postEvent(type, square, piece) {
  const body = { type, square, piece };
  try {
    const res = await axios.post(`${host}/arduino/event`, body, { timeout: 3000 });
    console.log('Posted event:', res.data);
  } catch (err) {
    console.error('Post failed:', err.message || err);
  }
}

async function executeMove(from, to) {
  // Query health to see whose turn
  try {
    const h = await axios.get(`${host}/health`);
    const turn = h.data.turn === 'black' ? 'black' : 'white';
    const endpoint = `${host}/${turn === 'black' ? 'black' : 'white'}/move`;
    console.log(`Executing move ${from} -> ${to} on ${endpoint}`);
    const r = await axios.post(endpoint, { from: from.toLowerCase(), to: to.toLowerCase() });
    console.log('Move response:', r.data);
  } catch (err) {
    console.error('Execute move failed:', err.response ? err.response.data : err.message || err);
  }
}

async function main() {
  if (args.event) {
    const [type, square, piece] = args.event.split(',').map(s => s.trim());
    await postEvent(type, square.toUpperCase(), piece || null);
    return;
  }

  if (args.removed && args.placed) {
    const remSquare = args.removed.toUpperCase();
    const placedSquare = args.placed.toUpperCase();
    const piece = args.piece || 'Pawn';
    await postEvent('removed', remSquare, piece);
    // small delay to mimic real behavior
    await new Promise(r => setTimeout(r, 700));
    await postEvent('placed', placedSquare, piece);

    if (args.execute) {
      await executeMove(remSquare, placedSquare);
    }
    return;
  }

  // If no args, print usage help
  console.log('\nSimulator usage:');
  console.log('  --host <url>              backend base url (default http://localhost:4000)');
  console.log('  --removed <SQUARE>        simulate removal event (e.g. H2)');
  console.log('  --placed <SQUARE>         simulate placement event (e.g. G1)');
  console.log('  --piece <NAME>            piece name (default Pawn)');
  console.log('  --execute                 after removed+placed, call backend move endpoint');
  console.log('  --event "type,square,piece"  send a single event (comma-separated)');
  console.log('\nExamples:');
  console.log('  node simulate-arduino.js --removed H2 --placed G1 --piece Pawn --execute');
  console.log('  node simulate-arduino.js --event "placed,H2,Pawn"');
}

main();
