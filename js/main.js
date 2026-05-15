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
            highlight: { background: isSelf ? '#b22222' : (grp.color || '#666'), border: '#c9a84c' },
            hover: { background: isSelf ? '#b22222' : (grp.color || '#666'), border: '#c9a84c' }
          },
          font: { color: isSelf ? '#f5f0e8' : '#d4cfc4', size: isSelf ? 20 : 16, face: 'Noto Sans SC', strokeWidth: 3, strokeColor: '#0d0d0d' },
          size: isSelf ? 38 : 24,
          borderWidth: isSelf ? 3 : 1,
          borderWidthSelected: isSelf ? 5 : 3,
          title: n.relation || ''
        };
      }));

      var visEdges = new vis.DataSet(filteredLinks.map(function(l) {
        return {
          from: l.source,
          to: l.target,
          label: l.type,
          font: { color: '#a09a8c', size: 10, face: 'Noto Sans SC', strokeWidth: 0 },
          color: { color: '#444', highlight: '#c9a84c', hover: '#c9a84c' },
          selectionWidth: 2,
          hoverWidth: 2,
          width: Math.min(l.strength, 3),
          arrows: 'to',
          smooth: { type: 'curvedCW', roundness: 0.2 }
        };
      }));

      var options = {
        physics: {
          solver: 'forceAtlas2Based',
          forceAtlas2Based: { gravitationalConstant: -92, centralGravity: 0.012, springLength: 150 },
          stabilization: { iterations: 100 }
        },
        interaction: {
          hover: true,
          hoverConnectedEdges: true,
          selectConnectedEdges: true,
          tooltipDelay: 80,
          zoomView: false,
          keyboard: false
        },
        nodes: { shape: 'dot' },
        edges: { smooth: { type: 'curvedCW', roundness: 0.2 } }
      };

      var network = new vis.Network(container, { nodes: visNodes, edges: visEdges }, options);
      network.on('hoverNode', function(params) {
        container.classList.add('is-network-hovering');
        container.style.cursor = 'pointer';
      });
      network.on('blurNode', function() {
        container.classList.remove('is-network-hovering');
        container.style.cursor = '';
      });
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
        textEl.className = 'letter-text';
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
      var presets = document.getElementById('keyword-presets');
      if (presets) {
        data.keywords.forEach(function(kw) {
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'keyword-chip';
          chip.textContent = kw.display + ' (' + kw.occurrences.length + ')';
          chip.style.fontSize = Math.min(22, 12 + kw.occurrences.length * 2) + 'px';
          chip.addEventListener('click', function() {
            input.value = kw.word;
            document.querySelectorAll('.keyword-chip.active').forEach(function(el) {
              el.classList.remove('active');
            });
            chip.classList.add('active');
            doSearch();
          });
          presets.appendChild(chip);
        });
      }

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

        var total = matches.reduce(function(sum, kw) {
          return sum + kw.occurrences.length;
        }, 0);
        var summary = document.createElement('p');
        summary.style.cssText = 'color:var(--text-light);font-size:12px;margin-bottom:10px;font-family:var(--sans);';
        summary.textContent = '找到 ' + total + ' 条相关记录。';
        results.appendChild(summary);

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

function findPreviousNoteAnchor(note) {
  var node = note.previousElementSibling;
  var fallback = null;
  while (node) {
    if (node.classList && node.classList.contains('micro-note')) {
      node = node.previousElementSibling;
      continue;
    }
    if (node.classList && node.classList.contains('note-anchor')) return node;
    if (node.querySelectorAll) {
      var anchors = node.querySelectorAll('.note-anchor');
      if (anchors.length) return anchors[anchors.length - 1];
    }
    if (!fallback) fallback = node;
    node = node.previousElementSibling;
  }
  return fallback;
}

