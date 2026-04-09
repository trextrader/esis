// mobile/src/services/pingServer.ts
// Runs a minimal HTTP/1.0 server on the victim's phone (port 8080).
// Helpers on the same WiFi open the link in any browser — no app required.
// React Native reads state directly; the server only exists for external helpers.

import TcpSocket from 'react-native-tcp-socket';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Helper {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  respondedAt: string;
}

export interface PingServerState {
  isRunning: boolean;
  port: number;
  victimLat: number;
  victimLng: number;
  victimNeeds: string;
  victimPriority: string;
  startedAt: string;
  helpers: Helper[];
}

// ── Singleton state (shared between server + React) ──────────────────────────

let _state: PingServerState = {
  isRunning: false, port: 8080,
  victimLat: 0, victimLng: 0,
  victimNeeds: '', victimPriority: 'high',
  startedAt: '', helpers: [],
};
let _server: ReturnType<typeof TcpSocket.createServer> | null = null;

export function getServerState(): PingServerState { return { ..._state }; }
export function getHelpers(): Helper[] { return [..._state.helpers]; }

export function updateVictimLocation(lat: number, lng: number): void {
  _state.victimLat = lat;
  _state.victimLng = lng;
}

// ── HTTP server ───────────────────────────────────────────────────────────────

function httpOk(contentType: string, body: string): Buffer {
  const bodyBuf = Buffer.from(body, 'utf8');
  const header  =
    `HTTP/1.0 200 OK\r\n` +
    `Content-Type: ${contentType}; charset=utf-8\r\n` +
    `Content-Length: ${bodyBuf.length}\r\n` +
    `Access-Control-Allow-Origin: *\r\n` +
    `Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n` +
    `Access-Control-Allow-Headers: Content-Type\r\n` +
    `Connection: close\r\n\r\n`;
  return Buffer.concat([Buffer.from(header), bodyBuf]);
}

function httpError(status: number, msg: string): Buffer {
  const body   = msg;
  const header = `HTTP/1.0 ${status} Error\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`;
  return Buffer.concat([Buffer.from(header), Buffer.from(body)]);
}

function handleRequest(raw: string): Buffer {
  const headerEnd = raw.indexOf('\r\n\r\n');
  if (headerEnd === -1) return httpError(400, 'Bad Request');

  const headers = raw.slice(0, headerEnd);
  const body    = raw.slice(headerEnd + 4);
  const firstLine = headers.split('\r\n')[0] ?? '';
  const [method, path] = firstLine.split(' ');

  // CORS preflight
  if (method === 'OPTIONS') {
    return Buffer.from(
      'HTTP/1.0 204 No Content\r\n' +
      'Access-Control-Allow-Origin: *\r\n' +
      'Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n' +
      'Access-Control-Allow-Headers: Content-Type\r\n' +
      'Connection: close\r\n\r\n'
    );
  }

  // Helper web page
  if (method === 'GET' && (path === '/' || path === '/ping')) {
    return httpOk('text/html', helperHtml());
  }

  // JSON status — polled by helpers every 3 seconds
  if (method === 'GET' && path === '/status') {
    return httpOk('application/json', JSON.stringify({
      victimLat:    _state.victimLat,
      victimLng:    _state.victimLng,
      victimNeeds:  _state.victimNeeds,
      victimPriority: _state.victimPriority,
      startedAt:    _state.startedAt,
      helpers:      _state.helpers,
    }));
  }

  // Helper responds
  if (method === 'POST' && path === '/respond') {
    try {
      const parsed = JSON.parse(body) as { id?: string; name?: string; lat?: number; lng?: number };
      const id     = parsed.id ?? `h_${Date.now()}`;
      const existing = _state.helpers.findIndex(h => h.id === id);
      const helper: Helper = {
        id,
        name:        parsed.name ?? 'Anonymous helper',
        lat:         parsed.lat  ?? null,
        lng:         parsed.lng  ?? null,
        respondedAt: new Date().toISOString(),
      };
      if (existing >= 0) {
        _state.helpers[existing] = helper;
      } else {
        _state.helpers.push(helper);
      }
    } catch { /* ignore malformed body */ }
    return httpOk('application/json', '{"ok":true}');
  }

  return httpError(404, 'Not found');
}

