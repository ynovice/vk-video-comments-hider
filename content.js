/*
 * Скрытие делает hide.css — здесь только:
 *   1) переключение класса vkch-hidden по настройке;
 *   2) пометка контейнера комментариев атрибутом data-vkch-comments,
 *      чтобы CSS знал, что скрывать.
 *
 * Пометка нужна потому, что разметка комментариев у ВК безликая: ни одного
 * класса со словом «comment», только хешированные vkit-XXXXXX, которые
 * меняются на каждой сборке. Единственный устойчивый якорь — тестид счётчика.
 */

const HIDDEN_CLASS = "vkch-hidden";
const MARK_ATTR = "data-vkch-comments";
const DEFAULT_HIDDEN = true;

function setHidden(hidden) {
  const root = document.documentElement;

  if (root) {
    root.classList.toggle(HIDDEN_CLASS, hidden);
    return;
  }

  // На document_start корень уже должен существовать, но на всякий случай
  // дожидаемся его появления, чтобы настройка не потерялась.
  document.addEventListener("DOMContentLoaded", () => setHidden(hidden), {
    once: true,
  });
}

/*
 * Помечает шапку блока комментариев.
 *
 * Селектором это не выразить: нужен БЛИЖАЙШИЙ предок счётчика, а :has() в CSS
 * матчит всех предков сразу, и вместе с правилом «скрыть всё следом» это снесло
 * бы полстраницы. Поэтому ближайшего предка ищем вручную, отталкиваясь от плеера.
 *
 * Ориентир — сам плеер: он лежит в том же контейнере, что и комментарии
 * (section.Page__container--*), но ВЫШЕ них. Значит, шапка — это верхний предок
 * счётчика, который плеер ещё не включает. Список комментариев и пагинация идут
 * следом за шапкой, их добирает CSS правилом [data-vkch-comments] ~ *.
 */
function markComments() {
  const count = document.querySelector('[data-testid="video-comments-count"]');

  // Либо комментариев на странице нет, либо шапка уже помечена.
  if (!count || count.closest(`[${MARK_ATTR}]`)) {
    return;
  }

  // Без плеера не с чем сравнивать: подъём уйдёт до самого верха и пометит
  // случайный контейнер. Лучше не трогать разметку вовсе.
  if (!document.querySelector("vk-video-player")) {
    return;
  }

  let header = count;
  while (
    header.parentElement &&
    !header.parentElement.querySelector("vk-video-player")
  ) {
    header = header.parentElement;
  }

  if (header === document.body || header === document.documentElement) {
    return;
  }

  header.setAttribute(MARK_ATTR, "");
}

let scheduled = false;

function scheduleMark() {
  if (scheduled) {
    return;
  }
  scheduled = true;

  // rAF-колбэк выполняется до отрисовки кадра, поэтому комментарии не успевают
  // мелькнуть. Заодно это не даёт дёргать querySelector на каждой мутации SPA.
  requestAnimationFrame(() => {
    scheduled = false;
    markComments();
  });
}

browser.storage.local
  .get({ hideComments: DEFAULT_HIDDEN })
  .then(({ hideComments }) => setHidden(hideComments));

// Тумблер в попапе должен срабатывать на уже открытой странице, без перезагрузки.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.hideComments) {
    return;
  }

  setHidden(changes.hideComments.newValue);
});

markComments();

// ВК — SPA: комментарии дорисовываются уже после загрузки, а при переходах
// внутри сайта разметка пересобирается заново. Поэтому помечаем не один раз,
// а на каждую мутацию — с троттлингом до кадра.
new MutationObserver(scheduleMark).observe(document, {
  childList: true,
  subtree: true,
});
