/* Pre-class reasoning warm-ups. This bank is deliberately separate from the
   classroom checkpoint bank: it primes a thinking move without revealing the
   lecture question, story, numbers or answer. */
window.PRECLASS = (() => {
  const questions = [];
  function add(week, key, title, context, prompt, options, answer, explanations, todayConnection, stretch = false) {
    questions.push({id:`pc-w${week}-${key}`,week:`week${week}`,title,context,prompt,
      options,answer,explanations,todayConnection,stretch});
  }

  add('01','changeable','What can the plan change?',
    'A festival organizer inherits the event date, the courtyard and the list of booked stalls. She may rearrange the stalls and choose where visitors enter.',
    'Which item can her plan change?',
    ['The stall arrangement','The event date','Which stalls are already booked'],0,
    ['The organizer is explicitly allowed to rearrange the stalls.','The date is inherited, so it is fixed for this plan.','The booking list is already set; the organizer cannot rewrite it.'],
    'Separate what is already fixed from what you are free to choose.');
  add('01','better','Better in what sense?',
    'One route home takes 18 minutes and is poorly lit. Another takes 23 minutes and is well lit. A friend asks which route is better but gives no preference.',
    'What is the most careful answer?',
    ['The 18-minute route is always better','The well-lit route is always better','There is not enough information until “better” is clarified'],2,
    ['This treats travel time as the only concern, although none was specified.','This treats lighting as the only concern, although none was specified.','The routes favor different concerns, so the intended meaning of “better” matters.'],
    'Make the meaning of “better” explicit before comparing alternatives.');
  add('01','every-rule','Follow the linked rules',
    'Exactly two of Ada, Bora and Cem will staff a desk. If Ada works, Bora must work too. Bora and Cem cannot work together.',
    'Which pair satisfies every rule?',
    ['Ada and Cem','Ada and Bora','Bora and Cem'],1,
    ['Ada would be working without Bora.','This pair has exactly two people, respects Ada’s condition and does not combine Bora with Cem.','This pair is explicitly forbidden.'],
    'Translate linked rules one at a time, then check them together.',true);

  add('02','narrow-range','Narrow the hiding place',
    'A locker code is a whole number from 1 to 100. A guess of 62 is reported as too high, and a guess of 37 is reported as too low.',
    'Which range contains every code still possible?',
    ['1 through 36','38 through 61','63 through 100'],1,
    ['Every number here is below a guess already reported as too low.','The code must be above 37 and below 62, leaving 38 through 61.','Every number here is above a guess already reported as too high.'],
    'Use feedback to shrink a one-dimensional search without checking every possibility.');
  add('02','common-unit','Compare like with like',
    'A storage shelf accepts parcels shorter than 75 centimeters. A parcel label reports a length of 0.8 meters.',
    'Does the parcel satisfy the shelf’s length rule?',
    ['Yes, because 0.8 is less than 75','It cannot be decided because the units are different','No, because 0.8 meters is 80 centimeters'],2,
    ['The numbers cannot be compared before their units match.','Different units require conversion; they do not prevent comparison.','After conversion, the parcel is 80 centimeters long, which exceeds the limit.'],
    'Put quantities in compatible units before comparing them.');
  add('02','tested-only','Do not claim more than the tests show',
    'A dial allows whole-number settings from 1 to 9. Tests give scores of 7 at setting 2, 12 at setting 5 and 9 at setting 8. No other settings have been tested.',
    'Which statement is justified?',
    ['Setting 5 is best among the three tested settings','Setting 5 is best among all nine settings','Scores must keep falling from setting 6 through setting 9'],0,
    ['Among the observed scores, 12 is the largest.','An untested setting could still score above 12.','One lower result at setting 8 does not determine the unobserved pattern.'],
    'Separate what sampled choices show from claims about choices never tested.',true);

  add('03','forced-share','Is it still a free choice?',
    'A van must carry exactly 17 crates. Every crate is either chilled or dry. The dispatcher first chooses how many chilled crates to load.',
    'What happens to the number of dry crates?',
    ['It is then fixed by the required total','It can still be chosen independently','It must equal the number of chilled crates'],0,
    ['Once the chilled count is chosen, only one dry count can bring the load to 17.','An independent second choice could make the total different from 17.','The two types need not be equal; only their combined count is fixed.'],
    'Notice when one choice becomes fixed by choices already made.');
  add('03','keep-rule','Keep what was promised',
    'A relay route must cover exactly 23 kilometers. The combined distance of the first three legs does not exceed 23 kilometers; the final runner takes the nonnegative distance that remains, so her distance is no longer entered separately.',
    'What must the planning sheet still guarantee?',
    ['All four runners cover the same distance','The four distances together cover 23 kilometers','The final runner always has the longest leg'],1,
    ['Equal distances were never required.','Automatically filling the final distance is safe only if the promised total is preserved.','The remaining distance may be short or long depending on the first three choices.'],
    'Simplifying a description is safe only when the original requirement is preserved.');
  add('03','dominated','Rule out one candidate',
    'A team values both speed and accuracy, and more of either is preferred. Candidate A scores 8 for speed and 6 for accuracy; B scores 7 and 9; C scores 6 and 7.',
    'Which candidate can definitely be removed before the final comparison?',
    ['Candidate A','Candidate B','Candidate C'],2,
    ['A is fastest, so neither other candidate is better on both measures.','B is most accurate, so neither other candidate is better on both measures.','B is both faster and more accurate than C, so C cannot be preferred under the stated rule.'],
    'With several changing features, rule out an option only when another is at least as good in every relevant way.',true);

  add('04','limit-target','A ceiling is not a target',
    'A workshop may admit no more than nine participants. Seven people register, and there is no minimum attendance rule.',
    'What does the attendance rule imply?',
    ['Seven participants satisfy the rule','The workshop must recruit two more people','The workshop must reject two people'],0,
    ['Seven is below the stated ceiling, so it satisfies this rule.','Nine is the largest permitted attendance, not a required attendance.','No one must be rejected because attendance has not exceeded nine.'],
    'Translate a limit without silently turning it into a target.');
  add('04','eligible-winner','A winner inside the rules',
    'A dessert contest accepts only dairy-free entries. Mango Tart receives the highest score among the accepted entries.',
    'What is guaranteed by this result?',
    ['Mango Tart would beat every dessert, including ineligible ones','Mango Tart scored at least as high as every eligible entry','Mango Tart is the most popular dessert in the city'],1,
    ['The contest compared only entries that met its rule.','This is exactly what winning within the accepted set establishes.','Contest scores do not establish citywide popularity.'],
    'Keep a conclusion tied to the set of alternatives that the rules allowed.');
  add('04','nearby-best','Best among nearby changes',
    'A seating plan scores 82 points. Every plan made from it by swapping one pair of adjacent seats scores lower. Plans requiring two or more swaps have not been checked.',
    'Which statement is justified?',
    ['The plan is best among all possible arrangements','No other arrangement can also score 82','The plan beats every arrangement one adjacent swap away'],2,
    ['An unchecked arrangement farther away could score more.','The tests do not rule out a tie with an unchecked arrangement.','The stated tests establish exactly this nearby comparison.'],
    'Evidence about nearby alternatives does not automatically settle every distant alternative.',true);

  add('05','double-count','Count each greeting once',
    'Five teammates record their greetings. Every greeting involves exactly two teammates, and both record the other person once. Their lists contain 20 entries in total.',
    'How many distinct greetings took place?',
    ['10','20','5'],0,
    ['Each greeting appears on two lists, so 20 entries represent 10 greetings.','This counts each greeting once on each person’s list.','Dividing by the number of teammates does not account for how greetings are recorded.'],
    'Check whether the same pair is being viewed from both directions.');
  add('05','growing-change','The later steps cost more',
    'A technician raises a device setting four notches. The first notch adds 1 percentage point of battery drain; the next notches add 3 more, 5 more and 7 more.',
    'What is the total extra drain after all four notches?',
    ['7 percentage points','16 percentage points','28 percentage points'],1,
    ['This includes only the final step.','The effects accumulate: 1 + 3 + 5 + 7 = 16.','This multiplies the final step by four even though the step effects differ.'],
    'Notice when each additional step has a different effect from the previous one.');
  add('05','curved-penalty','Same total, different harm',
    'A service rates the harm from a 1-minute wait as 1 point, a 2-minute wait as 4 points and a 3-minute wait as 9 points. Plan A makes two people wait 3 and 1 minutes. Plan B makes them wait 2 and 2 minutes.',
    'Which plan has the lower total harm?',
    ['Plan A','They are equal because both total 4 minutes','Plan B'],2,
    ['Plan A has 9 + 1 = 10 harm points.','Equal total waiting need not mean equal harm when longer waits are penalized more sharply.','Plan B has 4 + 4 = 8 harm points.'],
    'A curved consequence can distinguish plans that have the same simple total.',true);

  add('07','last-piece','Start from the final gap',
    'A mosaic strip is built from pieces that are exactly 4 cm or 6 cm long. The finished strip must be exactly 14 cm long.',
    'Immediately before the final piece is added, which pair contains all possible strip lengths?',
    ['8 cm or 10 cm','4 cm or 6 cm','12 cm or 13 cm'],0,
    ['The final 6 cm or 4 cm piece must follow an 8 cm or 10 cm strip.','These are possible piece lengths, not the possible length before the last piece.','Neither remainder can be completed to 14 with a 4 cm or 6 cm piece.'],
    'Work backward from the required ending to the possible previous situations.');
  add('07','anchor','The rule needs an anchor',
    'Five covered cards lie in a row. Each card is 4 greater than the card immediately to its right.',
    'Which additional fact would be enough to determine all five numbers?',
    ['The color on the backs of the cards','Whether the largest number is even','The number on any one card'],2,
    ['Back color gives no numerical anchor.','Parity still allows infinitely many rows with the same spacing.','One known value can be carried left and right using the repeated difference of 4.'],
    'A repeated backward relationship determines the chain only after one value is anchored.');
  add('07','better-prefix','Replace an expensive beginning',
    'Two routes reach the same checkpoint with the same time and fuel remaining. One route has used 7 coupons; the other has used 11. Everything available afterward depends only on the checkpoint, time and fuel. The goal is to use as few coupons as possible.',
    'Could a best complete trip need the 11-coupon route to this checkpoint?',
    ['Yes, because it may have visited better scenery','No, attach its future to the 7-coupon route instead','There is no way to tell without listing every future route'],1,
    ['Scenery is irrelevant to the stated goal and future choices.','The two arrivals offer the same future, so the cheaper beginning always gives fewer total coupons.','The conclusion follows from the stated identical future; no full listing is needed.'],
    'Reuse the best partial result when different histories reach the same future situation.',true);

  add('08','arcade-split','Split four tokens',
    'You have four arcade tokens. Puzzle points for spending 0, 1, 2, 3 or 4 tokens are 0, 6, 9, 10 and 10. Racing points are 0, 4, 7, 9 and 10.',
    'Which split gives the largest total among these choices?',
    ['1 token on Puzzle and 3 on Racing','2 tokens on each','3 tokens on Puzzle and 1 on Racing'],1,
    ['This gives 6 + 9 = 15 points.','This gives 9 + 7 = 16 points, the largest total listed.','This gives 10 + 4 = 14 points.'],
    'Compare ways to divide one limited resource among several destinations.');
  add('08','feasible-actions','What can three tickets buy?',
    'A craft booth offers exactly three choices: skip it for 0 tickets, make a badge for 2 tickets or make a model for 5 tickets. You have 3 tickets left.',
    'Which set lists all choices currently available?',
    ['Skip or make a badge','Skip, make a badge or spend exactly 3 tickets','Make a badge or make a model'],0,
    ['The 0-ticket and 2-ticket choices fit the remaining amount; the 5-ticket choice does not.','There is no 3-ticket option in the stated menu.','The model costs more than the 3 tickets remaining, while skipping is also allowed.'],
    'Filter choices using the resource still available and the actual cost of each option.');
  add('08','dominated-spend','Keep the spare token',
    'At one booth, spending 2 tokens earns 7 stars and spending 3 tokens also earns 7 stars. Any saved token can be used at later booths, and an extra token never removes a later option.',
    'Which choice can be discarded before comparing complete plans?',
    ['Spend 2 tokens here','Neither choice','Spend 3 tokens here'],2,
    ['This earns the same stars while preserving more for later.','The stated rules make spending 3 tokens no better now and no better later.','This uses more of the resource for the same immediate result and can never improve the future.'],
    'Remove a choice that uses more resources without giving more benefit.',true);

  add('09','contingent-plan','Plan now, adapt later',
    'A hiking team chooses its base camp today. Tomorrow it will observe whether the river is low or high and then choose either the footbridge or the ferry.',
    'Which note is a complete plan without pretending tomorrow’s river level is already known?',
    ['Choose North Camp today; use the footbridge tomorrow only if the river is low','Choose North Camp today; if the river is low use the footbridge, and if it is high use the ferry','Choose today’s base camp tomorrow after seeing the river'],1,
    ['This leaves the high-river case without a later choice.','It fixes today’s choice and gives an action for each observation available tomorrow.','The base camp is due today, before tomorrow’s observation.'],
    'A multi-step plan can state later choices as rules based on information that will be available then.');
  add('09','average-route','Fast sometimes, slow sometimes',
    'Route A always takes 8 minutes. Route B takes 4 minutes on half the trips and 14 minutes on the other half. You will repeat the trip many times and care about the lowest average travel time.',
    'Which route should you choose?',
    ['Route A','Route B','They have the same average'],0,
    ['Route A averages 8 minutes, while Route B averages 9.','Route B’s 4-minute trips are offset by its 14-minute trips.','The averages are 8 and 9 minutes, respectively.'],
    'Combine all possible outcomes with how often they occur.');
  add('09','risk-profile','Same average, different risk',
    'Route A always takes 10 minutes. Route B takes 1 minute on half the trips and 19 minutes on the other half. Both average 10 minutes, but arriving after 12 minutes counts as late.',
    'Which statement is correct?',
    ['Equal averages mean equal chances of being late','Route B cannot be late because it is sometimes very fast','Route A is never late, while Route B is late on half the trips'],2,
    ['An average alone does not determine how often a threshold is crossed.','The 19-minute outcome is late.','Route A stays below 12 minutes, while one of Route B’s two equally likely outcomes exceeds it.'],
    'An average may hide the particular consequence that the decision is meant to avoid.',true);

  add('10','rain','Which percentage matters now?',
    'On dry days, 18% of campus shuttle trips are late. On rainy days, 45% are late. You look outside and see rain.',
    'Which number best describes the chance that your shuttle is late today?',
    ['18%','45%','Add them: 63%'],1,
    ['The dry-day rate ignores the new information that today is rainy.','Once rain is known, the rainy-day group is the relevant group.','The percentages describe different conditions and should not be added.'],
    'Use new information to identify the relevant group.');
  add('10','shared-cause','A shared cause',
    'Sensor A works on 90% of days, and Sensor B also works on 90% of days. Both use the same power outlet, so an outage can stop them together. Nothing else is known about how their failures are related.',
    'Can the exact chance that both work on the same day be determined?',
    ['Yes, it must be 81%','Yes, it must be 90%','No, the individual percentages are not enough'],2,
    ['Multiplying to get 81% would require a relationship between the sensors that was not given.','A 90% joint chance would assume the sensors always succeed and fail together.','Different shared and separate failure patterns can produce the same two individual percentages.'],
    'Before combining chances, ask whether events are linked by a shared cause.');
  add('10','voucher','Is the game worth playing?',
    'A game costs 15 TL. Each play has a one-in-five chance of paying 60 TL; otherwise it pays nothing.',
    'If you played many times, what would happen on average per play?',
    ['You would lose about 3 TL','You would gain about 45 TL','You would break even'],0,
    ['The average payout is 12 TL per play, which is 3 TL below the price.','This subtracts the ticket price from a win but ignores the four losing plays.','Breaking even would require an average payout of 15 TL.'],
    'Combine possible outcomes with how often they occur.',true);

  add('11','overlap','Do the labels overlap?',
    'A club tries to place every visitor into exactly one group: Student, Under 25 or Other.',
    'What is wrong with these groups?',
    ['A student under 25 fits two groups','Every visitor must fit the Student group','The Other group overlaps with everyone'],0,
    ['Student and Under 25 are not mutually exclusive, so the groups do not give one unambiguous label.','Visitors who are not students can still be classified.','Other can be reserved for visitors who meet neither earlier description.'],
    'A set of state labels must place each possible situation in one unambiguous group.');
  add('11','campus-route','No direct move, still reachable',
    'A student can move from the library to the cafeteria and from the cafeteria to the dorm, but cannot move directly from the library to the dorm.',
    'Starting at the library, can the student be at the dorm after two moves?',
    ['No, because there is no direct move','Only if the student started at the dorm','Yes, by passing through the cafeteria'],2,
    ['No direct move prevents arrival in one move, not necessarily in two.','The stated starting point is the library.','The two allowed moves form a route through the cafeteria.'],
    'Build multi-step behavior from the possible one-step moves.');
  add('11','late-streak','Is “late” enough?',
    'A delivery is labeled on time or late. Tomorrow’s chance of being late depends on the length of the current late streak.',
    'Is the current label alone enough to predict tomorrow under this rule?',
    ['Yes; today’s label always contains enough information','No; also keep the current late streak','No; keep the delivery’s entire history'],1,
    ['Two deliveries labeled late can still have different next-day chances.','The streak distinguishes the histories that affect the next day.','Earlier history before the current streak is unnecessary under the stated rule.'],
    'Repair a weak description by adding exactly the missing memory.',true);

  add('13','parity','An odd number of switches',
    'A sign switches color at every beep: Green becomes Purple, and Purple becomes Green. It starts Green.',
    'What color is it immediately after 37 beeps?',
    ['Purple','Green','It cannot be determined'],0,
    ['Every odd-numbered switch leaves the sign Purple.','An even number of switches would return it to Green; 37 is odd.','The starting color and exact switching rule determine the result.'],
    'A condition may be reachable but still possible only at particular step counts.');
  add('13','mutual-reach','Can they reach each other?',
    'One-way doors allow movement from room A to B, from B to C and from C back to B. There is no door leading back to A.',
    'Which pair of rooms can each eventually reach the other?',
    ['A and B','B and C','A and C'],1,
    ['A can reach B, but B cannot return to A.','B reaches C directly, and C reaches B directly.','A can reach C through B, but C cannot return to A.'],
    'Distinguish one-way reachability from being able to travel in both directions.');
  add('13','workspace-cost','Which mode drives the bill?',
    'A workspace is empty 20% of the time, busy 50% and packed 30%. Its hourly support costs in those modes are 0 TL, 10 TL and 40 TL.',
    'Which mode contributes most to the long-run support bill?',
    ['Empty','Busy','Packed'],2,
    ['Empty contributes no support cost.','Busy contributes 50% of 10 TL, or 5 TL per hour overall.','Packed contributes 30% of 40 TL, or 12 TL per hour overall.'],
    'Combine long-run shares with the consequences in each condition.',true);

  add('14','between-observations','Between two observations',
    'A rental scooter is recorded as available at 10:00 and in use at 11:00. The status may change at any instant.',
    'What is guaranteed by these two observations?',
    ['At least one status change occurred between 10:00 and 11:00','The status changed exactly at 11:00','No status change can be inferred'],0,
    ['Different observed statuses require at least one change somewhere in the interval.','Hourly observations do not identify the exact change time.','The two observations show different statuses, so some change is certain.'],
    'Observation times and event times are separate pieces of information.');
  add('14','one-action','One action, one tag',
    'A board card has two tags: color (Blue or Yellow) and location (Inbox or Archive). Each recorded action changes exactly one tag. The card is currently Blue–Inbox.',
    'Which change cannot occur in a single recorded action?',
    ['Blue–Inbox to Yellow–Inbox','Blue–Inbox to Yellow–Archive','Blue–Inbox to Blue–Archive'],1,
    ['This changes only the color tag.','This changes both color and location, so it requires at least two actions.','This changes only the location tag.'],
    'Draw a direct connection only when one allowed event can produce the whole change.');
  add('14','timing','The order is not the timing',
    'Two status logs both read On, Off, On, Off. All timestamps and durations have been removed.',
    'What can be concluded about which system changes faster?',
    ['The first system changes faster','Both systems change at the same speed','The order alone is not enough to compare their timing'],2,
    ['The first log could span seconds or hours; its position in the list gives no timing information.','Matching status order does not imply matching time spent in each status.','Durations or timestamps are needed to compare how quickly the changes occur.'],
    'The sequence of conditions and the time spent in them are separate pieces of information.',true);

  const weeks=[...new Set(questions.map(q=>q.week))];
  return {questions,weeks,get:id=>questions.find(q=>q.id===id),
    forWeek:week=>questions.filter(q=>q.week===week).sort((a,b)=>Number(a.stretch)-Number(b.stretch))};
})();
