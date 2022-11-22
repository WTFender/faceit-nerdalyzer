const API_BASEURL = 'https://api.faceit.com';

const MATCH_ROOM_URL = 'https://www.faceit.com/en/csgo/room/';

const MAPS = [
  'de_dust2',
  'de_inferno',
  'de_mirage',
  'de_nuke',
  'de_overpass',
  'de_train',
  'de_vertigo',
];

const EMPTY_MATCH_ODDS: MatchOdds = {
  team1: [],
  team2: []
}

class Match {
  id: string;
  callback: Function;
  data: MatchData;
  team1: PlayerStatsData[];
  team2: PlayerStatsData[];

  constructor(id: string, callback: Function) {
    this.id = id
    this.callback = callback
    this.team1 = []
    this.team2 = []

    fetch(API_BASEURL + `/match/v2/match/${this.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.code === 'OPERATION-OK') {
          this.data = data.payload
          this.getPlayers()
        } else {
          new Error(data)
        }
      });
  }

  getPlayers() {
    this.data.teams.faction1.roster.forEach(player => {
      this.getPlayerStats(player.id, this.team1)
    });
    this.data.teams.faction2.roster.forEach(player => {
      this.getPlayerStats(player.id, this.team2)
    });
  }

  getPlayerStats(playerId: string, team: PlayerStatsData[]) {
    fetch(API_BASEURL + `/stats/v1/stats/users/${playerId}/games/csgo`)
      .then((response) => response.json())
      .then((data) => {
        if (data.lifetime) {
          team.push(data)
          if (this.team1.length === 5 && this.team2.length === 5) {
            this.loaded()
          }
        } else {
          new Error(data)
        }
      });
  }
  
  loaded() {
    this.callback(this)
  }

  odds(): MatchOdds {
    console.log('*****CALCODDS')
    const odds = {...EMPTY_MATCH_ODDS}
    MAPS.forEach(map => {
      const team1Odds = {
        name: map,
        rank: 0,
        played: 0,
        won: 0,
        winPct: 0
      }
      const team2Odds = {
        name: map,
        rank: 0,
        played: 0,
        won: 0,
        winPct: 0
      }
      this.team1.forEach(player => {
        player.segments.forEach(segment => {
          if (segment['_id']['gameMode'] === '5v5' &&
              segment['_id']['segmentId'] === 'csgo_map'){
            team1Odds.played += Number(segment['segments'][map]['m1'])
            team1Odds.won += Number(segment['segments'][map]['m2'])
          }
        });
        team1Odds.winPct = (team1Odds.won / team1Odds.played)
      });
      this.team2.forEach(player => {
        player.segments.forEach(segment => {
          if (segment['_id']['gameMode'] === '5v5' &&
              segment['_id']['segmentId'] === 'csgo_map'){
            team2Odds.played += Number(segment['segments'][map]['m1'])
            team2Odds.won += Number(segment['segments'][map]['m2'])
          }
        });
        team2Odds.winPct = (team2Odds.won / team2Odds.played)
      });
      odds.team1.push(team1Odds)
      odds.team2.push(team2Odds)
    });

    odds.team1.sort((a,b) => b.winPct - a.winPct)
    odds.team2.sort((a,b) => b.winPct - a.winPct)

    return odds;
  }
}

function showOdds(odds) {
  setTimeout(() => {
    const info = document.getElementById("info") as HTMLInputElement;

    const title = info.firstChild.firstChild.firstChild

    /*
    .firstchild
    .firstchild
      .firstchild = title
      .lastchild = >>
        .firstchild
          .lastchild
            .firstchild
              .2ndchildDiv
                span
    */
   console.log(title)

    info.style.backgroundColor = 'blue';
  }, 3000);

  console.log(odds)
}

function loadMatch(match: Match) {
  let odds = match.odds()
  showOdds(odds)
}

if (window.location.href.startsWith(MATCH_ROOM_URL)) {
  console.log("**********NERDALYZER")
  console.log("**********NERDALYZER")
  console.log("**********NERDALYZER")
  let matchId = window.location.href.replace(MATCH_ROOM_URL, '')
  // TODO validate matchId format, 1-<uuid4>
  new Match(matchId, loadMatch)
}
