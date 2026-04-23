// Sample data — the Smith family, per the brief

const TBD = {
  household: { name: 'The Smith Family', id: 'smith' },

  members: [
    { id: 'dad',     name: 'Dad',     full: 'Mike Smith',   role: 'adult', color: '#3B82F6', initial: 'D', stars: 0,  streak: 0 },
    { id: 'mom',     name: 'Mom',     full: 'Sarah Smith',  role: 'adult', color: '#EF4444', initial: 'M', stars: 0,  streak: 0 },
    { id: 'jackson', name: 'Jackson', full: 'Jackson',      role: 'child', color: '#22C55E', initial: 'J', stars: 15, streak: 7 },
    { id: 'emma',    name: 'Emma',    full: 'Emma',         role: 'child', color: '#F59E0B', initial: 'E', stars: 23, streak: 12 },
  ],

  // Thursday, April 22
  events: [
    { id: 'e1', title: 'Morning standup',       start: '08:00', end: '08:30', members: ['dad'], location: 'Home office', type: 'work' },
    { id: 'e2', title: 'Dentist — Jackson',     start: '09:00', end: '10:00', members: ['mom', 'jackson'], location: 'Dr. Patel, Market St' },
    { id: 'e3', title: 'Grocery run',           start: '11:00', end: '11:45', members: ['mom'], location: 'Trader Joe\'s' },
    { id: 'e4', title: 'Soccer practice',       start: '15:30', end: '16:45', members: ['jackson', 'emma'], location: 'Riverside Field' },
    { id: 'e5', title: 'Piano lesson',          start: '17:00', end: '17:45', members: ['emma'], location: 'Ms. Chen' },
    { id: 'e6', title: 'Family dinner',         start: '18:30', end: '19:30', members: ['dad','mom','jackson','emma'], location: 'Home' },
    { id: 'e7', title: 'Book club',             start: '20:00', end: '21:30', members: ['mom'], location: 'The Reading Room' },
  ],

  // Week view data (Mon–Sun, condensed pills)
  week: [
    { day: 'Mon', date: 19, items: [ {m:'dad',t:'Standup',h:8}, {m:'emma',t:'Piano',h:17} ] },
    { day: 'Tue', date: 20, items: [ {m:'mom',t:'Yoga',h:7}, {m:'jackson',t:'Soccer',h:15.5} ] },
    { day: 'Wed', date: 21, items: [ {m:'dad',t:'Dentist',h:10}, {m:'emma',t:'Ballet',h:16} ] },
    { day: 'Thu', date: 22, items: [ {m:'dad',t:'Standup',h:8}, {m:'mom',t:'Dentist',h:9}, {m:'jackson',t:'Soccer',h:15.5}, {m:'all',t:'Dinner',h:18.5} ] },
    { day: 'Fri', date: 23, items: [ {m:'mom',t:'Book club',h:20} ] },
    { day: 'Sat', date: 24, items: [ {m:'all',t:'Park',h:10}, {m:'emma',t:'Playdate',h:14} ] },
    { day: 'Sun', date: 25, items: [ {m:'all',t:'Brunch',h:10} ] },
  ],

  routine: {
    member: 'jackson',
    name: 'Jackson\'s Morning Routine',
    progress: 3,
    total: 6,
    minutesLeft: 15,
    steps: [
      { id: 's1', emoji: '🛏️', name: 'Make bed',        min: 3, done: true },
      { id: 's2', emoji: '🦷', name: 'Brush teeth',     min: 2, done: true },
      { id: 's3', emoji: '👕', name: 'Get dressed',     min: 5, done: true },
      { id: 's4', emoji: '🥣', name: 'Eat breakfast',   min: 10, done: false, active: true },
      { id: 's5', emoji: '🎒', name: 'Pack school bag', min: 4, done: false },
      { id: 's6', emoji: '👟', name: 'Put shoes on',    min: 2, done: false },
    ],
  },

  recipes: [
    { id:'r1', title:'Spaghetti Carbonara', source:'seriouseats.com', prep:10, cook:20, total:30, serves:4, rating:4, tag:['italian','pasta','quick'],
      ingredients: [
        {amt:'1 lb', name:'spaghetti'},
        {amt:'6 oz', name:'guanciale or pancetta, diced'},
        {amt:'4', name:'large egg yolks'},
        {amt:'1', name:'whole egg'},
        {amt:'1 cup', name:'Pecorino Romano, finely grated'},
        {amt:'', name:'Black pepper, freshly ground'},
        {amt:'', name:'Salt, for pasta water'},
      ],
      steps: [
        'Bring a large pot of salted water to a boil.',
        'Cook pancetta in a wide skillet over medium heat until crisp, 6–8 min.',
        'Whisk yolks, whole egg, cheese and plenty of pepper in a bowl.',
        'Cook pasta until al dente. Reserve 1 cup pasta water.',
        'Off heat, toss pasta with pancetta and fat. Slowly add egg mixture, tossing, adding pasta water to loosen.',
        'Serve immediately with more pepper and cheese.',
      ],
    },
    { id:'r2', title:'Sheet Pan Chicken Fajitas', source:'nytimes.com', prep:15, cook:25, total:40, serves:4, rating:5, tag:['mexican','weeknight'] },
    { id:'r3', title:'Miso Butter Salmon',        source:'bonappetit.com', prep:5,  cook:15, total:20, serves:4, rating:5, tag:['seafood','quick'] },
    { id:'r4', title:'Turkey Chili',              source:'smittenkitchen.com', prep:15, cook:45, total:60, serves:6, rating:4, tag:['stew','batch'] },
    { id:'r5', title:'Overnight Oats',            source:'loveandlemons.com', prep:5, cook:0,  total:5,  serves:2, rating:3, tag:['breakfast'] },
    { id:'r6', title:'Buttermilk Pancakes',       source:'kingarthurbaking.com', prep:10, cook:15, total:25, serves:4, rating:5, tag:['breakfast','weekend'] },
    { id:'r7', title:'Caesar Salad',              source:'bonappetit.com', prep:15, cook:0, total:15, serves:4, rating:4, tag:['salad'] },
    { id:'r8', title:'Grilled Cheese',            source:'—', prep:2, cook:6, total:8, serves:1, rating:3, tag:['lunch'] },
  ],

  mealPlan: {
    weekOf: 'April 20',
    // 4 rows × 7 cols; null = empty slot
    rows: ['Breakfast','Lunch','Dinner','Snack'],
    grid: [
      [null,     'r5',  null,     'r5',  null,     'r6',  null ],
      ['r7',      null, 'r8',      null, 'r7',      null, 'r2' ],
      ['r1',     'r2',  'r3',     'r3',  'r2',      null, 'r4' ],
      [null,      null, null,      null, null,      null, null ],
    ],
  },

  shopping: {
    weekOf: 'April 20',
    fromRecipes: 8,
    categories: [
      { name:'Produce', items:[
        {amt:'1 lb',     name:'Roma tomatoes',      done:false},
        {amt:'2 bunches',name:'Italian parsley',    done:false},
        {amt:'1',        name:'yellow onion',       done:true},
        {amt:'4',        name:'bell peppers',       done:false},
        {amt:'1 head',   name:'romaine lettuce',    done:false},
        {amt:'2',        name:'limes',              done:false},
      ]},
      { name:'Dairy', items:[
        {amt:'8 oz',     name:'Pecorino Romano',    done:false},
        {amt:'1 dozen',  name:'eggs',               done:true},
        {amt:'1 qt',     name:'whole milk',         done:false},
        {amt:'1 cup',    name:'buttermilk',         done:false},
      ]},
      { name:'Meat', items:[
        {amt:'6 oz',     name:'guanciale',          done:false},
        {amt:'1.5 lb',   name:'chicken thighs',     done:false},
        {amt:'1 lb',     name:'ground turkey',      done:false},
        {amt:'4 fillets',name:'salmon',             done:false},
      ]},
      { name:'Pantry', items:[
        {amt:'1 lb',     name:'spaghetti',          done:true},
        {amt:'1 can',    name:'kidney beans',       done:false},
        {amt:'1 jar',    name:'white miso',         done:false},
      ]},
      { name:'Pantry Staples', pantry:true, items:[
        {amt:'',         name:'olive oil',          done:false},
        {amt:'',         name:'kosher salt',        done:false},
        {amt:'',         name:'black pepper',       done:false},
      ]},
    ],
  },

  equity: {
    period: 'This Week',
    domains: 12,
    adults: [
      { id:'mom', total:18, cognitive:12, physical:6,  personalHrs:2, personalGoal:5, load:'yellow', loadPct:58 },
      { id:'dad', total:14, cognitive:5,  physical:9,  personalHrs:6, personalGoal:5, load:'green',  loadPct:42 },
    ],
    // Domains (12 total, split between adults)
    domainList: [
      { name:'Meals & Groceries', owner:'mom', hours:5.5, tasks:14 },
      { name:'Medical & Health',  owner:'mom', hours:2.0, tasks:4  },
      { name:'School & Activities', owner:'mom', hours:3.5, tasks:9 },
      { name:'Birthdays & Gifts', owner:'mom', hours:1.0, tasks:2 },
      { name:'Household Supplies', owner:'mom', hours:2.0, tasks:6 },
      { name:'Social Planning',   owner:'mom', hours:2.0, tasks:3 },
      { name:'Laundry',           owner:'mom', hours:2.0, tasks:3 },
      { name:'Lawn & Garden',     owner:'dad', hours:3.0, tasks:2 },
      { name:'Cars & Maintenance',owner:'dad', hours:2.0, tasks:1 },
      { name:'Trash & Recycling', owner:'dad', hours:1.5, tasks:4 },
      { name:'Finances & Bills',  owner:'dad', hours:4.0, tasks:5 },
      { name:'Tech & Devices',    owner:'dad', hours:3.5, tasks:3 },
    ],
    // 4-week trend (hours/week per adult)
    trend: [
      {w:'W-3', mom:24, dad:11},
      {w:'W-2', mom:22, dad:13},
      {w:'W-1', mom:20, dad:13},
      {w:'This', mom:18, dad:14},
    ],
  },

  race: {
    name: 'Kitchen Clean-Up Race!',
    countdownSec: 410,
    totalSec: 600,
    participants: [
      { id:'jackson', progress: 3, items: 5 },
      { id:'emma',    progress: 4, items: 5 },
    ],
    items: [
      { name:'Clear table', by:'emma' },
      { name:'Rinse dishes', by:'jackson' },
      { name:'Load dishwasher', by:'emma' },
      { name:'Wipe counters', by:'jackson' },
      { name:'Sweep floor', by:null },
      { name:'Take out trash', by:'emma' },
      { name:'Wipe stovetop', by:'jackson' },
    ],
  },
};

window.TBD = TBD;
