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
      var fourCircleIds = {
        zhangyintao: true,
        luozhanglong: true,
        hemengxiong: true,
        zhangkundi: true,
        zhengye: true,
        weihuachi: true,
        zhouzhensheng: true,
        cuiqingyuan: true,
        zhaoyuzhen: true,
        shikexuan: true,
        chenxiufu: true,
        liugeping: true
      };
      var filteredNodes = data.nodes.filter(function(n) {
        if (chapterFilter === 'four-circles') {
          return !!fourCircleIds[n.id];
        }
        if (chapterFilter) {
          return n.id === 'zhangyintao' || (n.chapters && n.chapters.indexOf(chapterFilter) !== -1);
        }
        return true;
      });

      var nodeIds = {};
      filteredNodes.forEach(function(n) { nodeIds[n.id] = true; });

      var filteredLinks = data.links.filter(function(l) {
        if (chapterFilter === 'four-circles') {
          return l.source === 'zhangyintao' &&
            nodeIds[l.source] &&
            nodeIds[l.target];
        }
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
        var isVerticalLetter = conv.id !== 'yushude-guangzhou-1924' && msg.from !== 'zhangyintao';
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (msg.from === 'zhangyintao' ? 'from-self' : 'from-other');
        if (isVerticalLetter) bubble.className += ' letter-vertical';

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
  var clearBtn = document.getElementById('search-clear');
  var results = document.getElementById('search-results');
  if (!input || !btn || !results) return;

  fetch('data/keywords.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var presets = document.getElementById('keyword-presets');
      if (presets) {
        data.keywords
          .slice()
          .sort(function(a, b) {
            return b.occurrences.length - a.occurrences.length;
          })
          .forEach(function(kw) {
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'keyword-chip';
          chip.textContent = kw.display;
          chip.addEventListener('click', function() {
            input.value = kw.word;
            document.querySelectorAll('.keyword-chip.active').forEach(function(el) {
              el.classList.remove('active');
            });
            chip.classList.add('active');
            updateClearButton();
            doSearch();
          });
          presets.appendChild(chip);
        });
      }

      btn.addEventListener('click', doSearch);
      input.addEventListener('input', function() {
        document.querySelectorAll('.keyword-chip.active').forEach(function(el) {
          el.classList.remove('active');
        });
        updateClearButton();
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doSearch();
      });
      if (clearBtn) {
        clearBtn.addEventListener('click', function() {
          input.value = '';
          results.innerHTML = '';
          document.querySelectorAll('.keyword-chip.active').forEach(function(el) {
            el.classList.remove('active');
          });
          updateClearButton();
          input.focus();
        });
      }
      updateClearButton();

      function doSearch() {
        var query = input.value.trim();
        if (!query) return;
        results.innerHTML = '';
        updateClearButton();

        var diaryEntries = Array.prototype.slice.call(document.querySelectorAll('.diary-entry'));
        if (diaryEntries.length) {
          var diaryMatches = [];
          diaryEntries.forEach(function(entry) {
            var dateEl = entry.querySelector('.diary-entry-date');
            var text = entry.textContent.replace(/\s+/g, ' ').trim();
            var idx = text.indexOf(query);
            if (idx !== -1) {
              diaryMatches.push({
                entry: entry,
                date: (entry.dataset.diaryMonthLabel ? entry.dataset.diaryMonthLabel + ' ' : '') +
                  (entry.dataset.diaryLabel || (dateEl ? dateEl.textContent : '日记条目')),
                text: text,
                index: idx
              });
            }
          });

          if (diaryMatches.length === 0) {
            results.innerHTML = '<p style="color:var(--text-light);font-size:13px;">未找到"' + escapeHtml(query) + '"的相关记录</p>';
            return;
          }

          var diarySummary = document.createElement('p');
          diarySummary.style.cssText = 'color:var(--text-light);font-size:12px;margin-bottom:10px;font-family:var(--sans);';
          diarySummary.textContent = '在日记全文中找到 ' + diaryMatches.length + ' 条相关记录。';
          results.appendChild(diarySummary);

          diaryMatches.slice(0, 80).forEach(function(match) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'search-result-item';

            var dateDiv = document.createElement('div');
            dateDiv.className = 'sr-date';
            dateDiv.textContent = match.date;

            var ctxDiv = document.createElement('div');
            ctxDiv.className = 'sr-context';
            ctxDiv.innerHTML = makeSnippet(match.text, match.index, query);

            item.appendChild(dateDiv);
            item.appendChild(ctxDiv);
            item.addEventListener('click', function() {
              openDiaryAncestors(match.entry);
              match.entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
              match.entry.classList.add('diary-entry-focus');
              window.setTimeout(function() {
                match.entry.classList.remove('diary-entry-focus');
              }, 1400);
            });
            results.appendChild(item);
          });
          return;
        }

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

      function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function(ch) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
      }

      function makeSnippet(text, index, query) {
        var start = Math.max(0, index - 46);
        var end = Math.min(text.length, index + query.length + 70);
        var snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
        var safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escapeHtml(snippet).replace(new RegExp('(' + safeQuery + ')', 'g'), '<mark>$1</mark>');
      }

      function updateClearButton() {
        if (!clearBtn) return;
        var hasValue = input.value.trim().length > 0;
        clearBtn.classList.toggle('has-value', hasValue);
        clearBtn.disabled = !hasValue;
      }
    });
}

