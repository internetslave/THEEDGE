#!/usr/bin/env python3
"""
EdgeBets Roster Patcher — run this in the same folder as your index.html
Usage: python3 patch.py
Creates a backup at index.html.bak and patches index.html in place
"""
import sys, shutil, os

INPUT = 'index.html'

if not os.path.exists(INPUT):
    print(f"ERROR: '{INPUT}' not found.")
    print("Make sure patch.py is in the same folder as your index.html")
    sys.exit(1)

html = open(INPUT, encoding='utf-8').read()

START = "const AFL_FWDS ="
END   = "// Returns a small AI pick badge HTML for a given market"

si = html.find(START)
ei = html.find(END)

if si == -1:
    print("ERROR: Could not find 'const AFL_FWDS' — file may already be patched.")
    sys.exit(1)
if ei == -1:
    print("ERROR: Could not find end marker.")
    sys.exit(1)

print(f"Found block to replace: {ei - si} chars at position {si}-{ei}")

NEW_CODE = r"""// ═══════════════════════════════════════════════════════════════════
// EDGEBETS.NET — COMPLETE ROSTER DATA (2025/26 SEASON)
// ═══════════════════════════════════════════════════════════════════

const AFL_ROSTERS = {
  'Adelaide Crows':    { fwds: ['Taylor Walker','Darcy Fogarty','Riley Thilthorpe','Izak Rankine','Ned McHenry','Ben Keays'], mids: ['Jordan Dawson','Rory Laird','Matt Crouch','Lachlan Gollant','Sam Berry','Ben Keays'] },
  'Brisbane Lions':    { fwds: ['Joe Daniher','Charlie Cameron','Callum Ah Chee','Lincoln McCarthy','Cam Rayner','Eric Hipwood'], mids: ['Lachie Neale','Hugh McCluggage','Josh Dunkley','Zac Bailey','Will Ashcroft','Jarrod Berry'] },
  'Carlton':           { fwds: ['Harry McKay','Charlie Curnow','Lachie Fogarty','Jesse Motlop','Tom De Koning','Orazio Fantasia'], mids: ['Patrick Cripps','Sam Walsh','George Hewett','Matthew Kennedy','Adam Cerra','Elijah Hollands'] },
  'Collingwood':       { fwds: ['Jamie Elliott','Bobby Hill','Beau McCreery','Dan McStay','Jack Ginnivan','Brynn Teakle'], mids: ['Nick Daicos','Scott Pendlebury','Jordan De Goey','Jack Crisp','Steele Sidebottom','Josh Carmichael'] },
  'Essendon':          { fwds: ['Kyle Langford','Nate Caddy','Nick Watson','Ben Hobbs','Peter Wright','Jake Stringer'], mids: ['Zach Merrett','Darcy Parish','Andrew McGrath','Jye Caldwell','Jordan Ridley','Archie Perkins'] },
  'Fremantle':         { fwds: ['Josh Treacy','Matthew Taberner','Liam Henry','Josh Corbett','Michael Frederick','Jye Amiss'], mids: ['Caleb Serong','Andrew Brayshaw','Nat Fyfe','Will Brodie','Luke Ryan','Sean Darcy'] },
  'Geelong':           { fwds: ['Jeremy Cameron','Gryan Miers','Tom Hawkins','Oliver Henry','Brad Close','Shaun Higgins'], mids: ['Patrick Dangerfield','Tom Stewart','Mark Blicavs','Cameron Guthrie','Isaac Smith','Mitch Duncan'] },
  'Gold Coast Suns':   { fwds: ['Ben King','Wil Powell','Malcolm Rosas','Sam Flanders','Hewago Oea','Jarryd Lyons'], mids: ['Touk Miller','Noah Anderson','David Swallow','Matt Rowell','Jarrod Witts','Connor Budarick'] },
  'GWS Giants':        { fwds: ['Jesse Hogan','Toby Greene','Harry Himmelberg','Jake Riccardi','Aaron Cadman','Callum Brown'], mids: ['Josh Kelly','Stephen Coniglio','Tom Green','Finn Callaghan','Lachlan Keeffe','Josh Fahey'] },
  'Hawthorn':          { fwds: ['Mitch Lewis','Jack Gunston','Dylan Moore','Josh Ward','Calsher Dear','Josh Weddle'], mids: ['Jai Newcombe','James Worpel','Connor Macdonald','James Sicily','Will Day','Blake Hardwick'] },
  'Melbourne':         { fwds: ['Ben Brown','Kysaiah Pickett','Jake Melksham','Tom McDonald','Bayley Fritsch','Christian Salem'], mids: ['Christian Petracca','Clayton Oliver','Jack Viney','Ed Langdon','Steven May','Max Gawn'] },
  'North Melbourne':   { fwds: ['Nick Larkey','Cameron Zurhaar','Tristan Xerri','George Wardlaw','Paul Curtis','Quinton Narkle'], mids: ['Will Phillips','Luke Davies-Uniacke','Jaidyn Stephenson','Tom Powell','Harry Sheezel','Colby McKercher'] },
  'Port Adelaide':     { fwds: ['Charlie Dixon','Mitch Georgiades','Orazio Fantasia','Todd Marshall','Lachie Jones','Ollie Lord'], mids: ['Zak Butters','Jason Horne-Francis','Ollie Wines','Travis Boak','Willem Drew','Darcy Byrne-Jones'] },
  'Richmond':          { fwds: ['Jack Riewoldt','Tom Lynch','Shai Bolton','Dustin Martin','Jacob Bauer','Hugo Ralphsmith'], mids: ['Dion Prestia','Tim Taranto','Nick Vlastuin','Jayden Short','Liam Baker','Toby Nankervis'] },
  'St Kilda':          { fwds: ['Max King','Jack Higgins','Dan Butler','Mitch Owens','Anthony Caminiti','Jade Gresham'], mids: ['Jack Steele','Hunter Clark','Brad Hill','Ross Marshall','Nasiah Wanganeen-Milera','Zak Jones'] },
  'Sydney Swans':      { fwds: ['Logan McDonald','Tom Papley','Joel Amartey','Will Hayward','Sam Wicks','Errol Gulden'], mids: ['Chad Warner','Callum Mills','James Rowbottom','Luke Parker','Isaac Heeney','Nick Blakey'] },
  'West Coast Eagles': { fwds: ['Jake Waterman','Oscar Allen','Jack Darling','Jamaine Jones','Brendon Ah Chee','Tom Cole'], mids: ['Harley Reid','Tim Kelly','Elliot Yeo','Andrew Gaff','Jeremy McGovern','Jai Culley'] },
  'Western Bulldogs':  { fwds: ['Aaron Naughton','Cody Weightman','Josh Bruce','Ryan Gardner','Jamarra Ugle-Hagan','Ed Richards'], mids: ['Marcus Bontempelli','Adam Treloar','Bailey Smith','Tom Liberatore','Laitham Vandermeer','Jason Johannisen'] },
};
function getAFLPlayers(teamName, type) {
  if (!teamName) return [];
  if (AFL_ROSTERS[teamName]) return AFL_ROSTERS[teamName][type] || [];
  const last = teamName.split(' ').pop();
  const key = Object.keys(AFL_ROSTERS).find(k => k.includes(last));
  return key ? (AFL_ROSTERS[key][type] || []) : [];
}

const NRL_ROSTERS = {
  'Brisbane Broncos':              { backs: ['Selwyn Cobbo','Kotoni Staggs','Reece Walsh','Deine Mariner','Corey Oates'], halves: ['Adam Reynolds','Ezra Mam','Pat Carrigan','Payne Haas','Jock Madden'] },
  'Canberra Raiders':              { backs: ['Xavier Savage','Matt Timoko','Seb Kris','Jordan Rapana','Albert Hopoate'], halves: ['Jamal Fogarty','Ethan Strange','Jack Wighton','Josh Papalii','Joe Tapine'] },
  'Canterbury-Bankstown Bulldogs': { backs: ['Josh Addo-Carr','Stephen Crichton','Bronson Xerri','Jacob Preston','Brent Naden'], halves: ['Toby Sexton','Reed Mahoney','Viliame Kikau','Paul Vaughan','Josh Jackson'] },
  'Cronulla-Sutherland Sharks':    { backs: ['William Kennedy','Siosifa Talakai','Ronaldo Mulitalo','Kayal Iro','Jesse Ramien'], halves: ['Nicho Hynes','Daniel Atkinson','Briton Nikora','Toby Rudolf','Dale Finucane'] },
  'Dolphins':                      { backs: ['Hamiso Tabuai-Fidow','Herbie Farnworth','Jamayne Isaako','Mark Nicholls','Edrick Lee'], halves: ['Kodi Nikorima','Sean O\'Sullivan','Felise Kaufusi','Jesse Bromwich','Tom Gilbert'] },
  'Gold Coast Titans':             { backs: ['AJ Brimson','Jayden Campbell','Alofiana Khan-Pereira','Keano Kini','Greg Marzhew'], halves: ['Kieran Foran','Tanah Boyd','Tino Fa\'asuamaleaui','David Fifita','Isaac Liu'] },
  'Manly-Warringah Sea Eagles':    { backs: ['Tom Trbojevic','Jason Saab','Tommy Talau','Reuben Garrick','Moses Suli'], halves: ['Daly Cherry-Evans','Luke Brooks','Jake Trbojevic','Haumole Olakau\'atu','Karl Lawton'] },
  'Melbourne Storm':               { backs: ['Ryan Papenhuyzen','Nicholas Meaney','Marion Seve','Justin Olam','Grant Anderson'], halves: ['Cameron Munster','Jahrome Hughes','Harry Grant','Christian Welch','Lazarus Vaalepu'] },
  'Newcastle Knights':             { backs: ['Kalyn Ponga','Bradman Best','Dane Gagai','Dominic Young','Fletcher Myers'], halves: ['Tyson Gamble','Jackson Hastings','Daniel Saifiti','Jacob Saifiti','Pasami Saulo'] },
  'New Zealand Warriors':          { backs: ['Dallin Watene-Zelezniak','Marcelo Montoya','Roger Tuivasa-Sheck','Adam Pompey','Charnze Nicoll-Klokstad'], halves: ['Shaun Johnson','Te Maire Martin','Tohu Harris','Marata Niukore','Jazz Tevaga'] },
  'North Queensland Cowboys':      { backs: ['Valentine Holmes','Murray Taulagi','Kyle Feldt','Tom Chester','Jake Clifford'], halves: ['Scott Drinkwater','Chad Townsend','Jason Taumalolo','Jeremiah Nanai','Griffin Neame'] },
  'Parramatta Eels':               { backs: ['Clinton Gutherson','Will Penisini','Bailey Simonsson','Tom Opacic','Maika Sivo'], halves: ['Mitchell Moses','Dylan Brown','Reagan Campbell-Gillard','Isaiah Papali\'i','Bryce Cartwright'] },
  'Penrith Panthers':              { backs: ['Brian To\'o','Sunia Turuva','Taylan May','Paul Alamoti','Izack Tago'], halves: ['Nathan Cleary','Luron Patea','Isaah Yeo','Spencer Leniu','James Fisher-Harris'] },
  'South Sydney Rabbitohs':        { backs: ['Latrell Mitchell','Alex Johnston','Jaxson Paulo','Joshua Mansour','Blake Taaffe'], halves: ['Cody Walker','Lewis Doore','Cameron Murray','Tom Burgess','Keaon Koloamatangi'] },
  'St George Illawarra Dragons':   { backs: ['Zac Lomax','Moses Suli','Max Feagai','Christian Tuipulotu','Matthew Timoko'], halves: ['Ben Hunt','Kyle Flanagan','Francis Molo','Jack de Belin','Hame Sele'] },
  'Sydney Roosters':               { backs: ['James Tedesco','Joseph Manu','Daniel Tupou','Mark Nawaqanitawase','Billy Smith'], halves: ['Luke Keary','Sam Walker','Angus Crichton','Victor Radley','Jared Waerea-Hargreaves'] },
  'Wests Tigers':                  { backs: ['David Nofoaluma','Starford To\'a','Charlie Staines','Jahream Bula','Brent Naden'], halves: ['Jarome Luai','Api Koroisau','Stefano Utoikamanu','John Bateman','Aidan Sezer'] },
};
function getNRLPlayers(teamName, type) {
  if (!teamName) return [];
  if (NRL_ROSTERS[teamName]) return NRL_ROSTERS[teamName][type] || [];
  const words = teamName.split(' ');
  const key = Object.keys(NRL_ROSTERS).find(k => words.some(w => w.length > 3 && k.includes(w)));
  return key ? (NRL_ROSTERS[key][type] || []) : [];
}

const NBA_ROSTERS = {
  'Atlanta Hawks':          ['Trae Young','Dyson Daniels','De\'Andre Hunter','Clint Capela','Jalen Johnson','Bogdan Bogdanovic'],
  'Boston Celtics':         ['Jayson Tatum','Jaylen Brown','Jrue Holiday','Al Horford','Kristaps Porzingis','Payton Pritchard'],
  'Brooklyn Nets':          ['Cam Thomas','Ben Simmons','Nic Claxton','Dennis Schroder','Cameron Johnson','Mikal Bridges'],
  'Charlotte Hornets':      ['LaMelo Ball','Brandon Miller','Miles Bridges','Mark Williams','Grant Williams','Nick Richards'],
  'Chicago Bulls':          ['Zach LaVine','Nikola Vucevic','Coby White','Patrick Williams','Josh Giddey','Lonzo Ball'],
  'Cleveland Cavaliers':    ['Donovan Mitchell','Darius Garland','Evan Mobley','Jarrett Allen','Max Strus','Dean Wade'],
  'Dallas Mavericks':       ['Kyrie Irving','Luka Doncic','P.J. Washington','Daniel Gafford','Klay Thompson','Spencer Dinwiddie'],
  'Denver Nuggets':         ['Nikola Jokic','Jamal Murray','Michael Porter Jr.','Aaron Gordon','Julian Strawther','Christian Braun'],
  'Detroit Pistons':        ['Cade Cunningham','Jalen Duren','Ausar Thompson','Jaden Ivey','Tobias Harris','Isaiah Stewart'],
  'Golden State Warriors':  ['Stephen Curry','Draymond Green','Andrew Wiggins','Jonathan Kuminga','Brandin Podziemski','Moses Moody'],
  'Houston Rockets':        ['Jalen Green','Alperen Sengun','Dillon Brooks','Fred VanVleet','Amen Thompson','Jabari Smith Jr.'],
  'Indiana Pacers':         ['Tyrese Haliburton','Pascal Siakam','Myles Turner','Bennedict Mathurin','Andrew Nembhard','TJ McConnell'],
  'Los Angeles Clippers':   ['Kawhi Leonard','James Harden','Norman Powell','Ivica Zubac','Terance Mann','Nicolas Batum'],
  'Los Angeles Lakers':     ['LeBron James','Anthony Davis','Austin Reaves','D\'Angelo Russell','Rui Hachimura','Jarred Vanderbilt'],
  'Memphis Grizzlies':      ['Ja Morant','Desmond Bane','Jaren Jackson Jr.','Scotty Pippen Jr.','GG Jackson','Vince Williams Jr.'],
  'Miami Heat':             ['Bam Adebayo','Tyler Herro','Jaime Jaquez Jr.','Terry Rozier','Nikola Jovic','Caleb Martin'],
  'Milwaukee Bucks':        ['Giannis Antetokounmpo','Damian Lillard','Khris Middleton','Brook Lopez','Bobby Portis','Pat Connaughton'],
  'Minnesota Timberwolves': ['Anthony Edwards','Rudy Gobert','Jaden McDaniels','Mike Conley','Naz Reid','Karl-Anthony Towns'],
  'New Orleans Pelicans':   ['Zion Williamson','Brandon Ingram','CJ McCollum','Herbert Jones','Trey Murphy III','Jose Alvarado'],
  'New York Knicks':        ['Jalen Brunson','Karl-Anthony Towns','OG Anunoby','Josh Hart','Mikal Bridges','Donte DiVincenzo'],
  'Oklahoma City Thunder':  ['Shai Gilgeous-Alexander','Chet Holmgren','Jalen Williams','Luguentz Dort','Isaiah Hartenstein','Alex Caruso'],
  'Orlando Magic':          ['Paolo Banchero','Franz Wagner','Wendell Carter Jr.','Cole Anthony','Jalen Suggs','Jonathan Isaac'],
  'Philadelphia 76ers':     ['Joel Embiid','Tyrese Maxey','Paul George','Kelly Oubre Jr.','Andre Drummond','Kyle Lowry'],
  'Phoenix Suns':           ['Kevin Durant','Devin Booker','Bradley Beal','Jusuf Nurkic','Grayson Allen','Eric Gordon'],
  'Portland Trail Blazers': ['Scoot Henderson','Jerami Grant','Anfernee Simons','Deandre Ayton','Shaedon Sharpe','Toumani Camara'],
  'Sacramento Kings':       ['De\'Aaron Fox','Domantas Sabonis','Keegan Murray','Kevin Huerter','Harrison Barnes','Malik Monk'],
  'San Antonio Spurs':      ['Victor Wembanyama','Devin Vassell','Keldon Johnson','Tre Jones','Jeremy Sochan','Chris Paul'],
  'Toronto Raptors':        ['Scottie Barnes','Immanuel Quickley','RJ Barrett','Jakob Poeltl','Bruce Brown','Gradey Dick'],
  'Utah Jazz':              ['Lauri Markkanen','Jordan Clarkson','Keyonte George','Walker Kessler','John Collins','Collin Sexton'],
  'Washington Wizards':     ['Jordan Poole','Kyle Kuzma','Bilal Coulibaly','Alexandre Sarr','Tyus Jones','Johnny Davis'],
};
function getNBAPlayers(teamName) {
  if (!teamName) return [];
  if (NBA_ROSTERS[teamName]) return NBA_ROSTERS[teamName];
  const last = teamName.split(' ').pop();
  const key = Object.keys(NBA_ROSTERS).find(k => k.endsWith(last) || k.includes(last));
  return key ? NBA_ROSTERS[key] : [];
}

const SOCCER_ROSTERS = {
  'Adelaide United':['Nestory Irankunda','Ben Halloran','Craig Goodwin','Joe Caletti','Hiroshi Ibusuki'],
  'Brisbane Roar':['Charlie Austin','Stefan Mauk','Tom Aldred','Thomas Waddingham'],
  'Central Coast Mariners':['Marco Urena','Jason Cummings','Kye Rowles','Lewis Miller'],
  'Melbourne City':['Bruno Fornaroli','Florin Berenguer','Mathew Leckie','Harry Politidis'],
  'Melbourne Victory':['Jake Brimmer','Ben Folami','Roderick Miranda','Bruno Fornaroli'],
  'Newcastle Jets':['Roy O\'Donovan','Valentino Yuel','Jason Hoffman','Angus Thurgate'],
  'Perth Glory':['Adam Taggart','Mustafa Amini','Joel Chianese','Dane Ingham'],
  'Sydney FC':['Robert Mak','Patrick Wood','Anthony Caceres','Luke Brattan','Paulo Retre'],
  'Wellington Phoenix':['Oskar Zawada','Ben Old','Oli Sail','Liberato Cacace','Clayton Lewis'],
  'Western Sydney Wanderers':['Kusini Yengi','Brandon Borrello','Keanu Baccus','Jack Rodwell'],
  'Arsenal':['Bukayo Saka','Gabriel Martinelli','Leandro Trossard','Gabriel Jesus','Kai Havertz','Martin Odegaard'],
  'Aston Villa':['Ollie Watkins','Leon Bailey','Morgan Rogers','John McGinn','Moussa Diaby','Jhon Duran'],
  'Bournemouth':['Dominic Solanke','Marcus Tavernier','Philip Billing','Antoine Semenyo','Dango Ouattara'],
  'Brentford':['Ivan Toney','Bryan Mbeumo','Yoane Wissa','Vitaly Janelt','Mathias Jensen'],
  'Brighton':['Evan Ferguson','Kaoru Mitoma','Solly March','Pascal Gross','Danny Welbeck','Joao Pedro'],
  'Chelsea':['Cole Palmer','Nicolas Jackson','Christopher Nkunku','Raheem Sterling','Enzo Fernandez'],
  'Crystal Palace':['Eberechi Eze','Jean-Philippe Mateta','Michael Olise','Odsonne Edouard'],
  'Everton':['Dominic Calvert-Lewin','Beto','Jarrad Branthwaite','Jack Harrison'],
  'Fulham':['Raul Jimenez','Andreas Pereira','Emile Smith Rowe','Harry Wilson'],
  'Ipswich Town':['Liam Delap','Omari Hutchinson','Wes Burns','Conor Chaplin','Sammie Szmodics'],
  'Leicester City':['Jamie Vardy','Stephy Mavididi','Patson Daka','Kiernan Dewsbury-Hall'],
  'Liverpool':['Mohamed Salah','Luis Diaz','Darwin Nunez','Diogo Jota','Alexis Mac Allister','Trent Alexander-Arnold'],
  'Manchester City':['Erling Haaland','Kevin De Bruyne','Phil Foden','Bernardo Silva','Jack Grealish','Jeremy Doku'],
  'Manchester United':['Marcus Rashford','Bruno Fernandes','Rasmus Hojlund','Alejandro Garnacho','Kobbie Mainoo'],
  'Newcastle United':['Alexander Isak','Anthony Gordon','Callum Wilson','Bruno Guimaraes','Harvey Barnes','Joelinton'],
  'Nottingham Forest':['Taiwo Awoniyi','Callum Hudson-Odoi','Morgan Gibbs-White','Chris Wood','Anthony Elanga'],
  'Southampton':['Adam Armstrong','Che Adams','Stuart Armstrong','Kamaldeen Sulemana'],
  'Tottenham Hotspur':['Son Heung-min','Richarlison','Brennan Johnson','James Maddison','Dejan Kulusevski'],
  'West Ham United':['Jarrod Bowen','Mohammed Kudus','Michail Antonio','Lucas Paqueta'],
  'Wolverhampton Wanderers':['Hwang Hee-chan','Pedro Neto','Matheus Cunha','Pablo Sarabia'],
  'Real Madrid':['Vinicius Jr','Kylian Mbappe','Rodrygo','Jude Bellingham','Luka Modric'],
  'Barcelona':['Robert Lewandowski','Pedri','Gavi','Raphinha','Ferran Torres','Lamine Yamal'],
  'Atletico Madrid':['Antoine Griezmann','Alvaro Morata','Memphis Depay','Saul Niguez'],
  'Bayern Munich':['Harry Kane','Leroy Sane','Serge Gnabry','Thomas Muller','Jamal Musiala'],
  'Borussia Dortmund':['Sebastien Haller','Donyell Malen','Julian Brandt','Marco Reus'],
  'Inter Milan':['Lautaro Martinez','Romelu Lukaku','Nicolo Barella','Hakan Calhanoglu','Marcus Thuram'],
  'AC Milan':['Olivier Giroud','Rafael Leao','Christian Pulisic','Theo Hernandez'],
  'Juventus':['Dusan Vlahovic','Federico Chiesa','Adrien Rabiot','Moise Kean'],
  'Napoli':['Victor Osimhen','Khvicha Kvaratskhelia','Piotr Zielinski','Matteo Politano'],
  'Paris Saint-Germain':['Kylian Mbappe','Ousmane Dembele','Goncalo Ramos','Marco Asensio','Bradley Barcola'],
};
function getSoccerPlayers(teamName) {
  if (!teamName) return [];
  if (SOCCER_ROSTERS[teamName]) return SOCCER_ROSTERS[teamName];
  const words = teamName.split(' ').filter(w => w.length > 3);
  const key = Object.keys(SOCCER_ROSTERS).find(k => words.some(w => k.toLowerCase().includes(w.toLowerCase())));
  return key ? SOCCER_ROSTERS[key] : [];
}

function generateExtraMarkets(m) {
  if (!m || m.isRacing) return [];
  const rand = _emRand(m.id);
  const fl = _emFl;
  const pickN = (arr, n) => _emPickN(arr, n, rand);
  const rOdds = (base, spread = 0.08) => fl(Math.max(1.01, base + (rand() - 0.5) * spread));
  const homeOdds = m.homeOdds || 2, awayOdds = m.awayOdds || 2;
  const homeProb = (1 / homeOdds) / (1 / homeOdds + 1 / awayOdds);
  const probDiff = homeProb - 0.5;
  const favTeam = probDiff >= 0 ? m.home : m.away;
  const dogTeam = probDiff >= 0 ? m.away : m.home;
  const favOdds = Math.min(homeOdds, awayOdds);
  const dogOdds = Math.max(homeOdds, awayOdds);
  const markets = [];

  if (m.sport === 'AFL') {
    const linePts = (Math.round(Math.abs(probDiff) * 100 / 0.5) * 0.5) + 0.5;
    markets.push({ id:'line', name:'🏈 Line', outcomes: [{ label: `${favTeam} -${linePts}`, odds: rOdds(1.90) },{ label: `${dogTeam} +${linePts}`, odds: rOdds(1.90) }]});
    const ou = Math.round((155 + rand() * 40) * 2) / 2;
    markets.push({ id:'ou', name:'📊 Total Points O/U', outcomes: [{ label: `Over ${ou}`, odds: rOdds(1.90) },{ label: `Under ${ou}`, odds: rOdds(1.90) }]});
    markets.push({ id:'margin', name:'🎯 Winning Margin', outcomes: [
      { label: `${favTeam} 1–39`, odds: fl(favOdds * 0.84 + rand() * 0.06) },
      { label: `${favTeam} 40+`, odds: fl(favOdds * 2.7 + rand() * 0.3) },
      { label: `${dogTeam} 1–39`, odds: fl(dogOdds * 0.84 + rand() * 0.08) },
      { label: `${dogTeam} 40+`, odds: fl(dogOdds * 4.2 + rand() * 0.5) },
      { label: 'Draw', odds: rOdds(61, 8) }
    ]});
    const homeFwds = getAFLPlayers(m.home, 'fwds');
    const awayFwds = getAFLPlayers(m.away, 'fwds');
    const allFwds = pickN([...homeFwds, ...awayFwds], 10);
    const fgList = allFwds.map(n => ({ label: n, odds: fl(8 + rand() * 14) })).sort((a,b) => a.odds - b.odds);
    markets.push({ id:'firstgoal', name:'🥅 First Goal Scorer', outcomes: fgList });
    markets.push({ id:'2goals', name:'⚽ Anytime Goal Scorer (2+)', outcomes: fgList.map(p => ({ label: p.label, odds: fl(p.odds * 0.5 + rand() * 0.15) })).sort((a,b) => a.odds - b.odds) });
    const homeMids = getAFLPlayers(m.home, 'mids');
    const awayMids = getAFLPlayers(m.away, 'mids');
    const allMids = pickN([...homeMids, ...awayMids], 8);
    const d20List = allMids.map(n => ({ label: n, odds: rOdds(1.12 + rand() * 0.35, 0.04) })).sort((a,b) => a.odds - b.odds);
    markets.push({ id:'20dis', name:'📋 20+ Disposals', outcomes: d20List });
    markets.push({ id:'25dis', name:'📋 25+ Disposals', outcomes: d20List.map(p => ({ label: p.label, odds: fl(p.odds * 1.5 + rand() * 0.2) })).sort((a,b) => a.odds - b.odds) });

  } else if (m.sport === 'NRL') {
    const linePts = (Math.round(Math.abs(probDiff) * 48 / 0.5) * 0.5) + 0.5;
    markets.push({ id:'line', name:'🏉 Line', outcomes: [{ label: `${favTeam} -${linePts}`, odds: rOdds(1.90) },{ label: `${dogTeam} +${linePts}`, odds: rOdds(1.90) }]});
    const ou = Math.round((38 + rand() * 14) * 2) / 2;
    markets.push({ id:'ou', name:'📊 Total Points O/U', outcomes: [{ label: `Over ${ou}`, odds: rOdds(1.90) },{ label: `Under ${ou}`, odds: rOdds(1.90) }]});
    const homeBacks = getNRLPlayers(m.home, 'backs');
    const awayBacks = getNRLPlayers(m.away, 'backs');
    const homeHalves = getNRLPlayers(m.home, 'halves');
    const awayHalves = getNRLPlayers(m.away, 'halves');
    const tryers = pickN([...homeBacks, ...awayBacks, ...homeHalves, ...awayHalves], 10);
    const ftsList = tryers.map(n => ({ label: n, odds: fl(7 + rand() * 12) })).sort((a,b) => a.odds - b.odds).slice(0, 8);
    markets.push({ id:'firsttry', name:'🏃 First Try Scorer', outcomes: ftsList });
    markets.push({ id:'anytry', name:'🏃 Anytime Try Scorer', outcomes: ftsList.map(p => ({ label: p.label, odds: fl(p.odds * 0.42 + rand() * 0.1) })).sort((a,b) => a.odds - b.odds) });

  } else if (m.sport === 'NBA') {
    const linePts = (Math.round(Math.abs(probDiff) * 90 / 0.5) * 0.5) + 0.5;
    markets.push({ id:'spread', name:'🏀 Point Spread', outcomes: [{ label: `${favTeam} -${linePts}`, odds: rOdds(1.90) },{ label: `${dogTeam} +${linePts}`, odds: rOdds(1.90) }]});
    const ou = Math.round((210 + rand() * 30) * 2) / 2;
    markets.push({ id:'ou', name:'📊 Total Points O/U', outcomes: [{ label: `Over ${ou}`, odds: rOdds(1.90) },{ label: `Under ${ou}`, odds: rOdds(1.90) }]});
    const homePlayers = getNBAPlayers(m.home);
    const awayPlayers = getNBAPlayers(m.away);
    const matchPool = [...homePlayers, ...awayPlayers];
    const pool = matchPool.length >= 4 ? matchPool : Object.values(NBA_ROSTERS).flat().slice(0, 12);
    const stars = pickN(pool, Math.min(6, pool.length));
    markets.push({ id:'pts20', name:'🏀 Player 20+ Points', outcomes: stars.map(n => ({ label: n, odds: rOdds(1.72 + rand() * 0.7, 0.06) })).sort((a,b) => a.odds - b.odds) });
    markets.push({ id:'pts30', name:'🏀 Player 30+ Points', outcomes: stars.map(n => ({ label: n, odds: rOdds(3.5 + rand() * 1.5, 0.1) })).sort((a,b) => a.odds - b.odds) });

  } else if (m.sport === 'Soccer') {
    markets.push({ id:'ah', name:'⚽ Asian Handicap -0.5', outcomes: [{ label: `${favTeam} -0.5`, odds: rOdds(1.88, 0.1) },{ label: `${dogTeam} +0.5`, odds: rOdds(1.95, 0.1) }]});
    markets.push({ id:'ou25', name:'🎯 Total Goals O/U 2.5', outcomes: [{ label: 'Over 2.5', odds: rOdds(1.85, 0.08) },{ label: 'Under 2.5', odds: rOdds(1.98, 0.08) }]});
    markets.push({ id:'ou35', name:'🎯 Total Goals O/U 3.5', outcomes: [{ label: 'Over 3.5', odds: rOdds(2.65, 0.15) },{ label: 'Under 3.5', odds: rOdds(1.46, 0.1) }]});
    markets.push({ id:'btts', name:'🥅 Both Teams to Score', outcomes: [{ label: 'Yes', odds: rOdds(1.72, 0.08) },{ label: 'No', odds: rOdds(2.08, 0.1) }]});
    markets.push({ id:'htft', name:'⏱️ Half-Time / Full-Time', outcomes: [
      { label: `${m.home} / ${m.home}`, odds: fl(favOdds * 1.55 + rand() * 0.1) },
      { label: `${m.away} / ${m.away}`, odds: fl(dogOdds * 1.55 + rand() * 0.15) },
      { label: 'Draw / Draw', odds: rOdds(3.8, 0.3) },
      { label: `Draw / ${m.home}`, odds: rOdds(5.5, 0.5) },
      { label: `Draw / ${m.away}`, odds: rOdds(6.5, 0.5) }
    ]});
    const homeScorers = getSoccerPlayers(m.home);
    const awayScorers = getSoccerPlayers(m.away);
    const allScorers = [...homeScorers.slice(0,4), ...awayScorers.slice(0,4)];
    if (allScorers.length >= 4) {
      const fgsPool = pickN(allScorers, Math.min(8, allScorers.length));
      markets.push({ id:'firstgoal', name:'⚽ First Goalscorer', outcomes: fgsPool.map(n => ({ label: n, odds: fl(8 + rand() * 10) })).sort((a,b) => a.odds - b.odds) });
      markets.push({ id:'anyscorer', name:'⚽ Anytime Goalscorer', outcomes: fgsPool.map(n => ({ label: n, odds: fl(2.5 + rand() * 2.5) })).sort((a,b) => a.odds - b.odds) });
    }

  } else if (m.sport === 'UFC' || m.sport === 'Boxing') {
    const movOutcomes = [
      { label: `${m.home} by KO/TKO`, odds: fl(favOdds * 0.74 + rand() * 0.1) },
      { label: `${m.home} by Decision`, odds: fl(favOdds * 0.88 + rand() * 0.08) },
      { label: `${m.away} by KO/TKO`, odds: fl(dogOdds * 0.74 + rand() * 0.12) },
      { label: `${m.away} by Decision`, odds: fl(dogOdds * 0.88 + rand() * 0.1) }
    ];
    if (m.sport === 'UFC') {
      movOutcomes.splice(2, 0, { label: `${m.home} by Submission`, odds: fl(favOdds * 1.3 + rand() * 0.15) });
      movOutcomes.push({ label: `${m.away} by Submission`, odds: fl(dogOdds * 1.3 + rand() * 0.15) });
    }
    markets.push({ id:'mov', name:'🥊 Method of Victory', outcomes: movOutcomes });
    markets.push({ id:'dist', name:'⏱️ Goes the Distance', outcomes: [{ label: 'Yes', odds: rOdds(1.75, 0.12) },{ label: 'No', odds: rOdds(2.00, 0.12) }]});
    const rounds = m.sport === 'Boxing' ? 6 : 4;
    markets.push({ id:'round', name:'🎯 Round Betting', outcomes: Array.from({length: rounds}, (_, i) => ({ label: `Ends in Round ${i+1}`, odds: fl(8 + i * 1.8 + rand() * 1.2) }))});
  }

  return markets;
}

"""

patched = html[:si] + NEW_CODE + html[ei:]

shutil.copy(INPUT, INPUT + '.bak')
open(INPUT, 'w', encoding='utf-8').write(patched)

print(f"✅ Done!")
print(f"   Backup: {INPUT}.bak")
print(f"   Original: {len(html):,} chars")
print(f"   Patched:  {len(patched):,} chars")
print(f"   Replaced: {ei-si:,} chars with {len(NEW_CODE):,} chars")
