/* Pre-class reasoning warm-ups. This bank is deliberately separate from the
   classroom checkpoint bank: it primes a thinking move without revealing the
   lecture question, story, numbers or answer. */
window.PRECLASS = (() => {
  const questions = [];
  function add(week, key, title, context, prompt, options, answer, explanations, todayConnection, stretch = false, challenge = false) {
    questions.push({id:`pc-w${week}-${key}`,week:`week${week}`,title,context,prompt,
      options,answer,explanations,todayConnection,stretch,challenge});
  }
  function addChallenge(week, key, title, context, prompt, options, answer, explanations, todayConnection) {
    add(week,key,title,context,prompt,options,answer,explanations,todayConnection,false,true);
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

  addChallenge('01','rule-cycle','Can all three rules hold?',
    'Three talks—Amber, Birch and Cedar—must be placed in a single order. Amber must come before Birch, Birch before Cedar, and Cedar before Amber.',
    'Can one schedule satisfy all three rules?',
    ['Yes: Amber, then Birch, then Cedar','No: following the rules creates a circle','It depends on the length of the talks'],1,
    ['This order breaks the rule that Cedar must come before Amber.','Starting from any talk eventually requires it to come before itself, so no order works.','Talk lengths do not change the required before-and-after relationships.'],
    'Before comparing possible plans, check whether the stated rules can all hold together.');
  addChallenge('01','counterexample','One case can break “always”',
    'A study adviser claims: “Between any two students, the one who studies more hours always receives the higher quiz score.”',
    'Which single observation would be enough to disprove that claim?',
    ['One student studies 6 hours and scores lower than another who studies 4 hours','Two students study the same number of hours and receive the same score','Most students who study longer receive higher scores'],0,
    ['The claim says “always,” so one reversed pair is a counterexample.','Equal effort and equal scores do not contradict the stated ordering claim.','A pattern that holds for most students does not itself identify an exception.'],
    'Test a broad claim by looking for a case it says cannot happen.');
  addChallenge('01','measurement-boundary','Did the wait really shrink?',
    'A cafeteria measures waiting only from the entrance door to the counter. It moves half of the queue outside. The reported indoor wait falls, but the time from joining the outside queue to receiving food stays unchanged.',
    'What does the evidence support?',
    ['Customers now spend less total time waiting','The counter now serves customers faster','The reported measure fell because its starting point moved'],2,
    ['The story says the complete arrival-to-service time is unchanged.','No faster service is reported; part of the same queue was moved outside.','Excluding the outside portion lowers the reported number without shortening the full wait.'],
    'Make sure a convenient measurement covers the outcome you actually care about.');

  addChallenge('02','visit-plans','A choice that depends on usage',
    'Plan Lime has no joining fee and costs 7 TL per visit. Plan Gold has an 18 TL joining fee and costs 4 TL per visit.',
    'At what whole-number visit count does Gold first become strictly cheaper than Lime?',
    ['6 visits','7 visits','8 visits'],1,
    ['At 6 visits both plans cost 42 TL, so Gold is not yet cheaper.','At 7 visits Lime costs 49 TL and Gold costs 46 TL; this is the first strict advantage.','Gold is already cheaper at 7 visits, so 8 is not the first count.'],
    'A crossing point can change which choice is best; distinguish a tie from the first strict improvement.');
  addChallenge('02','no-last-setting','Always one better',
    'A game allows any positive whole-number setting, with no largest allowed setting. Moving from any setting to the next one always adds two points and has no other effect.',
    'Which statement is correct?',
    ['Setting 1 is best because it is the first allowed setting','There is a best finite setting, but more tests are needed','There is no highest-scoring setting because every setting has a better next one'],2,
    ['Every later setting scores more than setting 1.','No finite candidate can be best under the stated rule.','For any proposed setting, the next allowed setting scores two points more.'],
    'Before searching for a best choice, check that the allowed choices can actually contain one.');
  addChallenge('02','plateau-tiebreak','Stop when improvement stops',
    'An audio app has whole-number settings from 1 to 10. Clarity improves through setting 6 and is identical from 6 through 10. Battery drain increases at every step. The goal is greatest clarity, then least battery drain among ties.',
    'Which setting should be chosen?',
    ['Setting 6','Setting 10','The information is insufficient'],0,
    ['Setting 6 reaches the greatest clarity and uses less battery than every tied higher setting.','Setting 10 has no clarity advantage over 6 and drains more battery.','The plateau and tie-break rule identify one setting.'],
    'When several choices share the main result, use the stated secondary concern to break the tie.');

  addChallenge('03','isolate-light','Change one thing at a time',
    'Greenhouse X gives one seed variety more light and more water than Greenhouse Y, and X grows taller plants. A manager wants to learn whether the extra light helped.',
    'Which new comparison would isolate the effect of light most directly?',
    ['Give the same variety both more light and more water again','Grow different seed varieties under the same light and water','Use the same variety and water level, but different light levels'],2,
    ['Changing both conditions again leaves their effects mixed together.','This comparison studies variety rather than light.','Holding variety and water fixed leaves light as the relevant difference.'],
    'When several features vary, hold other plausible causes steady before crediting one of them.');
  addChallenge('03','unchecked-grid','A cross is not the whole grid',
    'A treasure board has 10 rows and 10 columns. A searcher checks every square in row 4 and every square in column 6.',
    'How many squares remain unchecked?',
    ['80','81','82'],1,
    ['The row and column contain 20 listed positions, but their intersection was counted twice.','The search checks 10 + 10 − 1 = 19 distinct squares, leaving 100 − 19 = 81.','This would treat two additional squares as checked without a reason.'],
    'Evidence gathered along a few directions may leave combinations elsewhere unchecked.');
  addChallenge('03','parallel-loads','The same total can finish later',
    'Two printers work at the same time, and a batch finishes when the slower printer finishes. Plan A assigns 9 minutes of work to one printer and 3 to the other. Plan B assigns 6 minutes to each.',
    'Which plan finishes first?',
    ['Plan B','Plan A','They finish together because both assign 12 minutes in total'],0,
    ['Under Plan B both printers finish after 6 minutes.','Plan A must wait 9 minutes for the more heavily loaded printer.','Adding the workloads ignores that they are processed in parallel.'],
    'A single total can hide how work is distributed across simultaneous choices.');

  addChallenge('04','current-bottleneck','Which gift can help?',
    'Each rescue trip needs one driver and two volunteers. A center has four drivers and six volunteers. A donor can provide either one additional driver or two additional volunteers.',
    'Which donation can increase the number of trips that can run at the same time?',
    ['Two additional volunteers','One additional driver','Neither donation'],0,
    ['Six volunteers support three trips; eight support four, matching the four drivers.','A fifth driver does not help while six volunteers still support only three trips.','The volunteer donation raises the limit from three trips to four.'],
    'When several limits act together, identify which one blocks the next improvement.');
  addChallenge('04','necessary-not-sufficient','Passing every filter may not be enough',
    'An audit finds that every prize-winning design is symmetric and uses at most 20 parts. Design X is symmetric and uses 18 parts.',
    'What follows from the audit?',
    ['Design X definitely wins','Design X may or may not win; it only passes two necessary tests','Design X definitely loses'],1,
    ['The audit says winners have these properties; it does not say every design with them wins.','The properties rule out some designs but do not by themselves certify a winner.','Nothing in the audit says a design with both properties must lose.'],
    'Conditions that every good solution must satisfy need not be enough to identify a good solution.');
  addChallenge('04','redundant-rule','Which rule adds no restriction?',
    'A venue has two independent attendance rules: the fire code permits at most 80 people, and the staffing plan permits at most 100 people. Every other requirement stays the same.',
    'Which single rule can be removed without changing the set of allowed attendance levels?',
    ['Remove the fire-code rule','Remove both rules','Remove the staffing rule'],2,
    ['Without the 80-person rule, attendance from 81 to 100 becomes allowed.','Without either rule, attendance above 80 becomes allowed.','The 80-person fire limit already guarantees the 100-person staffing limit.'],
    'A looser rule can add no restriction when a tighter rule already covers it.');

  addChallenge('05','hidden-lift','What happened when both changed?',
    'A shop averages 100 visitors. With only a poster it gets 112; with only background music it gets 109; with both it gets 130.',
    'Which comparison correctly detects what happened when both changes were used?',
    ['The additive benchmark is 121, so using both adds 9 visitors beyond it','The additive benchmark is 130, so nothing extra happened','The additive benchmark is 121, so using both loses 9 visitors'],0,
    ['The separate gains are 12 and 9, giving an additive benchmark of 121; the observed 130 is 9 higher.','The observed 130 is the result to explain, not the benchmark from separate tests.','The actual result is above 121, not below it.'],
    'Paired choices can create an effect that separate one-at-a-time tests do not reveal.');
  addChallenge('05','halfway-plan','Blend two allowed plans',
    'Plan R uses 8 hours of printer time and 2 hours of cutter time. Plan S uses 2 printer hours and 8 cutter hours. Each resource has an 8-hour limit, and the work is divisible so a half-R, half-S blend is possible.',
    'What is guaranteed about the half-and-half blend?',
    ['It uses 10 hours of each resource','It uses 5 hours of each resource and respects both limits','Its quality score must exceed both original plans'],1,
    ['This adds the plans in full instead of taking half of each.','Averaging 8 with 2 gives 5 for each resource, below both limits.','Resource use is given, but no rule about the quality score is supplied.'],
    'When choices can be blended, check whether upper limits remain satisfied between allowed plans.');
  addChallenge('05','curved-blend','Test a claim at the midpoint',
    'Recipe R costs 10 credits and recipe S costs 18 credits. A half-R, half-S blend costs 15 credits. Someone claims that every blend costs no more than the same weighted blend of the two endpoint costs.',
    'What does the halfway observation show?',
    ['It supports the claim because 15 is below 18','The claim cannot be tested without observing every possible blend','It disproves the claim because the halfway benchmark is 14, below the observed 15'],2,
    ['The relevant comparison is with the weighted endpoint benchmark, not only the larger endpoint.','A universal claim is disproved by one counterexample.','Half of 10 plus half of 18 is 14, and the actual halfway cost is higher.'],
    'Values between two choices need not follow the straight line joining their endpoint values.');

  addChallenge('07','small-now-big-later','Do not stop at the first reward',
    'The Silver door gives 8 points and ends the game. Bronze gives 5, then either 2 now plus 4 later or 6 now and no later reward. Wooden gives 3, then either 7 now plus 3 later or 9 now and no later reward.',
    'Which first door can produce the highest final score?',
    ['Silver','Bronze','Wooden'],2,
    ['Silver finishes with 8 points.','Bronze can finish with at most 11 points.','Wooden can finish with 13 points through 3 + 7 + 3.'],
    'Compare a current gain together with the best continuation it leaves available.');
  addChallenge('07','duplicate-stage-cost','Charge each consequence once',
    'A delivery contract charges one 4-credit dispatch fee for each trip. A draft calculation adds 4 credits when the van departs and another 4 when it reaches its first stop, both for that same dispatch.',
    'What is the correct repair?',
    ['Keep both charges because two stages are listed','Remove one of the two charges so the dispatch fee is counted once','Remove both charges because the fee is not a travel time'],1,
    ['Listing a consequence at two stages does not make it occur twice.','One charge belongs in the total; assigning it to exactly one stage prevents double counting.','The fee is part of the stated consequence even though it is not measured in minutes.'],
    'When a total is built stage by stage, assign each consequence to exactly one stage.');
  addChallenge('07','unknown-final-value','The last desk changes the first choice',
    'At the first desk, you may exchange a gold token for 8 points, or keep it and take 3 points. At the final desk, a kept token will be worth either 0 or 7 points, but the rule sheet omits which value applies.',
    'Can the better first-desk choice be determined?',
    ['No; the missing final value can reverse the choice','Yes, always exchange the token','Yes, always keep the token'],0,
    ['If the final value is 0, exchanging wins 8 to 3; if it is 7, keeping wins 10 to 8.','Keeping is better when the final value is 7.','Exchanging is better when the final value is 0.'],
    'What remains valuable at the end can change the best choice much earlier.');

  addChallenge('08','shared-favorite','Find the assignment threshold',
    'Two reviewers must receive different papers. Reviewer 1 scores A as 10 and B as 8. Reviewer 2 scores A as 9 and B as x. Assignment scores are added.',
    'When is it strictly better to give A to Reviewer 2 and B to Reviewer 1?',
    ['When x > 7','When x < 7','For every value of x'],1,
    ['If x > 7, giving A to Reviewer 1 produces 10 + x > 17.','Giving A to Reviewer 2 produces 8 + 9 = 17; this beats 10 + x exactly when x < 7.','At x = 8, for example, giving A to Reviewer 1 is better.'],
    'A scarce option may belong where the alternative is weakest; a comparison can reveal the exact threshold.');
  addChallenge('08','weakest-station','The weakest station sets the result',
    'An event rates a staffing plan by its lowest station score. Plan A gives 9, 9 and 2; Plan B gives 7, 6 and 6; Plan C gives 5, 5 and 8. Before rating, exactly 2 bonus points may be added to one station.',
    'Which plan can achieve the highest event rating after using the bonus optimally?',
    ['Plan A','Plan C','Plan B'],2,
    ['Raising the 2 to 4 leaves Plan A’s minimum at 4.','Raising one 5 to 7 leaves the other 5, so Plan C’s minimum stays 5.','Plan B already has minimum 6; adding the bonus to one station cannot lower it, so 6 remains the best attainable minimum.'],
    'How separate outcomes are combined can matter more than their simple total.');
  addChallenge('08','same-completions','Different histories, same remaining task',
    'A five-letter badge must contain exactly two vowels; there are no other letter restrictions. After three letters, the partial badges are CAT, DOG and EEL.',
    'Which two partial badges allow exactly the same kinds of valid two-letter endings?',
    ['CAT and DOG','CAT and EEL','DOG and EEL'],0,
    ['CAT and DOG each contain one vowel, so each ending needs exactly one more.','CAT needs one more vowel, while EEL needs only consonants.','DOG needs one more vowel, while EEL needs only consonants.'],
    'Different histories can become equivalent when they leave the same requirement for the future.');

  addChallenge('09','two-night-pattern','The daily chance is not the whole story',
    'For System X, each night is a fresh half-and-half draw unaffected by the other night. System Y succeeds on both nights with probability one-half and fails on both nights with probability one-half.',
    'Which system is more likely to succeed at least once over two nights?',
    ['System X','System Y','They are equal because each has a one-half chance on one night'],0,
    ['Only fail-fail misses for X, so its chance is three-fourths.','Y succeeds at least once only in its both-success outcome, with chance one-half.','Matching one-night chances does not fix a two-night result when the relationship differs.'],
    'A sequence of uncertain outcomes depends on how stages are related, not only on each stage viewed alone.');
  addChallenge('09','forecast-price','How much is perfect information worth?',
    'Rain has a one-in-three chance. Reserving an umbrella costs 1 credit whether or not it rains. Without a reservation, rain causes 4 credits of loss and a dry day costs nothing. A perfect forecast arrives before the reservation decision.',
    'What is the most you should pay for that forecast if only average cost matters?',
    ['One-third of a credit','Two-thirds of a credit','One credit'],1,
    ['One-third is the remaining average cost with the forecast, not the saving.','Always reserving costs 1; with the forecast, reserve only in rain for an average one-third, saving two-thirds.','Paying 1 would exceed the forecast’s two-thirds saving.'],
    'Information has value only through the later choices it allows you to change.');
  addChallenge('09','discard-without-chances','No weather probabilities needed',
    'Completion times under Calm, Windy and Storm weather are: Plan A — 6, 8, 11 minutes; Plan B — 7, 10, 13; Plan C — 5, 9, 15. Weather probabilities are not given, and shorter is preferred.',
    'Which plan can be discarded even without those probabilities?',
    ['Plan A','Plan C','Plan B'],2,
    ['A is faster than B in every weather and trades places with C.','C is fastest in Calm weather, so it cannot be ruled out without the weather mix.','B is slower than A in all three conditions, so no probability mix can make its average lower.'],
    'A choice that is worse in every possible outcome can be removed before outcome chances are known.');

  addChallenge('10','starting-mix','The missing starting mix',
    'A city has North and South bus routes. On a typical trip, 9 out of 10 North buses are late, while 1 out of 10 South buses are late. You see that one bus is late, but do not know how many trips usually begin on each route.',
    'Which conclusion is justified about the route of the late bus?',
    ['It is more likely to be a North bus','It is more likely to be a South bus','The route cannot be ranked without knowing the usual mix of North and South trips'],2,
    ['North buses have a higher late rate, but that alone does not settle which route contributes more late buses.','South buses may be much more common, so their lower late rate could still produce more late buses.','The usual route frequencies are needed to compare the two possible sources of a late bus.'],
    'When an observation has several possible sources, consider both the rate within each source and how common each source is.');
  addChallenge('10','two-days','Reach tomorrow through today',
    'A device has a 20% chance of failing today. If it survives today, it has a 10% chance of failing tomorrow.',
    'What is the chance that it has failed by the end of tomorrow?',
    ['28%','30%','2%'],0,
    ['Failure today contributes 20%; surviving today and then failing contributes 80% × 10% = 8%, for 28% in total.','Adding 20% and 10% ignores that tomorrow’s failure branch is reached only after survival today.','This counts only survival today followed by failure tomorrow.'],
    'Combine distinct routes to an event, and condition a later route on reaching it.');
  addChallenge('10','three-voters','When two out of three are enough',
    'Three voters decide independently. Each voter selects the better proposal with probability 0.6. The majority decision is better when exactly two or all three voters are correct.',
    'What is the probability that the majority selects the better proposal?',
    ['0.600','0.648','0.360'],1,
    ['The majority improves on one voter here because several winning combinations are possible.','Exactly two correct contributes 3 × 0.6² × 0.4 = 0.432, and all three contributes 0.6³ = 0.216; together they give 0.648.','This counts only two specified voters being correct and misses other winning cases.'],
    'When an event can happen through several distinct cases, count every case without overlap.');

  addChallenge('11','visit-versus-occupy','Visited is different from being there',
    'A token starts at A. On its first move, it goes to T or B with equal chance. From either T or B, its second move goes to T or B with equal chance.',
    'Which comparison is correct?',
    ['The chance of visiting T within two moves is 3/4, while the chance of being at T after two moves is 1/2','Both chances are 1/2','The chance of being at T after two moves is 3/4, while visiting T within two moves is 1/2'],0,
    ['Half visit T immediately; another quarter first visit B and then T. At the second move, half of all paths end at T.','This misses paths that visit T first and leave on the second move.','It reverses the two events.'],
    'Being in a place at a stated time and having visited it by that time are different events.');
  addChallenge('11','map-claim','A route map is not a guarantee',
    'A visitor always moves from Entrance to Atrium. From Atrium, the next move can be back to Entrance or onward to Gallery. Gallery leads only to Gallery. The map does not state how the choice at Atrium is made.',
    'Does the map alone prove that every visitor starting at Entrance eventually reaches Gallery?',
    ['Yes, because a path to Gallery exists','No; a visitor could keep returning from Atrium to Entrance','No, because Gallery leads only to itself'],1,
    ['A possible path establishes reachability, not that every allowed route takes it.','The map permits repeated Entrance–Atrium returns, so the universal claim does not follow from the map alone.','What happens after reaching Gallery does not prevent it from being reached.'],
    'Separate what a map makes possible from what its transition rules make inevitable or likely.');
  addChallenge('11','two-step-paths','Add the paths that reach the target',
    'A token starts at A. Its first move goes to B or C with equal chance. From B it certainly moves to D. From C it moves to D with equal chance or returns to A with equal chance.',
    'What is the chance that the token is at D after exactly two moves?',
    ['One half','One quarter','Three quarters'],2,
    ['This counts only the route through B.','This counts only the route through C.','The route through B contributes one half, and the route through C contributes one quarter, totaling three quarters.'],
    'For a multi-step destination, identify every path that arrives there and combine their chances.');

  addChallenge('13','closed-regions','The starting region can persist',
    'A robot moves forever on one of two disconnected loops, Red or Blue, and can never cross between them. Its starting loop is unknown.',
    'Can its long-run fraction of time on the Red loop be determined?',
    ['Yes, it must be one half because there are two loops','Yes, it must approach zero as time passes','No; it is 1 if the robot starts on Red and 0 if it starts on Blue'],2,
    ['The number of loops does not create movement between them.','Time does not move the robot across a missing connection.','Each loop is closed, so the starting region determines the long-run result.'],
    'When separate closed regions exist, a long-run conclusion may still depend on where the process starts.');
  addChallenge('13','switching-cost','The same share can hide different switching costs',
    'Two machines are active exactly half the time over a long month. Machine A alternates every minute. Machine B runs for twelve hours, then rests for twelve hours. Each start-up causes one unit of wear.',
    'Which conclusion is justified about start-up wear?',
    ['Machine A has more start-up wear over the month','The machines must have the same wear because their active shares match','Machine B has more wear because its active periods are longer'],0,
    ['A starts far more often while producing the same active-time share.','Time spent active does not state how often activity begins.','Long active periods give B fewer starts, not more.'],
    'A long-run state share can determine a state-based consequence while missing a consequence attached to transitions.');
  addChallenge('13','stable-population','A stable mix can hide constant movement',
    'A large set of signs starts with half Green and half Purple. At every beep, every Green sign becomes Purple and every Purple sign becomes Green.',
    'Which statement is correct?',
    ['Each individual sign eventually settles on one color','The population remains half Green and half Purple even though every individual switches each time','All signs eventually show the same color'],1,
    ['Every individual continues alternating forever.','The two equal groups exchange colors, so the overall proportions remain unchanged.','Simultaneous switching preserves the two equally sized groups.'],
    'A stable distribution across a population does not mean individual paths have stopped changing.');

  addChallenge('14','duration-weighting','A random time favors long stays',
    'A system repeats the same cycle forever: Flash for 1 minute, then Rest for 9 minutes.',
    'If you observe it at a uniformly random time far into operation, which state are you more likely to see?',
    ['They are equally likely because the cycle visits each state once','Rest, because it occupies 9/10 of every cycle','Flash, because it occurs first in every cycle'],1,
    ['Visit counts ignore how long each visit lasts.','Nine of each ten minutes are Rest, so a random time lands there with probability 9/10.','Position in the cycle does not outweigh duration.'],
    'Time shares weight states by their durations, not by how many times they are entered.');
  addChallenge('14','age-effect','An average duration does not fix the next minute',
    'A help desk reports that tickets remain open for 20 minutes on average. It gives no further information about how closing chances change as a ticket gets older.',
    'Which statement is warranted?',
    ['An old ticket must be more likely to close next minute than a new one','An old and a new ticket must have equal next-minute closing chances','Neither comparison follows from the average duration alone'],2,
    ['An increasing chance with age is possible but is not implied by the average.','Equal next-minute chances require an additional assumption that was not supplied.','Many duration patterns share the same average while having different age effects.'],
    'Before treating elapsed time as irrelevant, check whether the duration rule supports that assumption.');
  addChallenge('14','competing-means','Two averages do not determine the first finish',
    'A customer issue can end when either a self-service guide works or a staff member responds. Each mechanism, considered alone, takes 60 minutes on average. Nothing is said about their timing patterns or whether they influence each other.',
    'What is the expected time until the issue ends?',
    ['It cannot be determined from the two averages alone','Exactly 30 minutes','Exactly 60 minutes'],0,
    ['The separate means do not specify the timing patterns or dependence needed to determine the first finish.','Thirty minutes would require additional assumptions about the two mechanisms.','A second possible finishing mechanism can reduce the wait, but the reduction is not fixed by the separate means.'],
    'When several clocks compete, identify the assumptions needed before combining their separate summaries.');

  const weeks=[...new Set(questions.map(q=>q.week))];
  return {questions,weeks,get:id=>questions.find(q=>q.id===id),
    forWeek:week=>questions.filter(q=>q.week===week).sort((a,b)=>Number(a.challenge)-Number(b.challenge) || Number(a.stretch)-Number(b.stretch))};
})();