function alignMarginalNotes() {
  var wideLayout = window.matchMedia('(min-width: 1000px)').matches;
  var notes = Array.prototype.slice.call(document.querySelectorAll('.micro-note.is-collapsible'));
  document.querySelectorAll('.narrative').forEach(function(narrative) {
    narrative.style.minHeight = '';
  });

  notes.forEach(function(note) {
    note.style.top = '';
    note.dataset.naturalTop = '';
    if (!wideLayout) return;

    var narrative = note.closest('.narrative');
    var anchor = findPreviousNoteAnchor(note);
    if (!narrative || !anchor) return;

    var narrativeBox = narrative.getBoundingClientRect();
    var anchorBox = anchor.getBoundingClientRect();
    var top = anchorBox.top - narrativeBox.top + narrative.scrollTop;
    var naturalTop = Math.max(0, top);
    note.dataset.naturalTop = naturalTop;
    note.style.top = naturalTop + 'px';
  });

  if (!wideLayout) return;

  document.querySelectorAll('.narrative').forEach(function(narrative) {
    var sideNotes = Array.prototype.slice.call(narrative.querySelectorAll('.micro-note.is-collapsible'));
    sideNotes.sort(function(a, b) {
      return parseFloat(a.dataset.naturalTop || '0') - parseFloat(b.dataset.naturalTop || '0');
    });

    var lastBottom = -Infinity;
    sideNotes.forEach(function(note) {
      var naturalTop = parseFloat(note.dataset.naturalTop || '0');
      var adjustedTop = Math.max(naturalTop, lastBottom + 12);
      note.style.top = adjustedTop + 'px';
      lastBottom = adjustedTop + note.getBoundingClientRect().height;
    });

    if (Number.isFinite(lastBottom)) {
      narrative.style.minHeight = Math.ceil(lastBottom + 28) + 'px';
    }
  });
}

function collapseNote(note) {
  if (!note || !note.classList.contains('is-expanded')) return;
  var toggle = note.querySelector('.micro-note-toggle');
  var content = note.querySelector('.micro-note-content');
  note.classList.remove('is-expanded');
  note.classList.add('is-collapsed');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  if (content) content.hidden = true;
  setLinkedAnchorActive(note, false);
}

function getMicroNoteType(labelText) {
  if (labelText.indexOf('历史背景') !== -1) return 'background';
  if (labelText.indexOf('史料辨析') !== -1 || labelText.indexOf('史料旁注') !== -1) return 'source';
  if (labelText.indexOf('空间旁注') !== -1) return 'space';
  if (labelText.indexOf('微观') !== -1 || labelText.indexOf('Deep') !== -1 || labelText.indexOf('DEEP') !== -1) return 'deep';
  return 'analysis';
}

function linkNoteToAnchor(note, noteType, idx) {
  var anchor = null;
  if (note.dataset.anchorTarget) {
    anchor = document.getElementById(note.dataset.anchorTarget);
  }
  if (!anchor) anchor = findPreviousNoteAnchor(note);
  if (!anchor || !anchor.classList || !anchor.classList.contains('note-anchor')) return;
  if (!anchor.id) anchor.id = 'note-anchor-' + idx + '-' + Math.random().toString(36).slice(2, 7);
  anchor.dataset.noteType = anchor.dataset.noteType || noteType;
  note.dataset.anchorId = anchor.id;
}

function setLinkedAnchorActive(note, active) {
  if (!note || !note.dataset.anchorId) return;
  var anchor = document.getElementById(note.dataset.anchorId);
  if (!anchor) return;
  anchor.classList.toggle('is-linked-active', active);
}

