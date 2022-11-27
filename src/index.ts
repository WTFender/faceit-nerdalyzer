class Nerdalyzer {
  debug: boolean;
  app: string;
  maps: string[];
  baseurl: string;
  rexMatchUrl: RegExp;
  // retrieved elements
  id: string; // match id
  userId: string;
  shadow: ShadowRoot;
  matchroom: HTMLElement;
  infoDiv: HTMLElement;
  nickname: string;
  // retrieved data
  data: MatchData;
  team1: PlayerStatsData[];
  team2: PlayerStatsData[];
  self: PlayerStatsData[];
  // calculated
  refresh: number;
  selfStats: MapOdds[];
  table?: HTMLElement;

  constructor(debug = false, poll = 2000) {
    this.log('init:Nerdalyzer')
    this.debug = debug
    this.app = 'nerdalyzer'
    this.baseurl = 'https://api.faceit.com'
    this.rexMatchUrl = /^https:\/\/www\.faceit\.com\/\w+\/csgo\/room\/(?<matchId>1(\-\w+){5})$/
    this.maps = [
      'de_ancient',
      'de_anubis',
      'de_dust2',
      'de_inferno',
      'de_mirage',
      'de_nuke',
      'de_overpass',
      'de_train',
      'de_vertigo',
    ];
    this.team1 = []
    this.team2 = []
    this.self = []
    this.selfStats = []
    this.userId = ''
    this.refresh = 0
    let nerd = this
    nerd.refresh = setInterval(() => {
      nerd.process()
    }, poll);
  }

  process() {
    this.log('func:process')
    if (!this.isMatchLobbyUrl()) { this.reset(); return }
    if (!this.hasElements()) { this.reset(); return }
    if (this.isMatchTable()) {
      // nice
    } else if (this.table) {
      this.log('func:process:isMatchTable:false:table exists, but not the right one?')
      this.log(this.table)
    } else {
      this.getMatch()
    }
  }

  log(v) {
    if (this.debug) {
      if (typeof (v) !== 'string') {
        console.log(v)
      } else {
        console.log(`${this.app}:${v}`)
      }
    }
  }

  reset() {
    this.log('func:reset')
    this.team1 = []
    this.team2 = []
    this.self = []
    this.selfStats = []
    this.shadow = null;
    this.matchroom = null;
    this.infoDiv = null;
    this.table = null;
  }

  isUser() {
    let userData = document.getElementById('oneTrustParam').innerHTML
    let match = userData.match(/\"id\"\:\"(?<userId>(\w+\-?){5})\"/)
    if ('userId' in match.groups) {
      this.userId = match.groups.userId
      console.log(this.userId)
      return true
    }
    return false
  }

  isMatchLobbyUrl() {
    let isLobby = false
    let match = window.location.href.match(this.rexMatchUrl)
    if (match) {
      this.id = match.groups.matchId
      isLobby = true
    }
    this.log(`func:isMatchLobbyUrl:${isLobby}`)
    return isLobby
  }

  hasElements() {
    let hasAllElements = true
    this.shadow = document.getElementById("parasite-container").shadowRoot
    if (!this.shadow) { hasAllElements = false }
    this.matchroom = this.shadow.getElementById("MATCHROOM-OVERVIEW")
    if (!this.matchroom) { hasAllElements = false }
    this.infoDiv = this.matchroom.querySelector('[name="info"]')
    if (!this.infoDiv) { hasAllElements = false }
    this.log(`func:hasElements:${hasAllElements}`)
    return hasAllElements
  }

  isMatchTable() {
    let isMatch = false
    this.table = this.shadow.getElementById('nerdalyzer-table')
    if (this.table) {
      if (this.table.getAttribute('name') === this.id) {
        isMatch = true
      }
    }
    this.log(`func:isMatchTable:${isMatch}`)
    return isMatch
  }

  getMatch() {
    this.log(`func:getMatch:${this.id}`)
    fetch(this.baseurl + `/match/v2/match/${this.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.code === 'OPERATION-OK') {
          this.data = data.payload
          setTimeout(() => {
            this.nickname = document.getElementsByClassName('nickname')[0].textContent
            this.getPlayers()
          }, 1000);
        } else {
          new Error(data)
        }
      });
  }

  getPlayers() {
    this.log('func:getPlayers')
    this.data.teams.faction1.roster.forEach(player => {
      this.getPlayerStats(player.id, this.team1)
    });
    this.data.teams.faction2.roster.forEach(player => {
      this.getPlayerStats(player.id, this.team2)
    });
  }

  getPlayerStats(playerId: any, team: PlayerStatsData[]) {
    this.log(`func:getPlayerStats:${playerId}`)
    fetch(this.baseurl + `/stats/v1/stats/users/${playerId}/games/csgo`)
      .then((response) => response.json())
      .then((data) => {
        if (data.lifetime) {
          team.push(data)
          this.loaded()
        } else {
          new Error(data)
        }
      });
  }

  calcTeamMapOdds(team): MapOdds[] {
    this.log('func:calcTeamMapOdds')
    const teamMapOdds = [];
    this.maps.forEach(map => {
      const mapOdds = {
        name: map,
        rank: 0,
        played: 0,
        won: 0,
        winPct: 0,
      };
      team.forEach(player => {
        player.segments.forEach(segment => {
          if (segment['_id']['gameMode'] === '5v5' &&
            segment['_id']['segmentId'] === 'csgo_map') {
            if (map in segment['segments']) {
              let played = Number(segment['segments'][map]['m1'])
              let won = Number(segment['segments'][map]['m2'])
              mapOdds.played += played
              mapOdds.won += won
              if (player.nickname === this.nickname) {
                this.selfStats.push({
                  name: map,
                  rank: 0,
                  played: played,
                  won: won,
                  winPct: (won / played)
                })
              }

            }
          }
        });
      });
      mapOdds.winPct = (mapOdds.won / mapOdds.played)
      teamMapOdds.push(mapOdds)
    })
    teamMapOdds.sort((a, b) => b.winPct - a.winPct)
    return teamMapOdds;
  }

  odds(): MatchOdds {
    this.log('func:odds')
    const odds: MatchOdds = {
      team1: this.calcTeamMapOdds(this.team1),
      team2: this.calcTeamMapOdds(this.team2),
      self: this.calcTeamMapOdds(this.self)
    }
    this.log(odds)
    return odds;
  }

  appendTeamMapCols(row: HTMLTableRowElement, color: string, team: string, mapOdds: MapOdds): HTMLTableRowElement {
    let f_won = document.createElement('td')
    let f_played = document.createElement('td')
    let f_winPct = document.createElement('td')
    f_won.style.backgroundColor = color
    f_played.style.backgroundColor = color
    f_winPct.style.backgroundColor = color
    f_won.setAttribute('id', `${team}-${mapOdds.name}-won`)
    f_played.setAttribute('id', `${team}-${mapOdds.name}-played`)
    f_winPct.setAttribute('id', `${team}-${mapOdds.name}-winpct`)
    f_won.textContent = `${mapOdds.won}`
    f_played.textContent = `${mapOdds.played}`
    f_winPct.textContent = `${mapOdds.winPct.toFixed(2).replace('0.', '')}%`
    f_won.style.textAlign = 'center'
    f_played.style.textAlign = 'center'
    f_winPct.style.textAlign = 'center'
    f_winPct.style.backgroundColor = this.getColor(1 - mapOdds.winPct)
    row.appendChild(f_won)
    row.appendChild(f_played)
    row.appendChild(f_winPct)
    return row
  }

  buildTeamMapRow(mapName: string, odds: MatchOdds): HTMLTableRowElement {
    let row = document.createElement('tr')
    let f1 = document.createElement('td')
    f1.textContent = mapName.replace('de_', '')
    f1.style.textAlign = 'right'
    row.appendChild(f1)

    let mapOdds = this.getMapOdds(mapName, odds)
    row = this.appendTeamMapCols(row, '#2c2c2c', 'team1', mapOdds[0])
    row = this.appendTeamMapCols(row, '#3c3c3c', 'team2', mapOdds[1])
    if (this.selfStats.length > 0) {
      row = this.appendTeamMapCols(row, '#2c2c2c', 'self', mapOdds[2])
    }
    return row
  }

  buildHeaderRow(): HTMLTableRowElement {
    let header = document.createElement('tr')
    let head1 = document.createElement('th')
    let head2 = document.createElement('th')
    let head3 = document.createElement('th')
    let head4 = document.createElement('th')
    let headStats = [head2, head3, head4]
    head1.setAttribute('id', this.id)
    head2.textContent = this.data.teams.faction1.name
    head3.textContent = this.data.teams.faction2.name
    head4.textContent = this.nickname
    head2.style.backgroundColor = '#2c2c2c'
    head3.style.backgroundColor = '#3c3c3c'
    head4.style.backgroundColor = '#2c2c2c'
    headStats.forEach(f => {
      f.colSpan = 3
      f.style.maxWidth = '100px'
      f.style.overflow = 'hidden'
      f.style.textOverflow = 'ellipsis'
      f.style.whiteSpace = 'nowrap'
    });

    header.appendChild(head1)
    header.appendChild(head2)
    header.appendChild(head3)
    if (this.selfStats.length > 0) {
      header.appendChild(head4)
    }
    return header
  }

  buildLabelsRow(): HTMLTableRowElement {
    let labels = document.createElement('tr')
    let l1 = document.createElement('th')
    labels.appendChild(l1)
    let fieldLabels = ['team1', 'team2']
    if (this.selfStats.length > 0) {
      fieldLabels.push('self')
    }
    for (let label in fieldLabels) {
      let l2 = document.createElement('th')
      let l3 = document.createElement('th')
      let l4 = document.createElement('th')
      l2.textContent = 'won'
      l3.textContent = 'played'
      l4.textContent = 'winPct'
      labels.appendChild(l2)
      labels.appendChild(l3)
      labels.appendChild(l4)
    }
    return labels
  }

  buildTable(): HTMLTableElement {
    let odds = this.odds()
    let mapStats = document.createElement('table');
    mapStats.setAttribute('id', 'nerdalyzer-table')
    mapStats.setAttribute('name', this.id)
    mapStats.style.width = '100%'
    mapStats.style.padding = '5px'
    mapStats.style.fontSize = '.70em'
    mapStats.style.backgroundColor = '#1f1f1f'
    mapStats.style.borderRadius = '4px'
    mapStats.style.marginLeft = 'auto'
    mapStats.style.marginRight = 'auto'
    let tbody = document.createElement('tbody');
    tbody.appendChild(this.buildHeaderRow())
    tbody.appendChild(this.buildLabelsRow())
    this.maps.forEach(mapName => {
      tbody.appendChild(this.buildTeamMapRow(mapName, odds))
    });
    mapStats.appendChild(tbody)
    let sectionHeader = document.createElement('strong')
    sectionHeader.textContent = 'Nerdalyzer'
    // TODO add sectionHeader
    return mapStats
  }

  getColor(value) {
    if (value >= .5) {
      value = value * 1.12
    } else {
      value = value * .88
    }
    var hue = ((1 - value) * 120).toString(10);
    var color = ["hsl(", hue, ",100%,30%)"].join("")
    return color;
  }

  getMapOdds(mapName: string, odds: MatchOdds): MapOdds[] {
    if (!mapName.startsWith('de_')) {
      mapName = `de_${mapName.toLowerCase()}`
    }
    let team1MapOdds: MapOdds;
    let team2MapOdds: MapOdds;
    let selfMapOdds: MapOdds;
    odds.team1.forEach(mapOdds => {
      if (mapOdds.name === mapName) {
        team1MapOdds = mapOdds
      }
    });
    odds.team2.forEach(mapOdds => {
      if (mapOdds.name === mapName) {
        team2MapOdds = mapOdds
      }
    });
    odds.self.forEach(mapOdds => {
      if (mapOdds.name === mapName) {
        selfMapOdds = mapOdds
      }
    });
    let mapOdds = [team1MapOdds, team2MapOdds, selfMapOdds]
    return mapOdds
  }

  showTable() {
    this.log('func:showTable')
    let table = this.buildTable()
    let titleDiv = document.createElement('div')
    let title = document.createElement('strong')
    title.textContent = 'Nerdalyzer'
    titleDiv.appendChild(title)
    this.infoDiv.firstChild.appendChild(titleDiv)
    this.infoDiv.firstChild.appendChild(table)
  }

  loaded() {
    this.log('func:loaded')
    if (this.team1.length === 5 && this.team2.length === 5) {
      this.showTable()
    }
  }
}

var OneTrust; // Injected in page?
let nerd = new Nerdalyzer(true)