export function startPingServer(opts: {
  victimNeeds: string;
  victimPriority: string;
  initialLat: number;
  initialLng: number;
}): void {
  if (_state.isRunning) return;

  _state = {
    isRunning:      true,
    port:           8080,
    victimLat:      opts.initialLat,
    victimLng:      opts.initialLng,
    victimNeeds:    opts.victimNeeds,
    victimPriority: opts.victimPriority,
    startedAt:      new Date().toISOString(),
    helpers:        [],
  };

  _server = TcpSocket.createServer((socket) => {
    let buf = '';
    socket.on('data', (chunk) => {
      buf += typeof chunk === 'string' ? chunk : chunk.toString('utf8');

      const headerEnd = buf.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const headerSection = buf.slice(0, headerEnd);
      const firstLine     = headerSection.split('\r\n')[0] ?? '';
      const method        = firstLine.split(' ')[0] ?? '';

      if (method === 'GET' || method === 'OPTIONS') {
        socket.write(handleRequest(buf));
        socket.destroy();
        buf = '';
        return;
      }

      // POST: wait for full body via Content-Length
      const clMatch       = headerSection.match(/Content-Length:\s*(\d+)/i);
      const contentLength = clMatch ? parseInt(clMatch[1], 10) : 0;
      const body          = buf.slice(headerEnd + 4);
      if (body.length >= contentLength) {
        socket.write(handleRequest(buf));
        socket.destroy();
        buf = '';
      }
    });

    socket.on('error', () => socket.destroy());
  });

  (_server as any).listen({ port: 8080, host: '0.0.0.0' });
}

export function stopPingServer(): void {
  _server?.close?.();
  _server = null;
  _state  = { ..._state, isRunning: false, helpers: [] };
}

// ── Helper web page (served from victim's phone) ──────────────────────────────

function helperHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>ESIS — Someone Needs Help</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060D18;color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}
#banner{background:#EF4444;padding:16px;text-align:center}
#banner h1{font-size:20px;font-weight:800;letter-spacing:-0.5px}
#banner p{font-size:12px;margin-top:3px;opacity:.85}
#info{padding:14px 16px;background:#0D1B2E;border-bottom:1px solid #1E3A5F}
#needs{font-size:14px;line-height:1.6;margin-bottom:8px;color:#F8FAFC}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.high{background:#EF444433;color:#EF4444}.medium{background:#F59E0B33;color:#F59E0B}.low{background:#10B98133;color:#10B981}
#map{height:38vh;min-height:220px}
#helpers{padding:12px 16px;background:#0D1B2E;border-top:1px solid #1E3A5F}
#helpers h3{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#60A5FA;margin-bottom:8px;font-weight:700}
.helper-row{display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #1E3A5F22}
.hdot{width:10px;height:10px;background:#10B981;border-radius:50%;margin-right:10px;flex-shrink:0;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.hname{font-size:14px;flex:1;color:#F8FAFC}
.htime{font-size:11px;color:#475569}
#respond{padding:16px}
#respond input{width:100%;background:#0D1B2E;border:1px solid #1E3A5F;color:#F8FAFC;padding:12px;border-radius:8px;font-size:15px;margin-bottom:10px;outline:none}
#respond input::placeholder{color:#475569}
#rbtn{width:100%;background:#EF4444;color:#fff;font-size:16px;font-weight:700;padding:15px;border:none;border-radius:10px;cursor:pointer;letter-spacing:.3px}
#rbtn:disabled{opacity:.5}
#rdone{background:#061A0E;border:1px solid #10B98144;border-radius:10px;padding:14px;text-align:center;color:#10B981;font-weight:600;margin-top:10px;display:none;line-height:1.6}
#sbar{text-align:center;padding:8px;font-size:11px;color:#475569}
</style>
</head>
<body>
<div id="banner"><h1>🛟 ESIS — Someone Nearby Needs Help</h1><p id="bsub">Loading...</p></div>
<div id="info"><p id="needs">Loading case information...</p><span id="pbadge" class="badge"></span></div>
<div id="map"></div>
<div id="helpers"><h3>Helpers Responding (<span id="hcount">0</span>)</h3><div id="hlist"></div></div>
<div id="respond">
  <input id="nin" placeholder="Your name (optional)" maxlength="50">
  <button id="rbtn" onclick="respond()">I'm Coming to Help</button>
  <div id="rdone">✓ Response sent — they can see you're coming.<br><small style="color:#94A3B8;font-weight:400">Your location is being shared so they can find you.</small></div>
</div>
<div id="sbar">🔴 Live · Updates every 3 seconds</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map').setView([39.7392,-104.9903],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);
var vIcon=L.divIcon({html:'<div style="background:#EF4444;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px #EF4444bb"></div>',iconSize:[22,22],iconAnchor:[11,11]});
var hIcon=L.divIcon({html:'<div style="background:#10B981;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px #10B981bb"></div>',iconSize:[16,16],iconAnchor:[8,8]});
var vMarker=null,hMarkers={},responded=false,myLat=null,myLng=null;
var myId='h_'+Math.random().toString(36).slice(2,8);
if(navigator.geolocation){navigator.geolocation.watchPosition(function(p){myLat=p.coords.latitude;myLng=p.coords.longitude},null,{enableHighAccuracy:true});}
function updateUI(d){
  document.getElementById('bsub').textContent='Active since '+new Date(d.startedAt).toLocaleTimeString();
  document.getElementById('needs').textContent=d.victimNeeds||'Needs immediate help';
  var pb=document.getElementById('pbadge');
  pb.textContent=(d.victimPriority||'high').toUpperCase()+' PRIORITY';
  pb.className='badge '+(d.victimPriority||'high').toLowerCase();
  if(d.victimLat&&d.victimLng){
    if(!vMarker){vMarker=L.marker([d.victimLat,d.victimLng],{icon:vIcon}).addTo(map).bindPopup('Person who needs help');map.setView([d.victimLat,d.victimLng],15);}
    else{vMarker.setLatLng([d.victimLat,d.victimLng]);}
  }
  var hs=d.helpers||[];
  document.getElementById('hcount').textContent=hs.length;
  var el=document.getElementById('hlist');el.innerHTML='';
  hs.forEach(function(h){
    var row=document.createElement('div');row.className='helper-row';
    var t=new Date(h.respondedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    row.innerHTML='<div class="hdot"></div><span class="hname">'+(h.name||'Anonymous helper')+'</span><span class="htime">'+t+'</span>';
    el.appendChild(row);
    if(h.lat&&h.lng){
      if(hMarkers[h.id]){hMarkers[h.id].setLatLng([h.lat,h.lng]);}
      else{hMarkers[h.id]=L.marker([h.lat,h.lng],{icon:hIcon}).addTo(map).bindPopup(h.name||'Helper');}
    }
  });
}
function poll(){fetch('/status').then(function(r){return r.json();}).then(updateUI).catch(function(){});}
function respond(){
  if(responded)return;
  var name=document.getElementById('nin').value.trim()||'Anonymous';
  document.getElementById('rbtn').disabled=true;
  fetch('/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:myId,name:name,lat:myLat,lng:myLng})})
    .then(function(){responded=true;document.getElementById('rdone').style.display='block';document.getElementById('rbtn').textContent='✓ Responding';})
    .catch(function(){document.getElementById('rbtn').disabled=false;alert('Could not send — make sure you are on the same WiFi as the person who shared this link.');});
}
poll();setInterval(poll,3000);
</script>
</body>
</html>`;
}