function initCollapsibleNotes() {
  var notes = Array.prototype.slice.call(document.querySelectorAll('.micro-note'));

  notes.forEach(function(note, idx) {
    if (note.dataset.collapsibleReady === 'true') return;

    var directChildren = Array.prototype.slice.call(note.children);
    var labelEl = directChildren.find(function(child) {
      return child.classList && child.classList.contains('micro-label');
    });
    var titleEl = directChildren.find(function(child) {
      return child.tagName && child.tagName.toLowerCase() === 'h3';
    });
    if (!titleEl) return;

    var labelText = labelEl ? labelEl.textContent.trim() : (note.classList.contains('deep-dive') ? '微观史' : '辅助说明');
    var titleText = titleEl.textContent.trim();
    var noteType = getMicroNoteType(labelText);
    var contentId = 'micro-note-content-' + idx + '-' + Math.random().toString(36).slice(2, 7);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'micro-note-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', contentId);
    toggle.innerHTML =
      '<span>' +
        '<span class="micro-note-type">' + labelText + '</span>' +
        '<span class="micro-note-title">' + titleText + '</span>' +
      '</span>' +
      '<span class="micro-note-chevron" aria-hidden="true">›</span>';

    var content = document.createElement('div');
    content.className = 'micro-note-content';
    content.id = contentId;
    content.hidden = true;

    Array.prototype.slice.call(note.childNodes).forEach(function(child) {
      if (child === labelEl || child === titleEl) {
        note.removeChild(child);
        return;
      }
      content.appendChild(child);
    });

    note.dataset.noteType = noteType;
    note.dataset.collapsibleReady = 'true';
    linkNoteToAnchor(note, noteType, idx);
    note.classList.add('is-collapsible', 'is-collapsed');
    note.appendChild(toggle);
    note.appendChild(content);

    toggle.addEventListener('click', function() {
      var willExpand = !note.classList.contains('is-expanded');
      if (willExpand) {
        Array.prototype.slice.call(document.querySelectorAll('.micro-note.is-expanded')).forEach(function(openNote) {
          if (openNote !== note) collapseNote(openNote);
        });
      }
      var expanded = willExpand;
      note.classList.toggle('is-expanded', expanded);
      note.classList.toggle('is-collapsed', !expanded);
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      content.hidden = !expanded;
      setLinkedAnchorActive(note, expanded);
      window.setTimeout(alignMarginalNotes, 40);
    });
  });
}

function ensureRouteMapContainers() {
  ['map', 'map-2', 'map-3', 'map-gz'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;

    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    var expectedHeight = isMobile ? '300px' : '400px';
    el.style.minHeight = expectedHeight;

    if (el.getBoundingClientRect().height < 80) {
      el.style.height = expectedHeight;
    }
  });
}

function initSideRail() {
  if (document.body.classList.contains('home-page')) return;
  if (document.querySelector('.side-rail')) return;

  var links = [
    ['introduction.html', '引言', '1902—1918', 'story', [
      ['introduction.html#s0-1', '唐家务村']
    ]],
    ['chapter1.html', '破壁', '1919—1922', 'story', [
      ['chapter1.html#s1-1', '天津：被动员'],
      ['chapter1.html#s1-2', '工运：升级']
    ]],
    ['chapter2.html', '狂飙', '1922—1924春', 'story', [
      ['chapter2.html#s2-1', '乡间：他看到了什么'],
      ['chapter2.html#s2-2', '北上奔走'],
      ['chapter2.html#s2-3', '南下黄埔']
    ]],
    ['chapter3.html', '觉醒', '1924.3—1924.9', 'story', [
      ['chapter3.html#s3-1', '上海等考'],
      ['chapter3.html#s3-2', '黄埔学习'],
      ['chapter3.html#s3-3', '商团事变']
    ]],
    ['chapter4.html', '燎原', '1925—1926', 'story', [
      ['chapter4.html#s4-1', '从军校到河南'],
      ['chapter4.html#s4-2', '农民自卫军'],
      ['chapter4.html#s4-3', '为什么牺牲']
    ]],
    ['appendix-diary.html', '日记', '日记原文', 'appendix', [
      ['appendix-diary.html', '日记摘录']
    ]],
    ['appendix-sources.html', '史料', '史料说明', 'appendix', [
      ['appendix-sources.html', '史料与方法']
    ]]
  ];
  var current = window.location.pathname.split('/').pop() || 'index.html';

  var rail = document.createElement('aside');
  rail.className = 'side-rail';
  rail.setAttribute('aria-label', '章节快速导航');

  links.forEach(function(item) {
    var group = document.createElement('div');
    group.className = 'side-rail-item';
    if (item[3] === 'appendix') group.classList.add('side-rail-appendix');

    var main = document.createElement('a');
    main.className = 'side-rail-main';
    main.href = item[0];
    if (current === item[0]) main.classList.add('active');

    var title = document.createElement('span');
    title.className = 'side-rail-title';
    title.textContent = item[1];

    var meta = document.createElement('span');
    meta.className = 'side-rail-meta';
    meta.textContent = item[2];

    main.appendChild(title);
    main.appendChild(meta);
    group.appendChild(main);

    if (item[4] && item[4].length) {
      var submenu = document.createElement('div');
      submenu.className = 'side-rail-submenu';
      item[4].forEach(function(child) {
        var childLink = document.createElement('a');
        childLink.href = child[0];
        childLink.textContent = child[1];
        submenu.appendChild(childLink);
      });
      group.appendChild(submenu);
    }

    rail.appendChild(group);
  });

  document.body.appendChild(rail);
}