function initDiaryHierarchy() {
  var volumes = Array.prototype.slice.call(document.querySelectorAll('.diary-volume'));
  if (!volumes.length || document.querySelector('.diary-volume-fold')) return;

  var initialMonths = [
    { year: 1923, month: 8 },
    { year: 1923, month: 10 },
    { year: 1924, month: 2 },
    { year: 1924, month: 6 },
    { year: 1924, month: 8 }
  ];

  volumes.forEach(function(volume, index) {
    var title = volume.querySelector('.diary-volume-title');
    var note = volume.querySelector(':scope > .diary-source-note');
    splitEmbeddedDiaryEntries(volume);
    var entries = Array.prototype.slice.call(volume.querySelectorAll(':scope > .diary-entry'));
    if (!title || !entries.length) return;

    var fold = document.createElement('details');
    fold.className = 'diary-volume-fold';

    var summary = document.createElement('summary');
    summary.className = 'diary-volume-summary';

    var titleText = document.createElement('span');
    titleText.className = 'diary-volume-summary-title';
    titleText.textContent = title.textContent;
    summary.appendChild(titleText);

    if (note) {
      var noteText = document.createElement('span');
      noteText.className = 'diary-volume-summary-note';
      noteText.innerHTML = note.innerHTML;
      summary.appendChild(noteText);
    }

    var body = document.createElement('div');
    body.className = 'diary-volume-body';

    fold.appendChild(summary);
    fold.appendChild(body);
    volume.replaceWith(fold);

    var seed = initialMonths[index] || initialMonths[0];
    var currentYear = seed.year;
    var currentMonth = seed.month;
    var monthFolds = {};
    var preface = null;

    entries.forEach(function(entry) {
      var dateEl = entry.querySelector('.diary-entry-date');
      var rawLabel = dateEl ? dateEl.textContent.trim() : '日记条目';
      var cleanedLabel = cleanDiaryDateLabel(rawLabel);
      var explicitMonth = detectExplicitDiaryMonth(cleanedLabel);
      var label = normalizeDiaryDateLabel(cleanedLabel);
      entry.dataset.diaryLabel = label;
      var isMeta = isDiaryMetaEntry(label);
      styleDiaryParagraphs(entry);

      if (explicitMonth) {
        if (explicitMonth < currentMonth && currentMonth - explicitMonth >= 6) {
          currentYear += 1;
        }
        currentMonth = explicitMonth;
      }

      entry.dataset.diaryMonthLabel = currentYear + '年' + currentMonth + '月';

      if (isMeta) {
        if (!preface) {
          preface = document.createElement('div');
          preface.className = 'diary-preface';
          body.appendChild(preface);
        }
        preface.appendChild(createDiaryDayFold(entry, label, false));
        return;
      }

      var monthKey = currentYear + '-' + currentMonth;
      if (!monthFolds[monthKey]) {
        monthFolds[monthKey] = createDiaryMonthFold(currentYear + '年' + currentMonth + '月');
        body.appendChild(monthFolds[monthKey]);
      }
      monthFolds[monthKey].querySelector('.diary-month-body').appendChild(createDiaryDayFold(entry, label, true));
    });

    Object.keys(monthFolds).forEach(function(monthKey) {
      addDiaryMonthReturn(monthFolds[monthKey]);
    });
  });

  initDiaryBackToTop();
}

