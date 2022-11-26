const DEBUG = true;
const API_BASEURL = 'https://api.faceit.com';
const REX_MATCH_URL = /^https:\/\/www\.faceit\.com\/\w+\/csgo\/room\/(?<matchId>1(\-\w+){5})$/;
const MAPS = [
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
var MATCH_REFRESH;
var MATCH;
function log(v) {
    if (DEBUG) {
        console.log(v);
    }
}
class Match {
    id;
    callback;
    data;
    team1;
    team2;
    self;
    selfStats;
    nickname;
    constructor(id, callback) {
        this.id = id;
        this.callback = callback;
        this.team1 = [];
        this.team2 = [];
        this.self = [];
        this.selfStats = [];
        this.getMatch();
    }
    getMatch() {
        log('getMatch');
        fetch(API_BASEURL + `/match/v2/match/${this.id}`)
            .then((response) => response.json())
            .then((data) => {
            if (data.code === 'OPERATION-OK') {
                this.data = data.payload;
                setTimeout(() => {
                    this.nickname = document.getElementsByClassName('nickname')[0].textContent;
                    this.getPlayers();
                }, 1000);
            }
            else {
                new Error(data);
            }
        });
    }
    getPlayers() {
        log('getPlayers');
        this.data.teams.faction1.roster.forEach(player => {
            this.getPlayerStats(player, this.team1, this.self);
        });
        this.data.teams.faction2.roster.forEach(player => {
            this.getPlayerStats(player, this.team2, this.self);
        });
    }
    getPlayerStats(player, team, self) {
        let playerId = player.id;
        log(`getPlayerStats:${playerId}`);
        fetch(API_BASEURL + `/stats/v1/stats/users/${playerId}/games/csgo`)
            .then((response) => response.json())
            .then((data) => {
            if (data.lifetime) {
                console.log(data);
                team.push(data);
                if (player.nickname === this.nickname) {
                    self.push(data);
                }
                if (this.team1.length === 5 && this.team2.length === 5) {
                    this.loaded();
                }
            }
            else {
                new Error(data);
            }
        });
    }
    loaded() {
        log('loaded');
        let callback = this.callback;
        // setTimeout(() => { this.callback(odds) }, 2000);
        //clearInterval(MATCH_REFRESH)
        MATCH_REFRESH = setInterval(function () { callback(); }, 2000);
    }
    calcTeamMapOdds(team) {
        const teamMapOdds = [];
        MAPS.forEach(map => {
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
                            let played = Number(segment['segments'][map]['m1']);
                            let won = Number(segment['segments'][map]['m2']);
                            mapOdds.played += played;
                            mapOdds.won += won;
                            if (player.nickname === this.nickname) {
                                console.log('nicknameMatch');
                                this.selfStats.push({
                                    name: map,
                                    rank: 0,
                                    played: played,
                                    won: won,
                                    winPct: (won / played)
                                });
                            }
                        }
                    }
                });
            });
            mapOdds.winPct = (mapOdds.won / mapOdds.played);
            teamMapOdds.push(mapOdds);
        });
        teamMapOdds.sort((a, b) => b.winPct - a.winPct);
        return teamMapOdds;
    }
    odds() {
        log('calcOdds');
        const odds = {
            team1: this.calcTeamMapOdds(this.team1),
            team2: this.calcTeamMapOdds(this.team2),
            self: this.calcTeamMapOdds(this.self)
        };
        console.log(odds.self);
        return odds;
    }
}
function buildTable(odds) {
    const mapStats = document.createElement('table');
    mapStats.setAttribute('id', 'nerdalyzer-table');
    mapStats.setAttribute('name', MATCH.id);
    const tbody = document.createElement('tbody');
    const header = document.createElement('tr');
    const head1 = document.createElement('th');
    const head2 = document.createElement('th');
    const head3 = document.createElement('th');
    const head4 = document.createElement('th');
    head2.textContent = MATCH.data.teams.faction1.name;
    head3.textContent = MATCH.data.teams.faction2.name;
    head4.textContent = MATCH.nickname;
    head2.style.maxWidth = '100px';
    head3.style.maxWidth = '100px';
    head4.style.maxWidth = '100px';
    head2.style.overflow = 'hidden';
    head3.style.overflow = 'hidden';
    head4.style.overflow = 'hidden';
    head2.style.textOverflow = 'ellipsis';
    head3.style.textOverflow = 'ellipsis';
    head4.style.overflow = 'hidden';
    head2.style.whiteSpace = 'nowrap';
    head3.style.whiteSpace = 'nowrap';
    head4.style.overflow = 'hidden';
    header.appendChild(head1);
    header.appendChild(head2);
    header.appendChild(head3);
    header.appendChild(head4);
    tbody.appendChild(header);
    MAPS.forEach(mapName => {
        let mapOdds = getMapOdds(mapName, odds);
        let t1 = mapOdds[0];
        let t2 = mapOdds[1];
        let self = mapOdds[2];
        let row = document.createElement('tr');
        let f1 = document.createElement('td');
        let f2 = document.createElement('td');
        let f3 = document.createElement('td');
        let f4 = document.createElement('td');
        f1.textContent = mapName.replace('de_', '');
        f2.setAttribute('id', `team1-${mapName}-stats`);
        f3.setAttribute('id', `team2-${mapName}-stats`);
        f4.setAttribute('id', `self-${mapName}-stats`);
        f2.textContent = `${t1.winPct.toFixed(2).replace('0.', '')}%  ${t1.won}  ${t1.played}`;
        f3.textContent = `${t2.winPct.toFixed(2).replace('0.', '')}%  ${t2.won}  ${t2.played}`;
        f4.textContent = `${self.winPct.toFixed(2).replace('0.', '')}%  ${self.won}  ${self.played}`;
        f1.style.textAlign = 'right';
        f2.style.textAlign = 'center';
        f3.style.textAlign = 'center';
        f4.style.textAlign = 'center';
        f2.style.backgroundColor = getColor(1 - t1.winPct);
        f3.style.backgroundColor = getColor(1 - t2.winPct);
        f4.style.backgroundColor = getColor(1 - self.winPct);
        row.appendChild(f1);
        row.appendChild(f2);
        row.appendChild(f3);
        row.appendChild(f4);
        tbody.appendChild(row);
    });
    mapStats.appendChild(tbody);
    console.log(mapStats);
    let sectionHeader = document.createElement('strong');
    sectionHeader.textContent = 'Nerdalyzer';
    return [sectionHeader, mapStats];
}
function getColor(value) {
    var hue = ((1 - value) * 120).toString(10);
    return ["hsl(", hue, ",100%,30%)"].join("");
}
function getMapOdds(mapName, odds) {
    if (!mapName.startsWith('de_')) {
        mapName = `de_${mapName.toLowerCase()}`;
    }
    let team1MapOdds;
    let team2MapOdds;
    let selfMapOdds;
    odds.team1.forEach(mapOdds => {
        if (mapOdds.name === mapName) {
            team1MapOdds = mapOdds;
        }
    });
    odds.team2.forEach(mapOdds => {
        if (mapOdds.name === mapName) {
            team2MapOdds = mapOdds;
        }
    });
    odds.team2.forEach(mapOdds => {
        if (mapOdds.name === mapName) {
            selfMapOdds = mapOdds;
        }
    });
    let mapOdds = [team1MapOdds, team2MapOdds, selfMapOdds];
    return mapOdds;
}
function buildTeamOddsDiv(team, mapOdds) {
    const teamDiv = document.createElement('div');
    teamDiv.setAttribute('id', `${team}-${mapOdds.name}-odds`);
    teamDiv.classList.add('team-odds');
    teamDiv.innerHTML = mapOdds.winPct.toFixed(2);
    teamDiv.style.backgroundColor = getColor(1 - mapOdds.winPct);
    return teamDiv;
}
function showMapOdds(rootDiv, oddsDiv, team1Odds, team2Odds) {
    if (!rootDiv.getElementById(`team1-${team1Odds.name}-odds`)) {
        const team1OddsDiv = buildTeamOddsDiv('team1', team1Odds);
        const team2OddsDiv = buildTeamOddsDiv('team2', team2Odds);
        oddsDiv.appendChild(team1OddsDiv);
        oddsDiv.appendChild(team2OddsDiv);
    }
    rootDiv.getElementById;
}
function refreshOdds() {
    log('refreshOdds');
    let matchId = isMatchLobby();
    let rootDiv = document.getElementById("parasite-container").shadowRoot;
    let matchRoomDiv = rootDiv.getElementById("MATCHROOM-OVERVIEW");
    if (!matchRoomDiv) {
        log('notMatchRoom');
        return;
    }
    let infoDiv = matchRoomDiv.querySelector('[name="info"]');
    let statsTable = rootDiv.getElementById('nerdalyzer-table');
    /*
    let statusDiv = matchRoomDiv.firstChild.firstChild.childNodes[1].childNodes[1].firstChild
    let status = statusDiv.textContent as MatchStatus
    let roster1Div = matchRoomDiv.querySelector('[name="roster1"]');
    let roster2Div = matchRoomDiv.querySelector('[name="roster2"]');
    */
    if (!matchId) {
        log('notLobby');
        checkMatch();
        return;
    }
    else if (statsTable && statsTable.getAttribute('name') === matchId) {
        log('sameLobby');
        return;
    }
    else if (statsTable && statsTable.getAttribute('name') !== MATCH.id) {
        log('removeTable');
        infoDiv.removeChild(statsTable);
        clearInterval(MATCH_REFRESH);
        checkMatch();
        return;
    }
    log('appendTable');
    let odds = MATCH.odds();
    let [header, mapStats] = buildTable(odds);
    infoDiv.appendChild(document.createElement('br'));
    infoDiv.appendChild(header);
    infoDiv.appendChild(mapStats);
}
function isMatchLobby() {
    let match = window.location.href.match(REX_MATCH_URL);
    if (match) {
        return match.groups.matchId;
    }
    return null;
}
function checkMatch() {
    log('checkMatch');
    let matchId = isMatchLobby();
    if (matchId) {
        log(`matchId:${matchId}`);
        // get match details from api, display odds
        MATCH = new Match(matchId, refreshOdds);
    }
}
// on url change, check match
let url = location.href;
document.body.addEventListener('click', () => {
    requestAnimationFrame(() => {
        url !== location.href && setTimeout(checkMatch, 2000);
        url = location.href;
    });
}, true);
// on navigation, check match
window.addEventListener('popstate', function (event) {
    checkMatch();
});
// on load, check match
checkMatch();
