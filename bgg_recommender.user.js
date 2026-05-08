// ==UserScript==
// @name        boardgamegeek.com recommender
// @namespace   Violentmonkey Scripts
// @icon        https://cf.geekdo-static.com/icons/touch-icon180.png
// @version     0.1.0
// @match       https://boardgamegeek.com/boardgame/*
// @grant       GM_xmlhttpRequest
// @connect     bgg-recommender.15263748.xyz
// @author      https://github.com/FrederikBertelsen
// @description Inject recommendations from API into BGG game pages
// ==/UserScript==

(function() {
  'use strict';

  // Set this to your recommender API instance, e.g. 'https://example.com'.
  const API_BASE_URL = '';

  function getGameIdFromUrl() {
    const m = location.pathname.match(/\/boardgame\/(\d+)/);
    return m ? m[1] : null;
  }

  function createStyles() {
    const css = `
    .bgg-reco-wrap{border:1px solid #ddd;padding:12px;margin:12px 0;background:#fff}
    .bgg-reco-title{font-weight:700;margin-bottom:10px;font-size:16px}
    .bgg-reco-list{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;width:100%}
    .bgg-reco-card{width:100%;border:1px solid #eee;padding:12px;background:#fafafa;cursor:pointer;display:flex;gap:12px;align-items:flex-start;position:relative;color:inherit;text-decoration:none}
    .bgg-reco-card:link,.bgg-reco-card:visited,.bgg-reco-card:hover,.bgg-reco-card:active,.bgg-reco-card:focus{color:inherit;text-decoration:none}
    .bgg-reco-thumb-wrap{width:160px;height:120px;flex:0 0 160px;position:relative;border:1px solid #ddd;background:#fff;padding:4px;display:block}
    .bgg-reco-thumb{width:100%;height:100%;object-fit:contain;display:block}
    .bgg-reco-info{flex:1;min-width:0}
    .bgg-reco-name{font-size:17px;font-weight:700;margin:0 0 6px}
    .bgg-reco-meta{font-size:17px;color:#444;margin-bottom:6px;font-weight:600}
    .bgg-reco-small{font-size:16px;color:#666}
    .bgg-reco-players{color:#fff;background:none;padding:0;border-radius:0;display:block;font-weight:600;font-size:16px}
    .bgg-reco-desc{font-size:16px;color:#333;padding:14px 0}
    .bgg-reco-score{background:#f2f2f2;padding:3px 8px;border-radius:4px;margin-left:6px;font-weight:700}
    .bgg-reco-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .bgg-reco-tag{background:#eef2fa;padding:6px 10px;border-radius:14px;font-size:13px;color:#2b4d8a}
    .bgg-reco-stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
    .bgg-reco-stat{font-size:14px;color:#333}
    .bgg-reco-badge{position:absolute;top:10px;right:10px;color:#fff;padding:6px 10px;border-radius:14px;font-size:13px;font-weight:700;z-index:3;box-shadow:0 2px 6px rgba(0,0,0,0.12)}
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildCard(item) {
    const a = document.createElement('a');
    a.href = `https://boardgamegeek.com/boardgame/${item.id}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'bgg-reco-card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'bgg-reco-thumb-wrap';

    const img = document.createElement('img');
    img.className = 'bgg-reco-thumb';
    img.src = item.thumbnail || '';
    img.alt = item.name;

    const info = document.createElement('div');
    info.className = 'bgg-reco-info';

    const name = document.createElement('div');
    name.className = 'bgg-reco-name';
    name.textContent = `${item.name} ${item.year_published ? `(${item.year_published})` : ''}`;

    // Stats line: rating, weight (similarity shown in badge)
    const statsLine = document.createElement('div');
    statsLine.className = 'bgg-reco-meta';

    const ratingLabel = document.createElement('span');
    ratingLabel.textContent = 'Rating: ';
    const ratingValue = document.createElement('span');
    ratingValue.className = 'ng-binding';
    const rating = item.rating != null ? Number(item.rating) : null;
    ratingValue.textContent = rating != null ? `★ ${rating.toFixed(2)}` : 'No rating';
    if (rating != null && isFinite(rating)) {
      ratingValue.classList.add(`has-rating-${Math.round(rating)}`);
    }

    const weightLabel = document.createElement('span');
    weightLabel.textContent = ' · Weight: ';
    const weightValue = document.createElement('span');
    weightValue.className = 'ng-binding';
    const weight = item.weight != null ? Number(item.weight) : null;
    weightValue.textContent = weight != null ? weight.toFixed(2) : 'N/A';
    if (weight != null && isFinite(weight)) {
      if (weight <= 3) weightValue.classList.add('gameplay-weight-light');
      else if (weight > 3 && weight <= 4) weightValue.classList.add('gameplay-weight-medium');
      else if (weight > 4) weightValue.classList.add('gameplay-weight-heavy');
    }

    statsLine.appendChild(ratingLabel);
    statsLine.appendChild(ratingValue);
    statsLine.appendChild(weightLabel);
    statsLine.appendChild(weightValue);

    // Players / Time
    const players = document.createElement('div');
    players.className = 'bgg-reco-players';
    const minP = item.min_players != null ? item.min_players : '';
    const maxP = item.max_players != null ? item.max_players : '';
    const minT = item.min_playing_time != null ? item.min_playing_time : '';
    const maxT = item.max_playing_time != null ? item.max_playing_time : '';
    players.textContent = `Players: ${minP}${maxP ? '–' + maxP : ''} · Time: ${minT}${maxT ? '–' + maxT + ' min' : ''}`;
    players.style.color = '#fff';

    // Description
    const desc = document.createElement('div');
    desc.className = 'bgg-reco-desc';
    desc.textContent = item.short_description || '';

    // Ranks
    const ranksWrap = document.createElement('div');
    ranksWrap.className = 'bgg-reco-stats';
    if (Array.isArray(item.ranks) && item.ranks.length) {
      item.ranks.forEach(r => {
        const s = document.createElement('div');
        s.className = 'bgg-reco-stat';
        s.textContent = `${r.name} Rank: ${r.value}`;
        ranksWrap.appendChild(s);
      });
    }

    // Niches
    const nichesWrap = document.createElement('div');
    nichesWrap.className = 'bgg-reco-tags';
    if (Array.isArray(item.niches) && item.niches.length) {
      item.niches.slice(0,6).forEach(n => {
        const t = document.createElement('div');
        t.className = 'bgg-reco-tag';
        t.textContent = n;
        nichesWrap.appendChild(t);
      });
    }

    // place ranks above the name as requested
    if (ranksWrap.children.length) info.appendChild(ranksWrap);
    info.appendChild(name);
    info.appendChild(statsLine);
    info.appendChild(players);
    info.appendChild(desc);
    if (nichesWrap.children.length) info.appendChild(nichesWrap);

    // Similarity badge (inside thumbnail)
    if (item.score != null && isFinite(Number(item.score))) {
      const sim = document.createElement('div');
      sim.className = 'bgg-reco-badge';
      const percent = Math.round(Number(item.score) * 100);
      const badgeRating = Math.max(0, Math.min(10, Math.round(Number(item.score) * 10)));
      sim.classList.add(`has-rating-${badgeRating}`);
      sim.textContent = `${percent}%`;
      imgWrap.appendChild(sim);
    }

    imgWrap.appendChild(img);
    a.appendChild(imgWrap);
    a.appendChild(info);

    return a;
  }

  function renderRecommendations(parent, items) {
    if (!items || !items.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'bgg-reco-wrap';

    const title = document.createElement('div');
    title.className = 'bgg-reco-title';
    title.textContent = 'Similar Games (Custom API)';

    const list = document.createElement('div');
    list.className = 'bgg-reco-list';

    items.forEach(it => {
      const card = buildCard(it);
      list.appendChild(card);
    });

    wrap.appendChild(title);
    wrap.appendChild(list);

    // Attempt to insert between the two given ng-if elements
    const showAwards = parent.querySelector("[ng-if='geekitemctrl.showawards']");
    const expandDesc = parent.querySelector("[ng-if='geekitemctrl.expandabledescription']");

    if (expandDesc) {
      parent.insertBefore(wrap, expandDesc.nextSibling);
    } else if (showAwards && showAwards.nextSibling) {
      parent.insertBefore(wrap, showAwards.nextSibling);
    } else {
      parent.appendChild(wrap);
    }
  }

  function showError(parent, msg) {
    const e = document.createElement('div');
    e.style.color = 'red';
    e.style.margin = '8px 0';
    e.textContent = msg;
    parent.appendChild(e);
  }

  function fetchRecommendations(gameId, n = 10, parent) {
    const url = `${API_BASE_URL}/recommend/${encodeURIComponent(gameId)}?n=${encodeURIComponent(n)}`;
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      onload(res) {
        try {
          const data = JSON.parse(res.responseText);
          renderRecommendations(parent, data);
        } catch (err) {
          console.error('Failed parsing recommendations', err, res.responseText);
          showError(parent, 'Failed to load recommendations (parse error)');
        }
      },
      onerror(err) {
        console.error('Recommendation request failed', err);
        showError(parent, 'Failed to load recommendations (network error)');
      }
    });
  }

  function init() {
    createStyles();

    if (!API_BASE_URL || !API_BASE_URL.trim()) {
      alert('BGG Recommender: Please set API_BASE_URL at the top of the userscript.');
      return;
    }

    const gameId = getGameIdFromUrl();
    if (!gameId) return;
    const parent = document.querySelector('div.game-description');
    if (!parent) return;
    fetchRecommendations(gameId, 10, parent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