function splitEmbeddedDiaryEntries(volume) {
  var entries = Array.prototype.slice.call(volume.querySelectorAll(':scope > .diary-entry'));

  entries.forEach(function(entry) {
    var dateEl = entry.querySelector(':scope > .diary-entry-date');
    if (!dateEl) return;

    var currentArticle = entry;
    var child = dateEl.nextElementSibling;

    while (child) {
      var next = child.nextElementSibling;

      if (isEmbeddedDiaryDateParagraph(child)) {
        var newArticle = document.createElement('article');
        newArticle.className = 'diary-entry';

        var newDate = document.createElement('div');
        newDate.className = 'diary-entry-date';
        newDate.innerHTML = child.innerHTML;
        newArticle.appendChild(newDate);

        currentArticle.after(newArticle);
        child.remove();
        currentArticle = newArticle;
      } else if (currentArticle !== entry) {
        currentArticle.appendChild(child);
      }

      child = next;
    }
  });
}

function isEmbeddedDiaryDateParagraph(node) {
  if (!node || node.tagName !== 'P' || node.classList.contains('diary-note')) return false;
  var text = node.textContent.trim();
  return /^(?:【?[一二三四五六七八九十]{1,2}月】?)?[一二三四五六七八九十廿卅]{1,3}日(?!之)/.test(text);
}

function createDiaryMonthFold(label) {
  var fold = document.createElement('details');
  fold.className = 'diary-month-fold';

  var summary = document.createElement('summary');
  summary.className = 'diary-month-summary';
  summary.textContent = label;

  var body = document.createElement('div');
  body.className = 'diary-month-body';

  fold.appendChild(summary);
  fold.appendChild(body);
  return fold;
}

function detectExplicitDiaryMonth(label) {
  var monthMap = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
    '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12
  };
  var direct = label.match(/^【?([一二三四五六七八九十]{1,2})月/);
  if (direct && monthMap[direct[1]]) return monthMap[direct[1]];
  return null;
}

function isDiaryMetaEntry(label) {
  return label === '编者按与自序' || label.indexOf('《自序》') === 0;
}

function cleanDiaryDateLabel(label) {
  return label.replace(/^中华民国十二年八月\(系阳历\)起\s*·\s*/, '');
}

function normalizeDiaryDateLabel(label) {
  if (isDiaryMetaEntry(label)) return label;

  var dayMatch = label.match(/^(?:【?[一二三四五六七八九十]{1,2}月】?)?([一二三四五六七八九十廿卅]{1,3}日)(?:[（(][^）)]*[）)])*\s*(.*)$/);
  if (!dayMatch) return label;

  var day = dayMatch[1];
  var rest = (dayMatch[2] || '').trim();
  var weather = extractDiaryWeather(rest);

  return (day + (weather ? ' ' + weather : '')).trim();
}

function extractDiaryWeather(rest) {
  var weatherLead = /^(上午晴|下午晴|天晴|晴天|稍阴|天阴|阴雨|晴|阴|大雨|小雨|夜雨|雨|大风)/;
  var lead = rest.match(weatherLead);
  if (!lead) return '';

  var firstSentence = rest.split(/[。；]/)[0].trim();
  if (firstSentence && firstSentence.length <= 18) {
    return firstSentence;
  }
  return lead[1];
}

