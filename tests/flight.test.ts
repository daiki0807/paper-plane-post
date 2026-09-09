import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { destinations, flightDistance, outcome, groundPoint, flightPoint, windFor } from '../lib/flight.ts';

test('every home can be reached for every available wind, using integer settings', () => {
  for (const wind of [-2,-1,0,1,2]) for (const home of destinations) {
    assert.ok(Array.from({length:10}, (_,i) => i+1).some(power => outcome(flightDistance(power,wind), home.distance) === 'success'), `${home.name}: wind=${wind}`);
  }
});
test('stretch and wind produce repeatable, monotonic distance changes', () => {
  for (const wind of [-2,-1,0,1,2]) for (let stretch=1;stretch<10;stretch++) {
    assert.ok(flightDistance(stretch+1,wind) >= flightDistance(stretch,wind));
    assert.equal(flightDistance(stretch,wind), flightDistance(stretch,wind));
  }
  for (let i=0;i<20;i++) assert.equal(windFor('practice',i), 1);
  for (let i=0;i<20;i++) assert.notEqual(windFor('adventure',i), windFor('adventure',i+1));
});
test('recommended first attempt succeeds and results distinguish too short and too far', () => {
  assert.equal(outcome(flightDistance(3,1), destinations[0].distance), 'success');
  assert.equal(outcome(flightDistance(1,1), destinations[0].distance), 'short');
  assert.equal(outcome(flightDistance(10,1), destinations[0].distance), 'long');
});
test('animation starts and lands at the same coordinates as the scoring model', () => {
  for (let distance=0;distance<=83;distance++) {
    assert.deepEqual(flightPoint(distance,0), groundPoint(0));
    assert.ok(Math.abs(flightPoint(distance,1).y-groundPoint(distance).y)<1e-10);
    assert.equal(flightPoint(distance,1).x, groundPoint(distance).x);
    for(let step=0;step<=10;step++) {
      const point=flightPoint(distance,step/10);
      assert.ok(point.x>=0 && point.x<=100 && point.y>=0 && point.y<=100);
    }
  }
});
