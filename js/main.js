function loadMap(routeId) {
  var container = document.getElementById('map');
  if (!container) return;

  var map = L.map('map').setView([36, 112], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 12
  }).addTo(map);

  fetch('data/locations.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var locMap = {};
      data.locations.forEach(function(loc) { locMap[loc.id] = loc; });

      data.routes.forEach(function(route) {
        if (routeId && route.id !== routeId) return;

        var latlngs = [];
        route.points.forEach(function(pid) {
          var loc = locMap[pid];
          if (loc) {
            latlngs.push([loc.lat, loc.lng]);
            L.marker([loc.lat, loc.lng])
              .addTo(map)
              .bindPopup('<b>' + loc.name + '</b><br>' + loc.description);
          }
        });

        if (latlngs.length > 1) {
          L.polyline(latlngs, {
            color: route.color || '#b22222',
            weight: 3,
            opacity: 0.8,
            dashArray: '8, 6'
          }).addTo(map);
        }

        if (latlngs.length > 0) {
          map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
        }
      });
    });
}

function loadNetwork(chapterFilter) {
  var container = document.getElementById('network-graph');
  if (!container) return;

  fetch('data/network.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var filteredNodes = data.nodes.filter(function(n) {
        if (chapterFilter) {
          return n.id === 'zhangyintao' || (n.chapters && n.chapters.indexOf(chapterFilter) !== -1);
        }
        return true;
      });

      var nodeIds = {};
      filteredNodes.forEach(function(n) { nodeIds[n.id] = true; });

      var filteredLinks = data.links.filter(function(l) {
        if (chapterFilter && l.chapter !== chapterFilter) return false;
        return nodeIds[l.source] && nodeIds[l.target];
      });

      var groupMap = {};
      data.groups.forEach(function(g) { groupMap[g.id] = g; });

      var visNodes = new vis.DataSet(filteredNodes.map(function(n) {
        var grp = groupMap[n.group] || {};
        var isSelf = n.id === 'zhangyintao';
        return {
          id: n.id,
          label: n.label || n.name,
          color: {
            background: isSelf ? '#8b0000' : (grp.color || '#444'),
            border: isSelf ? '#b22222' : '#222',
            highlight: { background: isSelf ? '#b22222' : (grp.color || '#666'), border: '#b22222' }
          },
          font: { color: isSelf ? '#f5f0e8' : '#d4cfc4', size: isSelf ? 16 : 13, face: 'Noto Sans SC' },
          size: isSelf ? 30 : 18,
          borderWidth: isSelf ? 3 : 1,
          title: n.relation || ''
        };
      }));

      var visEdges = new vis.DataSet(filteredLinks.map(function(l) {
        return {
          from: l.source,
          to: l.target,
          label: l.type,
          font: { color: '#a09a8c', size: 10, face: 'Noto Sans SC', strokeWidth: 0 },
          color: { color: '#444', highlight: '#b22222' },
          width: Math.min(l.strength, 3),
          arrows: 'to',
          smooth: { type: 'curvedCW', roundness: 0.2 }
        };
      }));

      var options = {
        physics: {
          solver: 'forceAtlas2Based',
          forceAtlas2Based: { gravitationalConstant: -80, centralGravity: 0.01, springLength: 120 },
          stabilization: { iterations: 100 }
        },
        interaction: { hover: true, tooltipDelay: 100 },
        nodes: { shape: 'dot' },
        edges: { smooth: { type: 'curvedCW', roundness: 0.2 } }
      };

      new vis.Network(container, { nodes: visNodes, edges: visEdges }, options);
    });
}

function loadChat(conversationId, containerId) {
  var container = containerId ? document.getElementById(containerId) : document.querySelector('.chat-container');
  if (!container) return;

  fetch('data/letters.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var conv = data.conversations.find(function(c) { return c.id === conversationId; });
      if (!conv) return;

      container.innerHTML = '';
      if (conv.title) {
        var title = document.createElement('div');
        title.style.cssText = 'text-align:center;font-size:13px;color:var(--text-light);margin-bottom:12px;font-family:var(--sans);letter-spacing:1px;';
        title.textContent = conv.title + ' · ' + conv.date_range;
        container.appendChild(title);
      }

      conv.messages.forEach(function(msg) {
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (msg.from === 'zhangyintao' ? 'from-self' : 'from-other');

        var nameEl = document.createElement('div');
        nameEl.className = 'chat-name';
        nameEl.textContent = msg.from_name;

        var textEl = document.createElement('div');
        textEl.textContent = msg.content;

        var dateEl = document.createElement('div');
        dateEl.className = 'chat-date';
        dateEl.textContent = msg.date;

        bubble.appendChild(nameEl);
        bubble.appendChild(textEl);
        bubble.appendChild(dateEl);
        container.appendChild(bubble);
      });
    });
}

function initSearch() {
  var input = document.getElementById('search-input');
  var btn = document.getElementById('search-btn');
  var results = document.getElementById('search-results');
  if (!input || !btn || !results) return;

  fetch('data/keywords.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      btn.addEventListener('click', doSearch);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doSearch();
      });

      function doSearch() {
        var query = input.value.trim();
        if (!query) return;
        results.innerHTML = '';

        var matches = data.keywords.filter(function(kw) {
          return kw.word.indexOf(query) !== -1 || kw.display.indexOf(query) !== -1;
        });

        if (matches.length === 0) {
          results.innerHTML = '<p style="color:var(--text-light);font-size:13px;">未找到"' + query + '"的相关记录</p>';
          return;
        }

        matches.forEach(function(kw) {
          kw.occurrences.forEach(function(occ) {
            var item = document.createElement('div');
            item.className = 'search-result-item';

            var dateDiv = document.createElement('div');
            dateDiv.className = 'sr-date';
            dateDiv.textContent = kw.display + ' · ' + occ.date;

            var ctxDiv = document.createElement('div');
            ctxDiv.className = 'sr-context';
            ctxDiv.innerHTML = occ.context.replace(
              new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'g'),
              '<mark>$1</mark>'
            );

            item.appendChild(dateDiv);
            item.appendChild(ctxDiv);
            results.appendChild(item);
          });
        });
      }
    });
}

function toggleSubsection(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