function createDiaryDayFold(entry, label, withMonthReturn) {
  var dayFold = document.createElement('details');
  dayFold.className = 'diary-day-fold';

  var daySummary = document.createElement('summary');
  daySummary.className = 'diary-day-summary';
  var labelText = document.createElement('span');
  labelText.className = 'diary-day-label';
  labelText.textContent = label;
  daySummary.appendChild(labelText);

  var hint = getDiaryEntryHint(entry);
  if (hint) {
    var hintText = document.createElement('span');
    hintText.className = 'diary-day-hint';
    hintText.textContent = hint;
    daySummary.appendChild(hintText);
  }

  var dayBody = document.createElement('div');
  dayBody.className = 'diary-day-body';
  dayBody.appendChild(entry);
  if (withMonthReturn) {
    dayBody.appendChild(createDiaryReturnButton('返回本月', function() {
      var monthFold = dayFold.closest('.diary-month-fold');
      dayFold.open = false;
      if (monthFold) {
        monthFold.querySelector('.diary-month-summary').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }));
  }

  dayFold.appendChild(daySummary);
  dayFold.appendChild(dayBody);
  return dayFold;
}

function getDiaryEntryHint(entry) {
  var text = entry.textContent || '';
  if (text.indexOf('五五代卖社') !== -1) return '五五书报代卖社';
  if (text.indexOf('学生消费合作社') !== -1 || text.indexOf('乡村图书馆') !== -1) return '乡村书铺';
  if (text.indexOf('此信，真我病之药石也') !== -1) return '罗章龙来信';
  if (text.indexOf('颇觉气象焕然一新') !== -1) return '张家口';
  if (text.indexOf('京绥总工会开会日期') !== -1) return '京绥总工会';
  if (text.indexOf('环龙路之国民党执行部') !== -1) return '上海赴考';
  if (text.indexOf('为主义预备而来') !== -1) return '为主义预备';
  if (text.indexOf('陈廉伯私运军火之事') !== -1) return '商团事变';
  if (text.indexOf('痛定思痛') !== -1) return '日记写法';
  return '';
}

function addDiaryMonthReturn(monthFold) {
  var monthBody = monthFold.querySelector('.diary-month-body');
  if (!monthBody || monthBody.querySelector(':scope > .diary-return-volume')) return;

  var action = createDiaryReturnButton('返回本连载', function() {
    var volumeFold = monthFold.closest('.diary-volume-fold');
    monthFold.open = false;
    if (volumeFold) {
      volumeFold.querySelector('.diary-volume-summary').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  action.classList.add('diary-return-volume');
  monthBody.appendChild(action);
}

function createDiaryReturnButton(label, onClick) {
  var wrap = document.createElement('div');
  wrap.className = 'diary-return-row';

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'diary-return-button';
  button.textContent = label;
  button.addEventListener('click', onClick);

  wrap.appendChild(button);
  return wrap;
}

function initDiaryBackToTop() {
  if (document.querySelector('.diary-back-top')) return;

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'diary-back-top';
  button.textContent = '回到顶部';
  button.setAttribute('aria-label', '回到页面顶部');
  button.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.body.appendChild(button);
  updateDiaryBackToTop(button);
  window.addEventListener('scroll', function() {
    updateDiaryBackToTop(button);
  }, { passive: true });
}

function updateDiaryBackToTop(button) {
  button.classList.toggle('is-visible', window.scrollY > 420);
}

function styleDiaryParagraphs(entry) {
  Array.prototype.forEach.call(entry.querySelectorAll('p'), function(paragraph) {
    var text = paragraph.textContent.trim();
    if (text.indexOf('——编者') === 0 || text.indexOf('《张隐韬烈士日记》') === 0) {
      paragraph.classList.add('diary-align-right');
    }
  });
}

function openDiaryAncestors(entry) {
  var detail = entry.closest('details');
  while (detail) {
    detail.open = true;
    detail = detail.parentElement ? detail.parentElement.closest('details') : null;
  }
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
    var requiredNarrativeHeight = narrative.getBoundingClientRect().height;
    sideNotes.forEach(function(note) {
      var naturalTop = parseFloat(note.dataset.naturalTop || '0');
      var adjustedTop = Math.max(naturalTop, lastBottom + 12);

      var content = note.querySelector('.micro-note-content');
      note.style.maxHeight = '';
      if (content) content.style.maxHeight = '';

      if (note.classList.contains('is-expanded')) {
        var toggle = note.querySelector('.micro-note-toggle');
        var toggleHeight = toggle ? toggle.getBoundingClientRect().height : 0;
        var narrativeHeight = narrative.getBoundingClientRect().height;
        var fullHeight = note.scrollHeight;
        var minExpandedHeight = toggleHeight + 72;
        var viewportLimit = Math.max(toggleHeight + 72, window.innerHeight - 132);
        var noteLimit = Math.min(fullHeight, viewportLimit);
        var latestTop = Math.max(0, narrativeHeight - noteLimit - 12);

        if (adjustedTop > latestTop) {
          adjustedTop = Math.max(lastBottom + 12, latestTop);
        }

        note.style.maxHeight = noteLimit + 'px';
        if (content) {
          content.style.maxHeight = Math.max(72, noteLimit - toggleHeight) + 'px';
        }
      }

      note.style.top = adjustedTop + 'px';
      lastBottom = adjustedTop + note.getBoundingClientRect().height;
      requiredNarrativeHeight = Math.max(requiredNarrativeHeight, lastBottom + 12);
    });

    if (Number.isFinite(requiredNarrativeHeight)) {
      narrative.style.minHeight = Math.ceil(requiredNarrativeHeight) + 'px';
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
    ['appendix-diary.html', '日记', '', 'appendix', [
      ['appendix-diary.html', '日记原文']
    ]],
    ['appendix-sources.html', '史料', '史料说明', 'appendix', [
      ['appendix-sources.html', '史料与方法']
    ]],
    ['about.html', '关于', '项目说明', 'appendix', [
      ['about.html', '创作者与许可']
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
