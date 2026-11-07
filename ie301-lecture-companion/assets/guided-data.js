/* The six guided activities: metadata only. Each activity's content, data and
   feedback live in assets/guided-<id>.js (+ .css), built on assets/guided-kit.js;
   guided.js loads the one that is opened. The step ids/titles below are the
   activity's components: the instructor analytics count them, and each module
   renders exactly these steps. No model calls or remote grading. */
window.GUIDED = (() => {
  const activity = (id, week, title, family, intro, steps) =>
    ({ id, week, title, family, intro, steps: steps.map(([stepId, stepTitle]) => ({ id: stepId, title: stepTitle })) });
  return [
    activity('machine', 'week07', 'Keep it or replace it?', 'Deterministic DP · foundations',
      'Play a three-year keep-or-replace game, draw it as a map, solve it backward, then name the DP parts and change one rule.',
      [['play', '1 · Play it'], ['twin', '2 · Same age, same future?'], ['map', '3 · Draw it as a map'],
       ['solve', '4 · Solve it backward'], ['name', '5 · Name the parts'], ['twist', '6 · Twist']]),
    activity('energy', 'week08', 'Spend a limited upgrade budget', 'Deterministic DP · resource allocation',
      'Spend a budget by hand, see it as a map, solve it backward, then name the DP parts and add a second limit.',
      [['play', '1 · Play it'], ['twin', '2 · Same budget, same future?'], ['map', '3 · Draw it as a map'],
       ['solve', '4 · Solve it backward'], ['name', '5 · Name the parts'], ['twist', '6 · Twist: a second limit']]),
    activity('reservations', 'week09', 'Accept this request or wait?', 'Probabilistic DP · information timing',
      'Play a few rounds of booking requests, compare decisions by their average, draw the choices as a map, solve it backward, then name the parts and change one rule.',
      [['play', '1 · Play it'], ['luck', '2 · Luck or a good decision?'], ['map', '3 · Draw it as a map'],
       ['solve', '4 · Solve it backward'], ['name', '5 · Name the parts'], ['twist', '6 · Twist: decide before you see']]),
    activity('lending', 'week11', 'What must the lending desk remember?', 'DTMC · states and transitions',
      'Run a camera lending desk for a few days, find what it must remember, build its table of one-day chances, look two days ahead, then name the parts and change one rule.',
      [['play', '1 · Run the desk'], ['twin', '2 · Same count, same future?'], ['build', '3 · All chances for one day'],
       ['two', '4 · Two days ahead'], ['name', '5 · Name the parts'], ['twist', '6 · Twist: request first']]),
    activity('support', 'week13', 'Will this request be resolved?', 'DTMC · absorption and first passage',
      'Follow support tickets day by day, pool many of them, then find the exact chance of resolution and the expected days with first-day equations.',
      [['follow', '1 · Follow a ticket'], ['many', '2 · Many tickets'], ['picture', '3 · One day, then the same question'],
       ['solve', '4 · Solve it'], ['name', '5 · Name the parts'], ['twist', '6 · Twist']]),
    activity('charging', 'week14', 'Two charging ports, continuous time', 'CTMC · rates and balance',
      'Watch a charging station event by event. See why two busy ports finish twice as fast. Draw the rate diagram, balance it, and read off the answers. Then change one rule.',
      [['watch', '1 · Watch the station'], ['clocks', '2 · Racing clocks'], ['diagram', '3 · Draw the rate diagram'],
       ['balance', '4 · Rate out = rate in'], ['solve', '5 · Solve and read the answers'], ['twist', '6 · Twist: shared power']])
  ];
})();
