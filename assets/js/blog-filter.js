/*
 * Client-side filter for the /blogs/ article list.
 *
 * Progressive enhancement: the list is rendered server-side from
 * _data/blogs.yml, and the filter UI stays [hidden] until this script runs.
 * With JavaScript disabled the page is exactly the full list, as before.
 *
 * Matching is a plain substring test over each item's visible text, which
 * covers the title and its description. At ~40 items this is instant, so
 * there is no index to build and nothing to keep in sync.
 */
(function () {
  "use strict";

  var scope = document.querySelector(".page__content");
  if (!scope) return;

  var input = document.getElementById("blog-filter-input");
  var status = document.getElementById("blog-filter-status");
  if (!input || !status) return;

  function tocEntryFor(heading) {
    if (!heading.id) return null;
    var link = document.querySelector('.toc__menu a[href="#' + heading.id + '"]');
    return link ? link.parentNode : null;
  }

  /* Walk the rendered markup to rebuild the group -> section -> item tree.
     Only direct children of .page__content are inspected, so the sidebar
     TOC (nested inside an <aside>) is never mistaken for article items. */
  var groups = [];
  var group = null;
  var section = null;
  var lastRule = null;

  Array.prototype.forEach.call(scope.children, function (el) {
    switch (el.tagName) {
      case "HR":
        lastRule = el;
        break;
      case "H2":
        group = { heading: el, rule: lastRule, toc: tocEntryFor(el), sections: [] };
        groups.push(group);
        lastRule = null;
        break;
      case "H3":
        if (!group) break;
        section = { heading: el, toc: tocEntryFor(el), list: null, items: [] };
        group.sections.push(section);
        break;
      case "UL":
        if (!section || section.list) break;
        section.list = el;
        section.items = Array.prototype.map.call(el.children, function (li) {
          return {
            el: li,
            text: (li.textContent || "").toLowerCase().replace(/\s+/g, " ")
          };
        });
        break;
    }
  });

  var total = groups.reduce(function (n, g) {
    return n + g.sections.reduce(function (m, s) { return m + s.items.length; }, 0);
  }, 0);
  if (!total) return;

  function toggle(el, hidden) {
    if (el) el.hidden = hidden;
  }

  function apply() {
    var query = input.value.trim().toLowerCase();
    var shown = 0;

    groups.forEach(function (g) {
      var groupMatches = 0;

      g.sections.forEach(function (s) {
        var matches = 0;
        s.items.forEach(function (item) {
          var hit = !query || item.text.indexOf(query) !== -1;
          item.el.hidden = !hit;
          if (hit) matches++;
        });
        var empty = matches === 0;
        toggle(s.heading, empty);
        toggle(s.list, empty);
        toggle(s.toc, empty);
        groupMatches += matches;
      });

      var empty = groupMatches === 0;
      toggle(g.heading, empty);
      toggle(g.rule, empty);
      toggle(g.toc, empty);
      shown += groupMatches;
    });

    var typed = input.value.trim();
    if (!typed) {
      status.textContent = total + " articles";
    } else if (shown === 0) {
      status.textContent = 'No articles match “' + typed + '”';
    } else {
      status.textContent = shown + " of " + total + ' matching “' + typed + '”';
    }
  }

  input.addEventListener("input", apply);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Esc") {
      input.value = "";
      apply();
    }
  });

  /* Clicking a tag chip filters by it; clicking the active one clears. */
  scope.addEventListener("click", function (e) {
    var chip = e.target.closest && e.target.closest(".blog-tag");
    if (!chip) return;
    e.preventDefault();
    var tag = chip.textContent.trim();
    input.value = input.value.trim().toLowerCase() === tag.toLowerCase() ? "" : tag;
    apply();
    input.focus();
  });

  input.hidden = false;
  status.hidden = false;
  apply();
})();