function initPageTransitions() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var prefetched = {};

  function getInternalPageLink(target) {
    var link = target && target.closest ? target.closest('a[href]') : null;
    if (!link) return null;
    if (link.target && link.target !== '_self') return null;
    if (link.hasAttribute('download')) return null;

    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (err) {
      return null;
    }

    if (url.origin !== window.location.origin) return null;
    if (!(/\.html$/.test(url.pathname) || /\/$/.test(url.pathname))) return null;
    return { link: link, url: url };
  }

  document.addEventListener('mouseover', function(e) {
    var item = getInternalPageLink(e.target);
    if (!item) return;
    if (prefetched[item.url.href]) return;
    prefetched[item.url.href] = true;
    var hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = item.url.href;
    document.head.appendChild(hint);
  });

  document.addEventListener('click', function(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var item = getInternalPageLink(e.target);
    if (!item) return;

    var samePath = item.url.pathname === window.location.pathname && item.url.search === window.location.search;
    if (samePath && item.url.hash) return;

    e.preventDefault();
    document.body.classList.add('is-page-leaving');
    window.setTimeout(function() {
      window.location.href = item.url.href;
    }, 115);
  });
}

function initHomeScrollEntry() {
  if (!document.body.classList.contains('home-page')) return;

  var isNavigating = false;
  var touchStartY = null;

  function goIntro() {
    if (isNavigating) return;
    isNavigating = true;
    document.body.classList.add('is-page-leaving');
    window.setTimeout(function() {
      window.location.href = 'introduction.html';
    }, 115);
  }

  window.addEventListener('wheel', function(e) {
    if (e.deltaY > 18) {
      e.preventDefault();
      goIntro();
    }
  }, { passive: false });

  window.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (touchStartY === null || !e.touches || !e.touches.length) return;
    var delta = touchStartY - e.touches[0].clientY;
    if (delta > 28) {
      e.preventDefault();
      goIntro();
    }
  }, { passive: false });
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('src-warn')) {
    e.target.classList.toggle('show-tip');
    return;
  }
  document.querySelectorAll('.src-warn.show-tip').forEach(function(el) {
    el.classList.remove('show-tip');
  });
});

document.addEventListener('DOMContentLoaded', function() {
  initPageTransitions();
  initHomeScrollEntry();
  initSideRail();
  initCollapsibleNotes();
  ensureRouteMapContainers();
  alignMarginalNotes();
  window.setTimeout(alignMarginalNotes, 80);
  window.setTimeout(alignMarginalNotes, 300);
});

window.addEventListener('load', function() {
  initCollapsibleNotes();
  ensureRouteMapContainers();
  alignMarginalNotes();
});

var marginalResizeTimer;
window.addEventListener('resize', function() {
  window.clearTimeout(marginalResizeTimer);
  marginalResizeTimer = window.setTimeout(function() {
    ensureRouteMapContainers();
    alignMarginalNotes();
  }, 120);
});

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(alignMarginalNotes);
}
