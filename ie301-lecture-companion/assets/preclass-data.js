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

  add("01",
    "straight-path",
    "Does every straight path stay in the walking area?",
    "A square courtyard has a circular pond in its center. The courtyard boundary is part of the walking area, but people cannot walk through the pond. A designer says that the straight line segment between any two allowed positions always stays in the walking area.",
    "Which test can show that the designer's claim is false?",
    ["Choose two allowed positions on opposite sides of the pond whose joining segment crosses it", "Choose two allowed positions on the same outer edge of the courtyard", "Check that every allowed position can be reached by some curved path"],
    0,
    ["This pair is a counterexample. Part of the straight segment crosses the forbidden pond, so the claim about every pair is false.", "This segment stays in the walking area, but one successful pair cannot prove a claim about every pair.", "A curved path may go around the pond. This does not show that the straight segment stays in the walking area."],
    "A set is convex if the full straight segment between every pair of its points stays in the set. One pair that fails this test proves that the set is not convex.");

  add("01",
    "chord-comparison",
    "Compare a middle point with the line between two endpoints",
    "A reward curve gives a reward of 0 at effort 0, a reward of 8 at effort 2, and a reward of 12 at effort 4. Draw the straight line that connects the two endpoint observations, (0,0) and (4,12). Now compare the middle observation, (2,8), with this line.",
    "Where is the middle observation compared with the straight line?",
    ["Below the line, because 8 is less than 12", "On the line, because effort 2 is halfway between 0 and 4", "Above the line, because the line has height 6 at effort 2"],
    2,
    ["The correct comparison is with the line's height at effort 2, not with the reward at effort 4. The line's height at effort 2 is 6.", "A halfway input does not always produce a halfway output. Here the halfway height on the line is 6, but the observed reward is 8.", "At the halfway input, the line's height is the endpoint average: (0 + 12)/2 = 6. The observed reward 8 is above 6."],
    "A concave curve lies on or above the straight lines that join points on the curve. These three observations fit that pattern, but they do not prove concavity everywhere.");

  add("01",
    "interior-best",
    "Can the best setting be inside the interval?",
    "A machine can use any real-number setting x from 0 to 8, including both endpoints. Its score is 20 − (x − 3)². The operator plans to compare only the endpoint settings, x = 0 and x = 8.",
    "What best setting does this plan miss?",
    ["It misses nothing, because an endpoint must give the highest score on an interval", "Setting 3 gives a score of 20, and no other setting gives a higher score", "There is no highest score because the machine has infinitely many possible settings"],
    1,
    ["A nonlinear score does not have to reach its highest value at an endpoint. An interior setting can be best.", "The square (x − 3)² is always at least zero and equals zero at x = 3. Therefore, the score cannot exceed 20, and x = 3 reaches 20.", "A set can have infinitely many choices and still contain a best choice. Here x = 3 gives the maximum score."],
    "A nonlinear objective can reach its best value inside a convex feasible region, where straight segments between allowed points stay allowed. Checking only the boundary can miss the optimum.",
    true);

  add("02",
    "narrow-range",
    "Use feedback to reduce the possible range",
    "A locker code is a whole number from 1 to 100. After a guess of 62, the system says that the guess is too high. After a guess of 37, it says that the guess is too low.",
    "Which range contains all codes that are still possible?",
    ["1 through 36", "38 through 61", "63 through 100"],
    1,
    ["Every number from 1 through 36 is below 37. These numbers cannot be correct because 37 was already too low.", "The code must be greater than 37 and less than 62. The remaining whole numbers are 38 through 61.", "Every number from 63 through 100 is above 62. These numbers cannot be correct because 62 was already too high."],
    "Feedback can reduce a one-dimensional search range. This allows us to remove many choices without testing them one by one.");

  add("02",
    "common-unit",
    "Convert measurements before comparing them",
    "A storage shelf accepts only parcels shorter than 75 centimeters. A parcel label gives its length as 0.8 meters. You need to decide whether the parcel follows the shelf's length rule.",
    "Does the parcel satisfy the length rule?",
    ["Yes, because 0.8 is less than 75", "It is impossible to decide because the measurements use different units", "No, because 0.8 meters equals 80 centimeters"],
    2,
    ["The numbers 0.8 and 75 use different units, so comparing the numbers directly is incorrect. First convert them to the same unit.", "Different units do not make the decision impossible. We can convert meters to centimeters and then compare the lengths.", "Since 1 meter is 100 centimeters, 0.8 meters is 80 centimeters. The parcel is longer than the 75-centimeter limit."],
    "Convert quantities to the same unit before comparing them. A correct optimization model must also use consistent units.");

  add("02",
    "tested-only",
    "State only what the tests support",
    "A dial has whole-number settings from 1 to 9. Tests show a score of 7 at setting 2, a score of 12 at setting 5, and a score of 9 at setting 8. The other six settings have not been tested.",
    "Which statement is supported by the test results?",
    ["Setting 5 is best among the three tested settings", "Setting 5 is best among all nine settings", "The scores must continue to fall from setting 6 through setting 9"],
    0,
    ["The three observed scores are 7, 12, and 9. Among these tested settings, 12 is the highest score.", "An untested setting could have a score greater than 12. The tests do not identify the best of all nine settings.", "The lower score at setting 8 does not tell us the scores at settings 6, 7, or 9. The unobserved pattern may change."],
    "Search results support claims about the choices that were tested. Claims about untested choices need more information or stronger assumptions.",
    true);

  add("03",
    "forced-share",
    "When does one choice determine another?",
    "A van must carry exactly 17 crates. Each crate is either chilled or dry. The dispatcher first chooses the number of chilled crates, and then must choose the number of dry crates so that the total is exactly 17.",
    "After the chilled-crate number is chosen, what happens to the dry-crate number?",
    ["The required total fixes the number of dry crates", "The number of dry crates can still be chosen independently", "The number of dry crates must equal the number of chilled crates"],
    0,
    ["If c chilled crates are chosen, the van must carry 17 − c dry crates. Only this number makes the total equal 17.", "An independent choice could make the total smaller or larger than 17. The exact-total rule connects the two choices.", "The two crate types do not need equal numbers. Their numbers only need to add up to 17."],
    "An equality can make one variable depend on variables chosen earlier. This can reduce the number of free choices in a model.");

  add("03",
    "keep-rule",
    "Keep the original requirement after simplifying",
    "A relay route must cover exactly 23 kilometers. A planner enters the distances of the first three runners, whose total cannot exceed 23 kilometers. The planning sheet then gives the last runner the remaining distance, 23 minus that total. This remaining distance must be zero or more.",
    "What must the planning sheet still guarantee?",
    ["All four runners cover the same distance", "The four distances add up to 23 kilometers", "The last runner always has the longest part of the route"],
    1,
    ["The route requirement does not say that all runners must cover equal distances. It only fixes their total distance.", "The last distance is 23 minus the first three distances. Therefore, all four distances must still add up to exactly 23 kilometers.", "The remaining distance may be shorter or longer than the other distances. This depends on the first three choices."],
    "When we remove a variable from a model, the simpler model must still satisfy the original requirement. Substitution should preserve the exact total.");

  add("03",
    "local-gain-direction",
    "Compare small moves of the same length",
    "Near the current setting, the predicted score change is 3Δx + 4Δy. Here Δx and Δy are small changes in x and y. Compare three moves of the same length: A = (ε,0), B = (0,ε), and C = (0.6ε,0.8ε), where ε is a small positive number.",
    "Which move gives the largest predicted increase in the score?",
    ["Move A", "Move B", "Move C"],
    2,
    ["For move A, the predicted increase is 3ε + 4(0) = 3ε. This is smaller than the increases from B and C.", "For move B, the predicted increase is 3(0) + 4ε = 4ε. This is larger than A's increase but smaller than C's.", "For move C, the predicted increase is 3(0.6ε) + 4(0.8ε) = 5ε. This is the largest of the three predicted increases."],
    "The gradient, which is the vector of partial derivatives, shows a direction of improvement. Comparing moves of equal length keeps the focus on direction instead of distance.",
    true);

  add("04",
    "limit-target",
    "A maximum limit is not a required target",
    "A workshop can admit no more than nine participants. This means nine is the maximum allowed attendance. Seven people register, and the workshop has no rule that requires a minimum number of participants.",
    "What does the attendance rule say about the seven registered participants?",
    ["Seven participants satisfy the rule", "The workshop must find two more participants", "The workshop must reject two participants"],
    0,
    ["Seven is less than the maximum of nine. Therefore, an attendance of seven satisfies the rule.", "The rule allows up to nine participants but does not require nine. There is also no minimum-attendance rule.", "The workshop only needs to reject people if attendance is above nine. Seven does not exceed the limit."],
    "Translate an upper limit as “at most,” not as an exact target. Inequality constraints allow values below their limits.");

  add("04",
    "stay-on-equality",
    "Change two allocations while keeping their total fixed",
    "Two allocations x and y must satisfy x + y = 10 exactly. A proposed improvement increases x by 1. Both current allocations are greater than 1, so decreasing either allocation by 1 would keep it at zero or more.",
    "What change in y keeps the proposal feasible, meaning that it still follows all the rules?",
    ["Leave y unchanged", "Decrease y by 1", "Increase y by 1"],
    1,
    ["If x increases by 1 and y does not change, their total becomes 11. This breaks the equality x + y = 10.", "Increasing x by 1 and decreasing y by 1 makes the two changes cancel. Their total stays equal to 10.", "If both x and y increase by 1, their total becomes 12. This breaks the required equality."],
    "With an equality constraint, variables may need to move together. A useful change must improve the objective while keeping the equality true.");

  add("04",
    "nearby-best",
    "Decide what nearby comparisons prove",
    "A seating plan has a score of 82 points. Every plan made by swapping one pair of adjacent seats has a lower score. Plans that require two or more swaps have not been checked.",
    "Which statement is supported by these comparisons?",
    ["The plan is best among all possible seating arrangements", "No other seating arrangement can also have a score of 82", "The plan beats every arrangement that is one adjacent swap away"],
    2,
    ["An unchecked arrangement that is two or more swaps away could have a higher score. The comparisons do not prove a global best plan.", "An unchecked arrangement could also have a score of 82. The comparisons only rule out a tie among arrangements one adjacent swap away.", "The context says that every arrangement one adjacent swap away has a lower score. This is exactly what the comparisons prove."],
    "A solution can be best among nearby alternatives without being best everywhere. Local evidence does not automatically prove a global optimum.",
    true);

  add("05",
    "double-count",
    "Count every greeting one time",
    "Five teammates write down who they greeted. Each greeting is between exactly two teammates. Both teammates write the other person's name, so the lists contain 20 entries in total.",
    "How many separate greetings happened?",
    ["10", "20", "5"],
    0,
    ["Each greeting creates two list entries, one from each teammate. Therefore, 20 / 2 = 10 greetings happened.", "This answer counts every greeting twice because both people record it.", "Dividing 20 by the five teammates does not match how each greeting is recorded. Every greeting creates two entries."],
    "Today, check whether one pair has been counted in both directions before you calculate a total.");

  add("05",
    "square-increments",
    "Find the rule for the growing total",
    "A device has a battery-use setting. At setting 0, the added battery drain is 0. Each move up by one setting adds 1, then 3, then 5, then 7 percentage points of battery drain. Let n be the setting number, from 0 to 4.",
    "Which rule gives the total added drain at every recorded setting?",
    ["2n", "n²", "n³"],
    1,
    ["At n = 3, this rule gives 6. The recorded total is 1 + 3 + 5 = 9.", "The totals are 0, 1, 4, 9, and 16. These values are the squares of 0, 1, 2, 3, and 4.", "At n = 2, this rule gives 8. The recorded total is 1 + 3 = 4."],
    "A quadratic term, such as n², changes by a different amount at each step. A rule that matches these records is a possible model, but the records do not prove what happens at settings that were not tested.");

  add("05",
    "curved-penalty",
    "Compare the harm from equal total waits",
    "A service gives 1 harm point for a 1-minute wait, 4 points for a 2-minute wait, and 9 points for a 3-minute wait. In Plan A, two people wait 3 minutes and 1 minute. In Plan B, they each wait 2 minutes.",
    "Which plan gives the lower total harm?",
    ["Plan A", "They are equal because both total 4 minutes", "Plan B"],
    2,
    ["Plan A gives 9 + 1 = 10 harm points. This is more than Plan B's total.", "Both plans have 4 total waiting minutes, but longer waits receive much larger penalties. Equal total time does not mean equal total harm.", "Plan B gives 4 + 4 = 8 harm points. This is lower than Plan A's 10 points."],
    "A curved penalty can rank two plans differently even when their simple totals are equal.",
    true);

  add("07",
    "last-piece",
    "Work backward from the last piece",
    "A mosaic strip uses pieces that are exactly 4 cm or 6 cm long. The completed strip must be exactly 14 cm long. Think about the strip length just before the final piece is added.",
    "Which pair lists all possible lengths just before the final piece is added?",
    ["8 cm or 10 cm", "4 cm or 6 cm", "12 cm or 13 cm"],
    0,
    ["Before a final 6 cm piece, the strip must be 8 cm long. Before a final 4 cm piece, it must be 10 cm long.", "These are the lengths of individual pieces. They are not the possible total lengths before the final piece.", "Adding either a 4 cm or 6 cm piece to 12 cm or 13 cm cannot produce exactly 14 cm."],
    "Today, work backward from the required final result to find the possible earlier situations.");

  add("07",
    "anchor",
    "Add one value to fix the whole row",
    "Five covered cards are in a row. The number on each card is 4 greater than the number on the card directly to its right. This difference tells you how the numbers are related, but no card value is known yet.",
    "Which extra fact is enough to find all five numbers?",
    ["The color on the backs of the cards", "Whether the largest number is even", "The number on any one card"],
    2,
    ["The back color gives no information about any number. It cannot provide a starting value for the row.", "Knowing that the largest number is even still allows many possible rows. For example, different even starting values can all follow the same difference of 4.", "From one known card, you can add or subtract 4 as you move along the row. This determines every other card."],
    "A repeated relationship can determine a whole chain after one value is fixed as its starting point.");

  add("07",
    "better-prefix",
    "Replace a more expensive first part",
    "Two routes reach the same checkpoint with the same amount of time and fuel left. One route has used 7 coupons, while the other has used 11. All later choices depend only on the checkpoint, time left, and fuel left. The goal is to use as few coupons as possible.",
    "Could the best complete trip need the route that used 11 coupons to reach this checkpoint?",
    ["Yes, because it may have visited better scenery", "No, follow the same remaining route after the 7-coupon start", "There is no way to tell without listing every future route"],
    1,
    ["Scenery is not part of the goal and does not affect later choices. It cannot make the 11-coupon route better.", "Both routes allow exactly the same later choices. Using the same future after the 7-coupon route always saves 4 coupons.", "The problem already says that both routes have the same possible future. Therefore, you do not need to list every later route."],
    "When different histories lead to the same future situation, keep the best result achieved so far and reuse it.",
    true);

  add("08",
    "arcade-split",
    "Divide four tokens between two games",
    "You have four arcade tokens to divide between Puzzle and Racing. Puzzle gives 0, 6, 9, 10, or 10 points when you spend 0, 1, 2, 3, or 4 tokens. Racing gives 0, 4, 7, 9, or 10 points for the same token amounts.",
    "Which listed division of the four tokens gives the highest total score?",
    ["1 token on Puzzle and 3 on Racing", "2 tokens on each", "3 tokens on Puzzle and 1 on Racing"],
    1,
    ["Puzzle gives 6 points and Racing gives 9. The total is 6 + 9 = 15 points.", "Puzzle gives 9 points and Racing gives 7. The total is 9 + 7 = 16 points, the highest listed total.", "Puzzle gives 10 points and Racing gives 4. The total is 10 + 4 = 14 points."],
    "Today, compare different ways to divide one limited resource among several uses.");

  add("08",
    "feasible-actions",
    "Find the choices that three tickets allow",
    "A craft booth has exactly three choices. You can skip the booth for 0 tickets, make a badge for 2 tickets, or make a model for 5 tickets. You have 3 tickets left.",
    "Which option lists every choice that you can make now?",
    ["Skip or make a badge", "Skip, make a badge or spend exactly 3 tickets", "Make a badge or make a model"],
    0,
    ["Skipping costs 0 tickets and the badge costs 2, so both fit your remaining 3 tickets. The 5-ticket model does not fit.", "The booth does not offer a choice that costs exactly 3 tickets. A possible cost must come from the stated menu.", "The model costs 5 tickets, which is more than the 3 tickets left. This list also incorrectly leaves out the choice to skip."],
    "Use the resource you still have and the cost of each action to find which actions are possible.");

  add("08",
    "dominated-spend",
    "Save a token when the reward is the same",
    "At one booth, spending 2 tokens gives 7 stars. Spending 3 tokens also gives 7 stars. You can use any saved token at later booths, and having an extra token never removes a later choice.",
    "Which choice can you remove before comparing complete plans?",
    ["Spend 2 tokens here", "Neither choice", "Spend 3 tokens here"],
    2,
    ["Spending 2 tokens gives the same 7 stars and leaves one more token for later. It can be at least as good as spending 3.", "The two choices are not equally useful. Spending 3 gives no extra stars and leaves fewer tokens for later booths.", "Spending 3 tokens uses one extra token for the same 7 stars. The saved token can only keep or improve your later choices."],
    "You can remove a choice when it uses more resources, gives no extra benefit now, and cannot help later.",
    true);

  add("09",
    "contingent-plan",
    "Choose now and respond to new information later",
    "A hiking team must choose its base camp today. Tomorrow, the team will see whether the river is low or high. After seeing the river level, it will choose either the footbridge or the ferry.",
    "Which note gives a complete plan without acting as if tomorrow's river level is already known?",
    ["Choose North Camp today; use the footbridge tomorrow only if the river is low", "Choose North Camp today; if the river is low use the footbridge, and if it is high use the ferry", "Choose today's base camp tomorrow after seeing the river"],
    1,
    ["This note says what to do if the river is low, but gives no action for a high river. The plan is incomplete.", "This note fixes the choice that is due today. It also gives one action for each river level that may be seen tomorrow.", "The team must choose the base camp today. It cannot delay that choice until tomorrow's river level is known."],
    "A plan over several stages can give rules for later actions based on the information available at that time.");

  add("09",
    "average-route",
    "Compare a steady route with an uncertain route",
    "Route A always takes 8 minutes. Route B takes 4 minutes on half of the trips and 14 minutes on the other half. You will make the trip many times and want the lowest average travel time.",
    "Which route should you choose for the lower average travel time?",
    ["Route A", "Route B", "They have the same average"],
    0,
    ["Route A always takes 8 minutes, so its average is 8. Route B's average is (4 + 14) / 2 = 9 minutes.", "Route B is sometimes fast, but its 14-minute trips raise its average to 9 minutes. This is above Route A's 8 minutes.", "The averages are different. Route A averages 8 minutes, while Route B averages 9 minutes."],
    "To find an average result under uncertainty, combine every possible outcome with how often it happens.");

  add("09",
    "risk-profile",
    "Look beyond the average to measure lateness",
    "Route A always takes 10 minutes. Route B takes 1 minute on half of the trips and 19 minutes on the other half. Both routes average 10 minutes, but any trip longer than 12 minutes counts as late.",
    "Which statement correctly compares their chances of being late?",
    ["Equal averages mean equal chances of being late", "Route B cannot be late because it is sometimes very fast", "Route A is never late, while Route B is late on half the trips"],
    2,
    ["An average does not show how often a result passes a fixed limit. Two routes with the same average can have different chances of lateness.", "Route B's fast trips do not remove its slow trips. Its 19-minute outcome is longer than 12 minutes and is late.", "Route A's 10-minute time is always below the 12-minute limit. One of Route B's two equally likely times is 19 minutes, so it is late on half of the trips."],
    "An average can hide the exact bad outcome that your decision is trying to avoid.",
    true);

  add("10",
    "rain",
    "Use today's weather",
    "Campus shuttle records separate dry days from rainy days. On dry days, 18% of shuttle trips are late. On rainy days, 45% are late. You look outside before your trip and see that it is raining today.",
    "Which percentage should you use for the chance that your shuttle is late today?",
    ["Use 18%", "Use 45%", "Add the two rates and use 63%"],
    1,
    ["The 18% rate is for dry days, but today is rainy. It does not use the information you have.", "The 45% rate is correct because it describes rainy days like today.", "The two rates apply under different weather conditions. Adding 18% and 45% does not give today's chance."],
    "New information can tell you which group to use. Here, knowing that it is raining makes the rainy-day rate relevant.");

  add("10",
    "shared-cause",
    "Two sensors share one risk",
    "Sensor A works on 90% of days. Sensor B also works on 90% of days. They use the same power outlet, so one power cut can stop both sensors at the same time. You have no other information about how their failures are connected.",
    "Is there enough information to find the exact chance that both sensors work on the same day?",
    ["Yes. The chance must be 81%", "Yes. The chance must be 90%", "No. The two separate 90% rates are not enough"],
    2,
    ["The calculation 90% × 90% = 81% works only when one sensor's result does not affect what we know about the other. That relationship was not given.", "A 90% chance for both would mean that the sensors always work and fail together. Sharing an outlet does not prove this.", "Many different patterns of failing together or separately can give each sensor a 90% success rate. Therefore, the exact chance that both work cannot be found."],
    "Before multiplying two chances, check how the events are related. A common cause, such as a shared power outlet, can link them.");

  add("10",
    "voucher",
    "Find the average result of the game",
    "One play of a game costs 15 TL. Each play has a one-in-five chance of paying 60 TL. In the other four cases out of five, the game pays nothing. You want to judge the result over many plays, including the fee each time.",
    "What would your average gain or loss be for each play?",
    ["An average loss of about 3 TL", "An average gain of about 45 TL", "No average gain or loss"],
    0,
    ["The average payment is (1/5) × 60 TL = 12 TL. After the 15 TL fee, the average result is 12 − 15 = −3 TL.", "The 45 TL amount is the gain on a winning play after paying the fee. It ignores the four losing plays out of five.", "To have no average gain or loss, the average payment would need to equal the 15 TL fee. It is only 12 TL."],
    "An average result uses every possible outcome and how often it happens. It must also include any cost paid before the outcome is known.",
    true);

  add("11",
    "overlap",
    "Make the groups clear",
    "A club wants to give each visitor exactly one group label. Its three labels are Student, Under 25, and Other. For this system to work, every visitor must fit one label, and no visitor may fit two labels at the same time.",
    "Why do these three labels fail to create clear groups?",
    ["A visitor who is a student and under 25 fits two groups", "Every visitor has to fit the Student group", "The Other group must include every visitor"],
    0,
    ["This person fits both Student and Under 25. The two groups overlap, so the person does not receive exactly one label.", "People who are not students can use another label. The problem is that some people fit two of the first labels.", "Other can mean visitors who fit neither Student nor Under 25. It does not have to include everyone."],
    "State labels should cover every possible situation without overlap. This lets each situation have one clear state.");

  add("11",
    "campus-route",
    "Reach a place in two moves",
    "A student starts at the library. The student may move from the library to the cafeteria, and then from the cafeteria to the dorm. There is no direct move from the library to the dorm. Each trip between two listed places counts as one move.",
    "Can the student reach the dorm after two moves from the library?",
    ["No, because there is no direct move from the library", "Only if the student begins at the dorm", "Yes, by going through the cafeteria"],
    2,
    ["A missing direct move rules out a one-move trip. It does not rule out a route with two moves.", "The student begins at the library, as stated. Starting at the dorm is not part of this question.", "The student can move from the library to the cafeteria and then to the dorm. These are exactly two allowed moves."],
    "A place can be reached through another place even when no direct move exists. Multi-step movement comes from joining allowed one-step moves.");

  add("11",
    "late-streak",
    "Keep the information that affects tomorrow",
    "Each daily delivery is recorded as either on time or late. The rule for tomorrow uses the length of the current late streak, which is the number of late days in a row up to today. Two deliveries can both be late today but have different streak lengths.",
    "Is today's label by itself enough to predict tomorrow with this rule?",
    ["Yes. Today's label always gives all the needed information", "No. Also record the length of the current late streak", "No. Record every result from the delivery's full history"],
    1,
    ["The label late does not show whether the current streak has lasted one day or many days. Those cases can have different chances tomorrow.", "The streak length is exactly the past information used by the rule. Adding it makes the description enough for predicting tomorrow.", "The rule uses only the current late streak. Results before that streak do not affect tomorrow, so the full history is unnecessary."],
    "A useful state description keeps all past information that affects the next step. It does not need past details that no longer matter.",
    true);

  add("13",
    "parity",
    "Track an odd number of color changes",
    "A sign begins Green. At every beep, it changes to the other color: Green becomes Purple, and Purple becomes Green. This rule never changes, and no beep is missed. You check the sign immediately after the 37th beep.",
    "Which color does the sign show after 37 beeps?",
    ["The sign is Purple", "The sign is Green", "There is not enough information to know"],
    0,
    ["The sign is Purple after every odd number of changes. Because 37 is odd, it is Purple.", "The sign returns to Green after every even number of changes. The number 37 is not even.", "The starting color and the rule are both given. They determine the color after exactly 37 changes."],
    "A state may appear only after certain numbers of steps. Here, odd and even step numbers lead to different colors.");

  add("13",
    "mutual-reach",
    "Find the rooms connected both ways",
    "A building has one-way doors between three rooms. A door goes from A to B, another goes from B to C, and another goes from C back to B. There is no door or longer route that leads from B or C back to A.",
    "Which pair allows travel from either room to the other, perhaps through several doors?",
    ["Rooms A and B", "Rooms B and C", "Rooms A and C"],
    1,
    ["A can reach B, but B cannot reach A. Travel is possible in only one direction for this pair.", "B has a direct door to C, and C has a direct door to B. Each room can reach the other.", "A can reach C through B, but C cannot return to A. This pair is also connected in only one direction."],
    "One-way reach means that one state can lead to another. A communicating pair requires a possible route in both directions.");

  add("13",
    "workspace-cost",
    "Find which mode adds the most cost",
    "Over a long period, a workspace is Empty 20% of the time, Busy 50% of the time, and Packed 30% of the time. The support cost is 0 TL per hour when Empty, 10 TL when Busy, and 40 TL when Packed.",
    "Which workspace mode adds the largest amount to the long-run average support cost?",
    ["Empty mode", "Busy mode", "Packed mode"],
    2,
    ["Empty mode adds 20% × 0 TL = 0 TL to the average hourly cost. It adds nothing to the bill.", "Busy mode adds 50% × 10 TL = 5 TL to the average hourly cost. This is less than the Packed contribution.", "Packed mode adds 30% × 40 TL = 12 TL to the average hourly cost. This is the largest of the three contributions."],
    "To find a long-run average cost, multiply the time share of each state by its cost. A state with less time can still add more cost if its hourly cost is high.",
    true);

  add("14",
    "between-observations",
    "What happened between two checks?",
    "A record shows that a rental scooter was available at 10:00. At the next check, at 11:00, the scooter was in use. Its status can change at any instant, and there is no record of its status between these two times.",
    "What must be true because of the two recorded statuses?",
    ["The status changed at least once between 10:00 and 11:00", "The change happened exactly at 11:00", "The records do not show that any status change happened"],
    0,
    ["The scooter has different statuses at 10:00 and 11:00. Therefore, at least one change must have happened between the checks.", "The second check shows the status at 11:00, not the exact change time. The change could have happened earlier.", "A change must separate the two different recorded statuses. The missing information concerns when and how many times it changed."],
    "Observation times tell us when a system was checked. They do not automatically tell us the exact times when events occurred.");

  add("14",
    "one-action",
    "Change only one tag at a time",
    "A board card has a color tag, either Blue or Yellow, and a location tag, either Inbox or Archive. One recorded action changes exactly one of these two tags. The card now has the combined status Blue–Inbox.",
    "Which new status cannot be reached from Blue–Inbox in one recorded action?",
    ["Yellow–Inbox", "Yellow–Archive", "Blue–Archive"],
    1,
    ["Moving to Yellow–Inbox changes only the color from Blue to Yellow. One action can make this change.", "Moving to Yellow–Archive changes both the color and the location. It needs at least two actions, so it cannot happen in one.", "Moving to Blue–Archive changes only the location from Inbox to Archive. One action can make this change."],
    "A direct transition represents one allowed event. If two parts of a state must change separately, there is no direct one-step transition between them.");

  add("14",
    "timing",
    "A sequence does not show speed",
    "Two system logs show the same four statuses in the same order: On, Off, On, Off. However, all timestamps and all time lengths have been removed. One full log could cover seconds, while the other could cover hours.",
    "What can you decide about which system changes status faster?",
    ["System 1 changes faster", "The two systems change at the same speed", "The status order alone cannot show which system changes faster"],
    2,
    ["Being first in the question gives no information about speed. The first log could cover either a short or a long time.", "The matching order shows the same sequence, but it does not show equal time lengths. The systems may change at different speeds.", "This is correct because a speed comparison needs timestamps or durations. The order On, Off, On, Off gives neither."],
    "A list of states shows the order of changes. When changes may happen at any instant, we also need to know how long the system stays in each state.",
    true);

  addChallenge("01",
    "and-or-regions",
    "What happens when two convex regions are combined?",
    "Each of two regions has the following property: the full straight segment between any two points in the region stays inside that region. The two regions overlap. Compare their intersection, which contains points allowed by both regions, with their union, which contains points allowed by either region.",
    "Which statement about this straight-segment property must be true?",
    ["Both the intersection and the union always have the property", "The intersection has the property, but the union may not have it", "Neither the intersection nor the union can have the property"],
    1,
    ["The union does not always have the property. For example, the union of two overlapping disks can contain two points whose joining segment leaves both disks.", "Two points in the intersection belong to both original regions, so their full segment belongs to both. In the union, the two endpoints can come from different regions, and the segment may leave the union.", "The intersection must have the property because both original regions contain the full segment. Therefore, saying that neither can have it is false."],
    "A region with this straight-segment property is convex. Intersections of convex sets are convex, but unions of convex sets do not have to be convex.");

  addChallenge("01",
    "both-shape-rules",
    "Can a straight-line function satisfy two shape rules?",
    "Rule L says that a function's output at any weighted blend of two inputs is at most the same weighted blend of the two endpoint outputs. Rule U says that it is at least that output blend. The weight λ can be any number from 0 to 1. For λ = 0.25, use 25% of the first input and output and 75% of the second input and output. A tariff for q ≥ 0 is T(q) = 5 + 3q.",
    "Which rule does this tariff satisfy for every pair of inputs and every blend between them?",
    ["Both L and U, because the tariff value is exactly equal to the blend of the endpoint values", "Only L, because the tariff increases as quantity increases", "Neither rule, because the tariff graph is not curved"],
    0,
    ["For inputs x and y, T(λx + (1−λ)y) = 5 + 3[λx + (1−λ)y] = λ(5+3x) + (1−λ)(5+3y). Equality satisfies both the “at most” and “at least” rules.", "An increasing function does not have to satisfy Rule L. Increase describes the slope, while Rule L compares the graph with straight lines between points.", "The rules allow equality, so the graph does not need to bend. A straight-line function can satisfy both rules."],
    "An affine function, meaning a straight-line function such as 5 + 3q, is both convex and concave because equality holds in both shape rules. The strict versions require a real bend between different points, so this function satisfies neither strict version.");

  addChallenge("01",
    "hidden-direction",
    "Can two upward slices hide a downward direction?",
    "A surface has height h(x,y) = x² + y² − 4xy. Along the x-axis, where y = 0, its height is x². Along the y-axis, where x = 0, its height is y². Both axis slices look like upward bowls, so someone says the whole surface is bowl-shaped.",
    "What happens along the diagonal x = y = t?",
    ["It is another upward bowl because h(t,t) = 2t²", "It is a flat line because h(t,t) = 0", "It is a downward bowl because h(t,t) = −2t², so the conclusion is false"],
    2,
    ["This calculation leaves out the interaction term −4xy. On the diagonal, that term becomes −4t².", "The two square terms add to 2t², but the interaction term is −4t². Their total is not zero except at t = 0.", "Substitution gives h(t,t) = t² + t² − 4t² = −2t². This direction bends downward, so the two axis slices do not describe the full surface."],
    "For a function of several variables, convexity must hold in every direction. Interaction terms matter, so we check the full Hessian matrix of second derivatives rather than only its diagonal entries.");

  addChallenge("02",
    "local-quadratic-step",
    "Use a local curve to choose the next trial",
    "The current setting is x = 3. For a change of size t, a local model predicts the new score as 10 + 6t − t² = 19 − (t − 3)². This model is only an approximation near the current setting, so it may not describe the true score everywhere.",
    "What action does the local model support?",
    ["Keep x = 3 because the best change is t = 0", "Try x = 6 and then check the true objective; the model does not guarantee a global optimum", "Accept x = 6 as the guaranteed global optimum of the true objective"],
    1,
    ["The model 19 − (t − 3)² is largest at t = 3, not at t = 0. Therefore, it does not suggest keeping x = 3.", "The model's best change is t = 3, so the proposed next setting is x + t = 3 + 3 = 6. The true objective must still be checked.", "A local approximation may become inaccurate away from the current setting. It cannot guarantee that x = 6 is the true global optimum."],
    "Newton's method uses a local quadratic model to propose a step. The proposed step must be checked because a local model does not give a global guarantee.");

  addChallenge("02",
    "no-last-setting",
    "Can there be a best setting when there is always a better one?",
    "A game allows every positive whole-number setting: 1, 2, 3, and so on. There is no largest allowed setting. Moving from any setting to the next whole number always adds two points and changes nothing else.",
    "What can you conclude about the highest-scoring setting?",
    ["Setting 1 is best because it is the first allowed setting", "A best finite setting exists, but more tests are needed to find it", "There is no highest-scoring setting because every setting has a better next setting"],
    2,
    ["Every setting after 1 has a higher score than setting 1. Being the first allowed setting does not make it best.", "No finite setting can be best because adding 1 to it gives two more points. More tests cannot change this stated rule.", "For any proposed setting n, the next allowed setting n + 1 scores two points more. Therefore, no allowed setting has the highest score."],
    "Before searching for an optimum, check whether the feasible set can contain one. An improving sequence with no last choice may never reach a best solution.");

  addChallenge("02",
    "complete-candidates",
    "Include every type of candidate for the maximum",
    "A continuous score has no jumps on the closed interval [0,8], which includes both endpoints. A maximum can occur at an endpoint, at an interior point with slope zero, or at an interior point where the slope is undefined. The only zero-slope point is 2, and the only undefined-slope point is 5.",
    "Which complete set of candidate points should you compare?",
    ["0, 2, 5, and 8", "2 only", "2 and 5 only"],
    0,
    ["This set includes both endpoints, 0 and 8, and both special interior points, 2 and 5. It covers every stated type of candidate.", "A point with slope zero is only one possible type of maximum. An endpoint or a point with undefined slope could have a higher score.", "These are all the special interior points, but the maximum could still occur at endpoint 0 or endpoint 8."],
    "In one-variable nonlinear optimization, points with zero slope are only part of the search. We must also check endpoints and points where the derivative does not exist.");

  addChallenge("03",
    "isolate-light",
    "Change only light to study its effect",
    "Greenhouse X gives one seed variety more light and more water than Greenhouse Y. Plants in Greenhouse X grow taller. A manager wants to know whether the extra light caused some of this additional growth.",
    "Which new comparison studies the effect of light most directly?",
    ["Give the same seed variety both more light and more water again", "Grow different seed varieties with the same light and water levels", "Use the same seed variety and water level, but use different light levels"],
    2,
    ["Changing both light and water again mixes their effects. The manager still cannot tell which change caused the extra growth.", "This comparison changes seed variety instead of light. It studies the effect of variety, not the effect of light.", "Keeping seed variety and water fixed leaves light as the main difference. This comparison isolates the effect of light most directly."],
    "When several factors change together, their effects can be difficult to separate. Hold other possible causes fixed when studying one factor.");

  addChallenge("03",
    "flat-but-saddle",
    "Zero first derivatives do not classify the point",
    "Consider h(x,y) = x⁴ − y⁴. At the origin (0,0), both first partial derivatives are zero and the height is 0. To study points as close to the origin as we want, let ε be any positive number, however small.",
    "What do the nearby points (ε,0) and (0,ε) show about the origin?",
    ["The origin is a local minimum because all first derivatives are zero", "There are higher and lower points arbitrarily close to the origin, so it is neither a local minimum nor a local maximum", "The origin is a local maximum because one nearby value is negative"],
    1,
    ["At (0,ε), the height is −ε⁴, which is below 0. But zero first derivatives alone do not prove a local minimum.", "The height at (ε,0) is ε⁴ > 0, while the height at (0,ε) is −ε⁴ < 0. Higher and lower values exist arbitrarily close to the origin.", "At (ε,0), the height is positive, so a nearby point is higher than the origin. One negative nearby value does not prove a local maximum."],
    "A point with zero first derivatives is only a candidate. Here the Hessian at the origin is also zero, so nearby values are needed to identify the saddle point.");

  addChallenge("03",
    "direction-and-distance",
    "Choose a step and update both coordinates",
    "A search begins at point (1,1) and moves in direction (2,−1). It multiplies this direction by a step parameter t ≥ 0, so the trial point is (1+2t,1−t). Along this line, the exact score is 18 − 2(t−2)².",
    "Which point is reached by the step parameter that gives the highest score on this line?",
    ["(5,−1)", "(2,−1)", "(3,0)"],
    0,
    ["The score is largest when (t−2)² = 0, so t = 2. The trial point is (1+2·2,1−2) = (5,−1).", "This is the direction vector, not the new point. The new point must include the starting point and the selected step parameter.", "This point uses t = 1. Its score is 18 − 2(1−2)² = 16, which is lower than the maximum score 18 at t = 2."],
    "A gradient search chooses a direction and then uses a one-variable line search to choose the step parameter. The full point is updated only after both choices are known.");

  addChallenge("04",
    "current-bottleneck",
    "Identify the resource that limits more trips",
    "Each rescue trip needs one driver and two volunteers. A center has four drivers and six volunteers. A donor can give the center either one additional driver or two additional volunteers. The center wants to run as many rescue trips as possible at the same time.",
    "Which donation can increase the number of trips that run at the same time?",
    ["Two additional volunteers", "One additional driver", "Neither donation"],
    0,
    ["Six volunteers support three trips, but eight volunteers support four trips. Four drivers are already available, so this donation raises the limit from three trips to four.", "Five drivers could support five trips, but six volunteers can support only three trips. The extra driver does not increase the current limit.", "The volunteer donation does increase the limit from three trips to four. Therefore, it is incorrect to say that neither donation helps."],
    "When several resources limit an activity, find the current bottleneck. Adding a resource helps only if it increases the smallest active limit.");

  addChallenge("04",
    "necessary-not-sufficient",
    "Passing required tests may still not be enough",
    "An audit shows that every prize-winning design has two properties: it is symmetric, and it uses at most 20 parts. Design X is symmetric and uses 18 parts. These properties are necessary for winning, which means that every winner must have them.",
    "What can you conclude about Design X from the audit?",
    ["Design X will definitely win", "Design X may win or may not win because it only passes two necessary tests", "Design X will definitely lose"],
    1,
    ["The audit says that every winner has these properties. It does not say that every design with these properties wins.", "Design X passes two tests that every winner must pass, but other requirements may exist. The given information does not decide whether X wins.", "Design X has both stated properties, so the audit does not prove that it loses. It may satisfy any other requirements as well."],
    "Necessary conditions are rules that every good solution must satisfy. Passing all known necessary conditions does not always prove that a solution is good.");

  addChallenge("04",
    "redundant-rule",
    "Find the rule that adds no extra restriction",
    "A venue has two separate attendance rules. The fire code allows at most 80 people, while the staffing plan allows at most 100 people. All other requirements will stay unchanged if one of these two rules is removed.",
    "Which single rule can be removed without changing the allowed attendance levels?",
    ["Remove the fire-code rule", "Remove both rules", "Remove the staffing rule"],
    2,
    ["Without the fire-code rule, attendance levels from 81 through 100 become allowed. Removing it changes the allowed set.", "Without both rules, attendance above 80 becomes allowed. This clearly changes the allowed set.", "The fire-code rule already limits attendance to 80 or fewer people. Every such attendance level also follows the staffing limit of 100, so the staffing rule adds no restriction."],
    "A redundant constraint is a rule that adds no restriction because other rules already imply it. Removing it does not change the feasible set, which is the set of all allowed choices.");

  addChallenge("05",
    "hidden-lift",
    "Measure the extra effect of using both changes",
    "A shop normally averages 100 visitors. With only a poster, the average is 112 visitors. With only background music, it is 109 visitors. With both changes, it is 130 visitors.",
    "Which comparison correctly measures the extra effect of using both changes together?",
    ["Adding the two separate increases gives 121, so using both adds 9 more visitors", "Adding the two separate increases gives 130, so there is no extra effect", "Adding the two separate increases gives 121, so using both loses 9 visitors"],
    0,
    ["The separate increases are 112 - 100 = 12 and 109 - 100 = 9. Adding these increases to 100 gives 121, and 130 - 121 = 9 extra visitors.", "The value 130 is the result when both changes are used. Adding the two separate increases gives 100 + 12 + 9 = 121, not 130.", "The result with both changes is 130, which is 9 above 121. It does not lose 9 visitors."],
    "Two choices used together can create an extra effect that tests of each choice alone do not show.");

  addChallenge("05",
    "halfway-plan",
    "Mix equal parts of two allowed plans",
    "Plan R uses 8 hours of printer time and 2 hours of cutter time. Plan S uses 2 printer hours and 8 cutter hours. Each resource has a limit of 8 hours. The work can be divided, so you can make a plan using half of R and half of S.",
    "What must be true about the plan that mixes half of R with half of S?",
    ["It uses 10 hours of each resource", "It uses 5 hours of each resource and respects both limits", "Its quality score must exceed both original plans"],
    1,
    ["This adds all of R to all of S. A half-and-half mix uses only half of each plan's resource amounts.", "For both resources, the mixed use is (8 + 2) / 2 = 5 hours. Five hours is below each 8-hour limit.", "The problem gives information about resource use but gives no rule for quality. Therefore, no claim about the quality score is guaranteed."],
    "When allowed plans can be mixed, average their resource use and check whether each limit is still satisfied.");

  addChallenge("05",
    "coupled-quadratic-choice",
    "Balance a reward against a squared penalty",
    "Choose x and y from any real numbers, including decimals, that are zero or positive and satisfy x + y = 6. The score is 8x - (x - y)². The term 8x is a reward, while (x - y)² is a penalty for unequal values. After replacing y with 6 - x, the score becomes 28 - 4(x - 4)².",
    "Which choice gives the highest score over all allowed values of x and y?",
    ["x=3, y=3: make the two values equal", "x=6, y=0: put all 6 units into x", "x=4, y=2: allow a difference of 2 to gain more reward from x"],
    2,
    ["At x = 3 and y = 3, the score is 8(3) - 0² = 24. Making the values equal gives up too much reward from x.", "At x = 6 and y = 0, the score is 8(6) - 6² = 12. The large difference between x and y creates a large penalty.", "The squared term cannot be negative, so 28 - 4(x - 4)² is at most 28. It reaches 28 when x = 4 and y = 2."],
    "Quadratic programming combines linear rewards and squared effects with constraints. Evaluate the full score because improving only one part may make another part worse.");

  addChallenge("07",
    "small-now-big-later",
    "Include later rewards in the first choice",
    "You choose a door and then choose between the continuations available behind it. The Silver door gives 8 points and ends the game. Bronze gives 5 points, followed by a choice of either 2 points now and 4 later, or 6 points now and no later reward. Wooden gives 3 points, followed by a choice of either 7 points now and 3 later, or 9 points now and no later reward.",
    "Which first door can lead to the highest final score?",
    ["Silver", "Bronze", "Wooden"],
    2,
    ["Silver ends the game with 8 points. There is no later reward to add.", "Bronze can give 5 + 2 + 4 = 11 or 5 + 6 = 11 points. Its highest final score is 11.", "Wooden can give 3 + 7 + 3 = 13 or 3 + 9 = 12 points. Its highest possible final score is 13."],
    "Compare each reward now together with the best sequence of rewards that can follow it.");

  addChallenge("07",
    "duplicate-stage-cost",
    "Count one dispatch fee only once",
    "A delivery contract charges one dispatch fee of 4 credits for starting each trip. A draft calculation adds 4 credits when the van leaves and another 4 credits when it reaches the first stop. Both charges refer to the same trip starting.",
    "How should the draft calculation be corrected?",
    ["Keep both charges because two stages are listed", "Remove one of the two charges so the dispatch fee is counted once", "Remove both charges because the fee is not a travel time"],
    1,
    ["Writing the same result in two stages does not make it happen twice. The contract charges only one fee per trip.", "The total needs one 4-credit dispatch fee. Putting that fee in exactly one stage prevents counting it twice.", "The fee is still part of the total cost even though it is not a travel time. One charge must remain."],
    "When you build a total one stage at a time, place each cost or reward in exactly one stage.");

  addChallenge("07",
    "unknown-final-value",
    "Use the final value to judge the first choice",
    "At the first desk, you can exchange a gold token for 8 points. You can instead keep the token and receive 3 points now. At the final desk, a kept token will be worth either 0 or 7 points, but the rule sheet does not say which value applies.",
    "Is there enough information to find the better choice at the first desk?",
    ["No; the missing final value can reverse the choice", "Yes, always exchange the token", "Yes, always keep the token"],
    0,
    ["If the final value is 0, exchanging gives 8 points while keeping gives 3. If it is 7, keeping gives 3 + 7 = 10 points, which is more than 8.", "Exchanging is better when the final token value is 0, but worse when it is 7. It is not always the better choice.", "Keeping is better when the final token value is 7, but worse when it is 0. It is not always the better choice."],
    "The value left at the end of a process can change which action is best much earlier.");

  addChallenge("08",
    "setup-storage",
    "Balance oven starts and overnight storage",
    "A bakery needs 2 trays on Monday, 2 on Tuesday, and 2 on Wednesday. Starting the ovens on any day costs 6 credits, and storing one tray for one night costs 1 credit. The cost to produce each tray is always the same, there is no production limit, and a tray can be used on its production day or stored for a later day.",
    "Which listed production schedule has the lowest total cost for oven starts and overnight storage?",
    ["Make two trays each day", "Make all six on Monday", "Make four on Monday and two on Wednesday"],
    1,
    ["Starting the ovens on three days costs 3 × 6 = 18 credits. No trays are stored, so the total is 18.", "One oven start costs 6 credits. Two trays are stored for one night and two for two nights, so storage costs 2 + 4 = 6 and the total is 12.", "Two oven starts cost 12 credits. Two Monday trays are stored for Tuesday, adding 2 credits, so the total is 14."],
    "In a lot-sizing problem, you choose production times by balancing setup costs against the cost of storing inventory between time periods.");

  addChallenge("08",
    "all-sites-pass",
    "Place two kits when every site must pass",
    "A project succeeds only when three independent sites all pass. Therefore, multiply the three pass probabilities to find the project's success probability. Without a kit, the probabilities are A: 0.90, B: 0.60, and C: 0.40. A kit changes its site's probability to A: 0.95, B: 0.80, or C: 0.70, and the two kits must go to different sites.",
    "Which two sites should receive the kits to give the highest project success probability?",
    ["A and B", "A and C", "B and C"],
    2,
    ["Giving kits to A and B gives 0.95 × 0.80 × 0.40 = 0.304. Site C remains at 0.40.", "Giving kits to A and C gives 0.95 × 0.60 × 0.70 = 0.399. Site B remains at 0.60.", "Giving kits to B and C gives 0.90 × 0.80 × 0.70 = 0.504. This is the highest of the three project success probabilities."],
    "When a result is not found by adding separate benefits, compare each complete resource allocation using the correct full calculation.");

  addChallenge("08",
    "same-completions",
    "Find histories with the same task left",
    "A five-letter badge must contain exactly two vowels. The vowels are A, E, I, O, and U. There are no other rules about its letters. After three letters, the partly completed badges are CAT, DOG, and EEL.",
    "Which two partly completed badges allow exactly the same kinds of valid two-letter endings?",
    ["CAT and DOG", "CAT and EEL", "DOG and EEL"],
    0,
    ["CAT and DOG each already have one vowel. Therefore, each valid two-letter ending must have one vowel and one non-vowel letter.", "CAT needs exactly one more vowel in its ending. EEL already has two vowels, so both remaining letters must be non-vowels.", "DOG needs exactly one more vowel in its ending. EEL already has two vowels, so both remaining letters must be non-vowels."],
    "Different histories are equivalent for future decisions when they leave exactly the same requirement to complete.");

  addChallenge("09",
    "expected-continuation",
    "Add today's cost to the possible future costs",
    "You must choose before learning the future cost. Choice A costs 2 credits now, then 2 more with probability 3/4 or 10 more with probability 1/4. Choice B costs 4 credits now, then 1 or 5 more with equal probability.",
    "Which choice has the lower average total cost over many repeated trials?",
    ["Choice A", "Choice B", "They have the same average total cost"],
    0,
    ["Choice A's average total is 2 + (3/4) × 2 + (1/4) × 10 = 6 credits. This is lower than Choice B's average.", "Choice B's average total is 4 + (1/2) × 1 + (1/2) × 5 = 7 credits. This is higher than Choice A's average.", "The average totals are 6 credits for A and 7 credits for B. They differ by 1 credit."],
    "In dynamic programming with uncertain outcomes, compare each current action together with its probability-weighted future costs.");

  addChallenge("09",
    "stop-or-wait",
    "Decide whether to leave or wait again",
    "A desk closes in two minutes, and leaving gives 0 points. Each minute you choose to wait costs 1 point. At the end of that minute, you are served with probability 1/2, earn 6 points, and the game ends. If you are not served and one minute remains, you may choose again under the same conditions, but you receive no further points if the desk closes before service.",
    "Net points are points earned minus waiting costs. Which plan gives the highest average net points?",
    ["Leave immediately", "Wait now and, if needed, wait through the final minute", "Wait once, then leave if not served"],
    1,
    ["Leaving immediately gives 0 points. Both plans that include waiting have a positive average value.", "With one minute left, waiting is worth -1 + (1/2) × 6 = 2 points on average. From the start, waiting again if needed is worth -1 + (1/2) × 6 + (1/2) × 2 = 3.", "With only one attempt, the average is -1 + (1/2) × 6 = 2 points. This is less than the two-attempt plan's average of 3."],
    "In a stopping problem, work backward and compare stopping now with the cost, possible reward, and best later choice from waiting.");

  addChallenge("09",
    "discard-without-chances",
    "Remove a slower plan without knowing the weather chances",
    "The completion times under Calm, Windy, and Storm weather are as follows. Plan A takes 6, 8, and 11 minutes; Plan B takes 7, 10, and 13 minutes; and Plan C takes 5, 9, and 15 minutes. The weather probabilities are unknown, and shorter times are preferred.",
    "Which plan can be removed even though the weather probabilities are not known?",
    ["Plan A", "Plan C", "Plan B"],
    2,
    ["Plan A is faster than B in every weather condition, but it is not always faster than C. Without the weather probabilities, A cannot be removed.", "Plan C is fastest in Calm weather, although it is slower in the other conditions. Its average could be best for some weather probabilities.", "Plan B is slower than Plan A in Calm, Windy, and Storm weather. Therefore, no set of weather probabilities can give B a lower average time than A."],
    "You can remove a choice before probabilities are known when another choice gives a better result in every possible outcome.");

  addChallenge("10",
    "starting-mix",
    "The usual route mix is missing",
    "A city has North and South bus routes. On a typical trip, 9 out of 10 North buses are late, while 1 out of 10 South buses are late. You observe a late bus. However, you do not know how common North trips and South trips usually are.",
    "What can you conclude about which route the late bus probably came from?",
    ["It probably came from the North route", "It probably came from the South route", "The routes cannot be compared without their usual shares of all trips"],
    2,
    ["North has the higher late rate, but North trips may be much less common. The late rate alone does not show which route produces more late buses.", "South buses may be more common, but their usual share was not given. We cannot use this possibility as a conclusion.", "This is correct because we need both each route's late rate and its usual share of trips. Without the starting mix, either route could produce more late buses."],
    "When you work backward from an observation, use both the rate within each source and how common each source is. The source frequencies are often called prior probabilities.");

  addChallenge("10",
    "two-days",
    "Count failure today and tomorrow",
    "A device has a 20% chance of failing today. If it survives today, it reaches tomorrow and then has a 10% chance of failing tomorrow. A failure ends the process, so a device that fails today cannot fail again tomorrow.",
    "What is the chance that the device has failed by the end of tomorrow?",
    ["The chance is 28%", "The chance is 30%", "The chance is 2%"],
    0,
    ["Failure today contributes 20%. Survival today followed by failure tomorrow contributes 80% × 10% = 8%, so the total is 20% + 8% = 28%.", "Adding 20% + 10% = 30% treats every device as if it reaches tomorrow. Only the 80% that survive today can fail tomorrow.", "The calculation 20% × 10% = 2% uses failure today instead of survival today for the second path. It also leaves out the 20% that fail today."],
    "A later chance may apply only after an earlier event. Count each separate path to failure and use the chance of reaching the later path.");

  addChallenge("10",
    "three-voters",
    "Find the chance of a correct majority",
    "Three voters choose between two proposals. Each voter selects the better proposal with probability 0.6. Their choices are independent, meaning that one voter's result does not change the chances for the others. The majority is correct when exactly two voters or all three voters choose the better proposal.",
    "What is the probability that the majority chooses the better proposal?",
    ["The probability is 0.600", "The probability is 0.648", "The probability is 0.360"],
    1,
    ["The majority result is not the same as one voter's 0.600 chance. Several different groups of two correct voters can give a correct majority.", "Exactly two correct votes have probability 3 × 0.6² × 0.4 = 0.432, and three correct votes have probability 0.6³ = 0.216. Their total is 0.648.", "The value 0.360 counts only one particular pair of correct voters. It misses the other groups of two correct voters and the case in which all three are correct."],
    "When a result can happen in several separate ways, calculate every way and add their probabilities. Independence lets us multiply the voter probabilities within each way.");

  addChallenge("11",
    "visit-versus-occupy",
    "Visiting T and ending at T are different",
    "A token begins at A. On its first move, it goes to T or B with equal probability. On its second move, it again goes to T or B with equal probability, whether it is currently at T or B. You observe the first two moves.",
    "How does visiting T within two moves compare with being at T after the second move?",
    ["The visit chance is 3/4, and the chance of being at T after two moves is 1/2", "The two chances are both 1/2", "The chance of being at T after two moves is 3/4, and the visit chance is 1/2"],
    0,
    ["The token visits T on the first move with chance 1/2, or first goes to B and then T with chance 1/2 × 1/2 = 1/4. Thus the visit chance is 3/4, while half of all paths end at T.", "The final-position chance is 1/2, but the visit chance is 1/2 + 1/4 = 3/4. This choice misses a visit followed by a move away from T.", "This choice exchanges the two probabilities. Ending at T concerns only the second position, while visiting T also includes tokens that reached T earlier."],
    "A system can visit a state and then leave it before the observation time. Therefore, 'visited by time 2' and 'in the state at time 2' are different events.");

  addChallenge("11",
    "map-claim",
    "A possible path does not promise arrival",
    "A visitor always moves from Entrance to Atrium. At Atrium, the visitor may return to Entrance or continue to Gallery. After reaching Gallery, the visitor stays there. The map gives no probabilities or other rule for choosing between the two moves from Atrium.",
    "Does this map prove that every visitor who starts at Entrance will finally reach Gallery?",
    ["Yes, because there is an allowed path to Gallery", "No, because a visitor may keep returning from Atrium to Entrance", "No, because a visitor cannot leave Gallery after reaching it"],
    1,
    ["An allowed path shows that Gallery can be reached. It does not prove that every visitor follows that path.", "The rules allow the visitor to repeat Entrance to Atrium to Entrance without limit. Therefore, the map alone does not guarantee arrival at Gallery.", "Staying in Gallery makes it an absorbing state, which means that it cannot be left. This rule does not stop a visitor from reaching it."],
    "A map shows which moves are possible. To decide whether arrival is certain or likely, we may also need probabilities or a rule for choosing moves.");

  addChallenge("11",
    "two-step-paths",
    "Combine both two-step routes to D",
    "A token begins at A. Its first move goes to B or C with equal probability. From B, its second move always goes to D. From C, its second move goes to D or returns to A, again with equal probability.",
    "What is the probability that the token is at D after exactly two moves?",
    ["The probability is one half", "The probability is one quarter", "The probability is three quarters"],
    2,
    ["The route A to B to D has probability 1/2 × 1 = 1/2. This choice leaves out the route through C.", "The route A to C to D has probability 1/2 × 1/2 = 1/4. This choice leaves out the certain move from B to D.", "The two routes to D have probabilities 1/2 and 1/4. They are separate paths, so their total is 1/2 + 1/4 = 3/4."],
    "To find a state probability after several moves, list every separate path that reaches the state. Multiply probabilities along each path, then add across the paths.");

  addChallenge("13",
    "closed-regions",
    "The starting loop controls the result",
    "A robot moves forever on either the Red loop or the Blue loop. The loops are disconnected, so the robot can never move from one loop to the other. You do not know which loop contains the robot at the start.",
    "Can you determine the robot's long-run fraction of time on the Red loop?",
    ["Yes. It must be one half because there are two loops", "Yes. It must move toward zero as time passes", "No. It is 1 from a Red start and 0 from a Blue start"],
    2,
    ["Having two loops does not make the robot divide its time between them. There is no path from one loop to the other.", "Time passing cannot move the robot across a missing connection. A robot that starts on Red stays on Red.", "Each loop is closed, meaning that the robot cannot leave it. Therefore, the Red time share is 1 after a Red start and 0 after a Blue start."],
    "A closed group of states has no route leading out of the group. When several closed groups exist, the long-run result can depend on the starting state.");

  addChallenge("13",
    "eventual-win",
    "Include wins after every replay",
    "In each round of a game, you win with probability 1/4, lose with probability 1/2, or replay with probability 1/4. A replay returns you to the same situation, with the same three probabilities. A win or a loss ends the game permanently.",
    "What is the probability that you eventually win after any possible number of replays?",
    ["The probability is 1/3", "The probability is 1/4", "The probability is 1/2"],
    0,
    ["Let p be the chance of eventually winning. After a replay, you return to the starting situation, so the remaining win chance is also p. Therefore, p = 1/4 + (1/4)p, which gives p = 1/3.", "The value 1/4 counts only a win in the first round. It leaves out wins that happen after one or more replays.", "Winning and losing are not equally likely in a round that ends the game. Losing has probability 1/2, which is twice the win probability of 1/4."],
    "An absorbing outcome ends the process and cannot be left. To find the chance of absorption in a win, include every path that reaches a win after zero or more returns to the temporary state.");

  addChallenge("13",
    "stable-population",
    "A fixed group mix with moving members",
    "A large group of signs starts with half of the signs Green and half Purple. At each beep, every Green sign changes to Purple and every Purple sign changes to Green. All signs change at the same time, and this rule continues forever.",
    "Which statement correctly describes the signs over time?",
    ["Each sign finally stops changing and stays one color", "The group stays half Green and half Purple, although every sign changes at each beep", "All signs finally show the same color"],
    1,
    ["Each sign changes at every beep, so no individual sign settles on one color. It continues to alternate forever.", "The two equal groups exchange colors at every beep. Therefore, the total group remains half Green and half Purple.", "The Green half and Purple half switch places but remain two equal groups. They never all have the same color."],
    "A stable population mix means that the shares in each state stay the same. Individual members can still move between those states at every step.");

  addChallenge("14",
    "duration-weighting",
    "A random check is more likely during a long stay",
    "A system follows the same ten-minute cycle forever. It stays in Flash for 1 minute and then in Rest for 9 minutes. A long recording contains many complete cycles. You choose one moment from that recording so that every moment is equally likely.",
    "Which state are you more likely to see at the random check time?",
    ["Both are equally likely because each appears once per cycle", "Rest, because it fills 9/10 of each cycle", "Flash, because it comes first in each cycle"],
    1,
    ["Counting one visit to each state ignores the different visit lengths. Flash lasts 1 minute, while Rest lasts 9 minutes.", "Rest takes 9 of the 10 minutes in every cycle. A random time therefore falls in Rest with probability 9/10.", "Coming first does not make Flash last longer. Flash fills only 1/10 of the cycle."],
    "For a random observation time, longer stays receive more weight. Time shares depend on duration, not only on how often a state is entered.");

  addChallenge("14",
    "age-effect",
    "The average does not reveal the effect of age",
    "At a help desk, a ticket is a request for help. The help desk says that tickets stay open for 20 minutes on average. It gives no other details about closing times, including whether the chance of closing in the next minute changes as a ticket becomes older.",
    "What comparison between an old ticket and a new ticket follows from the 20-minute average?",
    ["An old ticket must have a higher chance of closing in the next minute", "An old ticket and a new ticket must have the same chance of closing in the next minute", "The average alone supports neither comparison"],
    2,
    ["Some closing-time patterns make older tickets more likely to close soon, but the 20-minute average does not require such a pattern.", "A property called memorylessness would make the next-minute chance the same at every age. An average of 20 minutes does not tell us that this property holds.", "This is correct because different closing-time patterns can all have a 20-minute average. Those patterns can give different next-minute chances at different ages."],
    "Elapsed time may change what happens next. Check the full duration rule before assuming that age matters or that it does not matter.");

  addChallenge("14",
    "competing-means",
    "Two average times do not fix the first result",
    "A customer issue ends when either a self-service guide works or a staff member responds. If each method were considered alone, its average finishing time would be 60 minutes. You do not know how often each possible finishing time occurs or whether the two methods affect each other.",
    "Can you find the average time until either method solves the issue, whichever finishes first?",
    ["No. The two 60-minute averages are not enough", "Yes. It is exactly 30 minutes", "Yes. It is exactly 60 minutes"],
    0,
    ["The time to the first finish depends on both full timing patterns and how the methods are related. Their separate 60-minute averages do not determine it.", "A 30-minute result needs extra assumptions about the timing patterns and how the methods are related. Those assumptions were not given.", "A second possible way to finish can shorten the wait, but the amount is not fixed. The separate 60-minute averages do not prove a 60-minute result."],
    "When several finishing times compete, the first finish depends on more than their separate averages. We need their time patterns and information about whether the times are related.");

  const weeks=[...new Set(questions.map(q=>q.week))];
  return {questions,weeks,get:id=>questions.find(q=>q.id===id),
    forWeek:week=>questions.filter(q=>q.week===week).sort((a,b)=>Number(a.challenge)-Number(b.challenge) || Number(a.stretch)-Number(b.stretch))};
})();
