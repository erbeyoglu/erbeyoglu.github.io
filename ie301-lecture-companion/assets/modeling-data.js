/* Authored checkpoints. beforeSlide refers to the shared lecture PDF, not
   the animated page number. The deck builder inserts a separate poll view. */
window.MODELING = (() => {
  const questions = [];
  function add(week, key, widget, beforeSlide, title, context, prompt, options, answer, explanations, optional = false) {
    questions.push({id: `w${week}-${key}`, week: `week${week}`, widget, beforeSlide,
      title, context, prompt, options, answer, explanations, optional});
  }
  add('01','variables','regression',9,'Decisions or data?',
    'A fixed data set contains measured pairs (xᵢ, yᵢ). Fit the line ŷ = ax + b.',
    'Which quantities does the fitting model choose?',
    ['The measured xᵢ and yᵢ','The slope a and intercept b','Every fitted point independently'],1,
    ['The observations are given data; changing them changes the problem.','a and b determine every fitted value. They are the two decisions.','Fitted values are linked by the same line; they are not independent decisions.']);
  add('01','surface','box',10,'Turn material into a constraint',
    'A closed rectangular box has positive dimensions x, y, z. At most A units of cardboard area are available.',
    'Which constraint accounts for all six faces?',
    ['xyz ≤ A','xy + xz + yz ≤ A','2(xy + xz + yz) ≤ A'],2,
    ['xyz is volume, not cardboard area. Its units also do not match A.','This counts one face of each size; a closed box has two of each.','The three pairs of faces use total area 2(xy+xz+yz).']);
  add('01','residuals','regression',9,'What should the objective punish?',
    'Two fitting errors are +5 and −5. We want to penalize errors without positive and negative errors cancelling.',
    'Which proposed objective does that?',
    ['Minimize the signed sum of errors','Minimize the sum of squared errors','Maximize the signed sum of errors'],1,
    ['These two large errors sum to zero: this loss conceals them.','The squared errors add to 50. Absolute-error loss is another valid choice, but is not among these options.','This rewards a direction of error rather than an accurate fit.'],true);
  add('02','distance','warehouse',8,'What does annual distance mean?',
    'Customer i is at (xᵢ,yᵢ) and receives wᵢ shipments per year. The warehouse location (x,y) is chosen. Assume straight-line travel.',
    'Which objective measures total annual shipment distance?',
    ['Σᵢ √((x−xᵢ)²+(y−yᵢ)²)','Σᵢ wᵢ((x−xᵢ)²+(y−yᵢ)²)','Σᵢ wᵢ√((x−xᵢ)²+(y−yᵢ)²)'],2,
    ['This gives a customer with one shipment the same weight as a customer with 300.','This uses squared distance. It is a different objective with different units.','Each distance is counted once per shipment; summing gives distance per year.']);
  add('02','height','tank',10,'Radius is not diameter',
    'A cylindrical tank has radius r and height h. Its height may not exceed twice its diameter.',
    'Which inequality expresses this requirement?',
    ['h ≤ 2r','h ≤ 4r','h ≥ 4r'],1,
    ['The diameter is 2r, so twice the diameter is 4r.','Twice the diameter is 2(2r)=4r; “may not exceed” means ≤.','This reverses the upper limit into a lower limit.']);
  add('02','profit','monopolist',35,'Build the profit',
    'Producing x units costs $5 per unit. Every unit sells at price 10−x.',
    'Which expression is total profit?',
    ['(10−x)−5x','x(10−x)−5x','x(10−x)'],1,
    ['10−x is the price of one unit, not total revenue.','Revenue is quantity times price; subtract the total production cost.','This is revenue. Production cost is still missing.'],true);
  add('03','volume','openbox',12,'Eliminate a variable',
    'An open-top box must hold exactly 10 m³: xyz=10, with x,y,z>0.',
    'How can z be eliminated without changing the volume requirement?',
    ['z=10/(xy), with x,y>0','z=10−x−y, with x,y≥0','z=10xy, with x,y>0'],0,
    ['Dividing the volume equality by xy gives z=10/(xy); positivity keeps the division valid.','Volumes multiply dimensions; this additive relation has the wrong units.','Multiplication does not solve xyz=10 for z.']);
  add('03','area','openbox',12,'Keep the geometry after substitution',
    'The same open-top box has z=10/(xy). Its material area is xy+2xz+2yz.',
    'Which objective remains in x and y?',
    ['2xy+20/x+20/y','xy+10/x+10/y','xy+20/x+20/y'],2,
    ['The extra xy adds a lid, which the box does not have.','Each type of side has two faces. This loses half the side area.','The base is xy; the two pairs of sides give 20/y and 20/x.']);
  add('03','interaction','profit',8,'Can the decisions be separated?',
    'A profit function contains a nonzero cross term bxy.',
    'What does this imply about choosing x and y?',
    ['The marginal profit of x can depend on y','The problem must have an integer solution','x and y can always be optimized independently'],0,
    ['The derivative of bxy with respect to x is by, so the other decision matters.','A cross term says nothing about an integer domain.','Independent optimizations can miss the interaction represented by bxy.'],true);
  add('04','budget','utility',10,'Write the stated resource limit',
    'Choose x₁,x₂>0 to obtain utility a ln x₁+(1−a) ln x₂, where 0<a<1. Prices c₁,c₂ are positive. Spending may not exceed d.',
    'Which inequality directly translates the spending limit?',
    ['c₁x₁+c₂x₂ ≥ d','c₁x₁+c₂x₂ ≤ d','x₁+x₂ ≤ d'],1,
    ['This requires a minimum spend, not a maximum.','This is the stated limit. Increasing utility and positive prices also justify equality at an optimum here.','The budget is in money, so quantities must be multiplied by prices.']);
  add('04','shadow','chem',28,'What does a multiplier measure?',
    'V(b) is maximum profit with capacity b. At a smooth point, the capacity multiplier is λ.',
    'How should λ be interpreted?',
    ['The total profit at capacity b','The exact gain from any size capacity expansion','The local gain in optimal profit per extra unit of capacity'],2,
    ['The multiplier measures sensitivity, not the level V(b).','A large change can alter the active constraints and the multiplier.','Locally V(b+Δb)≈V(b)+λΔb. The units are profit per capacity unit.']);
  add('04','binding','kkt',35,'Use complementary slackness carefully',
    'For a resource constraint g(x)≤b with multiplier λ≥0, λ(b−g(x))=0.',
    'Which implication must hold?',
    ['λ>0 implies g(x)=b','g(x)=b implies λ>0','λ=0 implies g(x)<b'],0,
    ['A positive multiplier forces zero slack.','A constraint can be binding with a zero multiplier.','A zero multiplier is compatible with either zero or positive slack.'],true);
  add('05','qmatrix','notation',6,'Encode the cross term',
    'Write 15x₁+30x₂+4x₁x₂−2x₁²−4x₂² as cᵀx−½xᵀQx, with Q symmetric.',
    'Which Q is correct?',
    ['[[4, −4], [−4, 8]]','[[2, −2], [−2, 4]]','[[4, 4], [4, 8]]'],0,
    ['The diagonal gives −2x₁²−4x₂². The two off-diagonal terms and −½ produce +4x₁x₂.','The −½ convention would halve the required quadratic terms.','These off-diagonal signs produce −4x₁x₂.']);
  add('05','family','geometry',3,'Recognize the model family',
    'The course QP form uses a quadratic objective, linear constraints and continuous variables.',
    'Which change takes a model outside this form?',
    ['Changing a linear capacity from 20 to 25','Adding the constraint x₁x₂≤20','Changing a quadratic objective coefficient'],1,
    ['The constraint remains linear.','The new constraint is nonlinear, so this is no longer the stated QP form.','The objective remains quadratic.']);
  add('05','complements','simplex',34,'Why is that column blocked?',
    'In the displayed initial modified-simplex basis, v₁ and v₂ are basic. Complementary pairs include (u₁,v₁) and (u₂,v₂).',
    'Why are u₁ and u₂ initially blocked by the restricted-entry rule?',
    ['Their reduced costs are positive','Their complementary partners are basic','Multipliers may never enter a basis'],1,
    ['They are tempting precisely because of their negative reduced costs in this tableau.','The restriction preserves the complementarity structure of the KKT system.','Multipliers can enter when the complementary-partner restriction permits it.'],true);
  add('07','state','inventory',35,'How much history is enough?',
    'The current month and all demands are known. Production cost has no dependence on earlier setups. Future costs and limits depend on inventory and future production.',
    'Which listed description is sufficient and simplest for the state?',
    ['Last month’s production','Inventory at the start of this month','The complete production history'],1,
    ['The same last production can follow different inventories, leaving different stock today.','With the month known, inventory carries the information needed for future feasibility and cost.','The history can reconstruct inventory, so it is sufficient, but carries redundant information.']);
  add('07','transition','inventory',36,'Write the state transition',
    'Start the month with i units. Produce x, then meet known demand d. The next state is next month’s starting inventory.',
    'Which transition is consistent with that timing?',
    ['i′=i−d','i′=i+x−d','i′=i−x+d'],1,
    ['This omits the effect of the production decision.','Initial stock plus production minus demand becomes next month’s stock.','Production adds stock and demand removes it; these signs are reversed.']);
  add('07','actions','inventory',36,'Which actions are feasible?',
    'Starting inventory is 4, demand is 1, production capacity is 5, and end-of-month storage capacity is 4. Production is a nonnegative integer.',
    'Which set contains exactly the feasible production quantities?',
    ['{0,1,2,3,4,5}','{1,2,3,4,5}','{0,1}'],2,
    ['Production above 1 leaves more than 4 in storage.','Starting stock already covers demand; production need not be positive, and storage still limits it.','End stock is 3+x, so 0≤x≤1. Both choices meet demand and both capacities.'],true);
  add('08','stage','teams',14,'A stage need not be a date',
    'Five medical teams must be allocated among three countries. Each country has its own benefit table for the number assigned.',
    'Which stage/state pair supports a resource-allocation DP?',
    ['Stage = country; state = teams remaining','Stage = team count; state = calendar day','Stage = country; state = country name only'],0,
    ['After allocating to one country, the remaining resource summarizes what is available for later countries.','There is no calendar-day decision sequence in this story.','The stage already identifies the country; the state must also track the resource still available.']);
  add('08','product','glueco',28,'State the assumption behind multiplication',
    'For a fixed sales-representative allocation, regional success events are independent, with probabilities p₁,p₂,p₃.',
    'What is the probability of success in all three regions?',
    ['p₁+p₂+p₃','1−(1−p₁)(1−p₂)(1−p₃)','p₁p₂p₃'],2,
    ['A sum need not be a probability and does not describe their intersection.','This is the probability of at least one success under independence.','Independence permits the product for all successes. “All” alone would not justify multiplication.']);
  add('08','fixedcost','ww',8,'Which cost can the plan change?',
    'All known demand is met, initial and final stock are zero, units are conserved, and unit production cost c is constant across periods.',
    'Which cost is the same for every feasible production plan?',
    ['Total setup cost','Total variable production cost cΣdₜ','Total holding cost'],1,
    ['Changing the number of production runs changes setup cost.','Every plan produces the same total units. Time-varying unit costs or surplus stock would change this reasoning.','Producing earlier can increase holding cost.'],true);
  add('09','order','pinv',16,'What is known when you decide?',
    'At each period’s start, inventory is observed. Production must be chosen before that period’s uncertain demand is known.',
    'Which event sequence matches the story?',
    ['Observe inventory → produce → observe demand → assess ending stock and cost','Observe inventory → observe demand → choose production → assess cost','Choose demand → produce → observe inventory'],0,
    ['The action uses only information available before the demand outcome.','This gives the decision maker demand information the story does not allow.','Demand is a random outcome, not a controlled decision.']);
  add('09','expectation','pinv',17,'Place the expectation',
    'Choose production x before demand D is observed. For a feasible x, total cost is C(x,D)+f(next state).',
    'Which expression respects that information order?',
    ['Eᴅ[minₓ {C(x,D)+f(next state)}]','minₓ Eᴅ[C(x,D)+f(next state)]','minₓ {C(x,E[D])+f(state computed using E[D])}'],1,
    ['This can choose a different x after seeing each D: it grants advance information.','One feasible decision is evaluated over all possible demand outcomes, then the best is chosen.','Replacing random demand by its mean generally changes nonlinear costs and future values.']);
  add('09','terminal','pinv',21,'The boundary is part of the model',
    'Minimize net cost over periods 1–3. Period-3 holding cost is already charged in that period. Remaining inventory i is then sold for $2 per unit.',
    'If f₄(i) represents only this terminal sale, what is it?',
    ['0','2i','−2i'],2,
    ['Zero would omit the sale proceeds.','Positive 2i treats income as a cost.','Sale income reduces net cost. Absorbing this term consistently into period 3 is an equivalent formulation.'],true);
  add('10','conditional','bayes',11,'Name the probability being asked for',
    'In a hypothetical screening example, a person has received a positive test. We ask for the probability that the person has the condition.',
    'Which quantity answers the question?',
    ['P(positive | condition)','P(condition | positive)','P(condition and positive)'],1,
    ['This conditions on having the condition, not on the observed test result.','The relevant population is the people with positive results.','This is a joint probability in the whole population, without conditioning on a positive result.']);
  add('10','distribution','poisson',39,'Choose the random variable and its units',
    'Arrivals form a Poisson process at 3 per hour. N counts arrivals during the next 10 minutes.',
    'Which distribution describes N?',
    ['Poisson with mean 0.5','Poisson with mean 3','Exponential with rate 3 per hour'],0,
    ['The interval is 1/6 hour, so its expected count is 3/6=0.5.','Mean 3 describes an hour, not ten minutes.','An exponential variable describes a waiting time, not a count.']);
  add('10','age','memoryless',27,'When can age be left out?',
    'Assume a device lifetime T is exponential at a constant rate. The device has survived to age a.',
    'How does its remaining-lifetime distribution compare with that of a new device?',
    ['It must be shorter because the device is older','It is the same under this assumption','It must be longer because the device has proved reliable'],1,
    ['That can be appropriate for wear-out models, but contradicts the stated exponential assumption.','Memorylessness removes age from the remaining-lifetime distribution. A different lifetime model can require age in the state.','Survival does not improve the exponential remaining-lifetime distribution.'],true);
  add('11','memory','insurance',52,'Remember what the question needs',
    'Premiums depend on accidents in the last two years. This year’s accident probability depends on whether an accident occurred last year.',
    'Which state determines both the current premium and the transition law?',
    ['Only the number of accidents in the last two years','Only last year’s accident indicator','The ordered two-year accident history'],2,
    ['One accident could be NY or YN; these have different last-year indicators and therefore different next-year risks.','This can be Markov for the accident process but does not determine a premium that depends on both years.','The ordered pair retains what is needed for both transitions and the state-based premium.']);
  add('11','row','insurance',52,'Shift the state window',
    'State = (year before last, last year), with N=no accident and Y=accident. Accident probability this year is 0.03 after N, 0.10 after Y. Columns are NN, NY, YN, YY.',
    'What is the transition row from NN?',
    ['(0.97, 0.03, 0, 0)','(0.97, 0, 0.03, 0)','(0.90, 0.10, 0, 0)'],0,
    ['The last N becomes the first symbol. The new outcome is N with 0.97 or Y with 0.03.','This puts the new outcome in the wrong position of the ordered pair.','The 0.10 risk applies after an accident last year, not after NN.']);
  add('11','absorbing','classify',45,'Categories can contain other categories',
    'In gambler’s ruin, states 0 and 4 have self-transition probability 1.',
    'How should these states be classified?',
    ['Absorbing and recurrent','Absorbing but not recurrent','Transient because the game ends'],0,
    ['They never leave, so return at the next step is certain. Absorption is a special case of recurrence.','Being absorbing guarantees recurrence, rather than excluding it.','The chain stays at the terminal state after the game ends; that is not transience.'],true);
  add('13','passage','camera',43,'Match the quantity to the question',
    'Camera-store state is end-of-week stock. Starting in state 3, we ask the expected number of weekly transitions until the first visit to state 0.',
    'Which quantity answers this?',
    ['Stationary probability π₀','Mean first-passage time μ₃₀','The three-step probability (P³)₃₀'],1,
    ['This is a long-run fraction of weeks, not a waiting time from state 3.','It starts from the stated initial condition and measures time to the first target visit.','This asks about state 0 at one particular future time, not the mean first arrival time.']);
  add('13','reorder','camera',29,'Same dynamics, different costs',
    'State is end-of-week stock. Only an empty store orders up to 3 before next week’s demand. A store ending with 3 orders nothing.',
    'How do states 0 and 3 compare for the next weekly transition?',
    ['Same transition probabilities and same ordering cost','Different transition probabilities because the states differ','Same transition probabilities, but different ordering costs'],2,
    ['Both begin demand with 3, but only the empty store places an order.','After the specified replenishment, both face the same demand from stock 3.','State 0 incurs ordering cost; state 3 does not. A state can affect rewards even when transition rows coincide.']);
  add('13','prefix','hth',67,'Compress the useful history',
    'We wait for the pattern HTH. The current useful suffix is H, and the next toss is also H.',
    'Which useful suffix should the next state retain?',
    ['No useful suffix','H','HH'],1,
    ['The newest H can still start HTH, so discarding it loses relevant progress.','The longest suffix that is a prefix of HTH is H.','HH is not a prefix of HTH; keeping the extra H is unnecessary.'],true);
  add('14','units','updown',7,'A rate is not a probability',
    'Poisson arrivals occur at rate λ=3 per hour. Δt is a sufficiently small interval measured in hours.',
    'What approximates the probability of at least one arrival in Δt?',
    ['3','3Δt','Δt/3'],1,
    ['A probability cannot be 3. The rate must be combined with the interval length.','1−exp(−3Δt)≈3Δt for small Δt; the result is dimensionless.','The rate multiplies time. Dividing by the rate does not give the required probability.']);
  add('14','machines','balance',25,'Aggregate the clocks correctly',
    'Two machines fail independently at rate λ per running machine. One repairman repairs one failed machine at a time at rate μ.',
    'What are the total failure rate when both run and repair rate when both are broken?',
    ['λ and μ','2λ and 2μ','2λ and μ'],2,
    ['Both running machines contribute a failure clock.','There is only one active repair clock with one repairman.','Failure clocks add when both run; one repairman still repairs only one machine at a time.']);
  add('14','balance','balance',22,'Turn the diagram into an equation',
    'A barbershop holds at most 2 customers including service. Arrival rate is λ, and one barber serves at rate μ. State n is customers inside.',
    'Which is the steady-state balance equation for state 1?',
    ['(λ+μ)π₁ = λπ₀+μπ₂','λπ₁ = μπ₀','2μπ₁ = λπ₀+λπ₂'],0,
    ['State 1 can lose a customer or gain one. It receives arrivals from 0 and completions from 2.','This omits one exit and the inflow from state 2.','There is one barber, and a transition from 2 to 1 is a service completion.'],true);
  const weeks = [...new Set(questions.map(q => q.week))];
  return {questions, weeks, get: id => questions.find(q => q.id === id),
    forWeek: week => questions.filter(q => q.week === week).sort((a,b) => Number(a.optional)-Number(b.optional) || a.beforeSlide-b.beforeSlide)};
})();
