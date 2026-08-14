(function () {
  "use strict";

  const HUB_URL = "https://stevencowell.github.io/Main-Page/";
  const script = document.currentScript;
  const stylesheetUrl = script ? new URL("sister-site.css?v=20260814-agriculture-1", script.src).href : "";
  const courseRoot = script ? new URL("../", script.src) : new URL("./", location.href);

  if (stylesheetUrl && !document.querySelector('link[data-sister-site-styles]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = stylesheetUrl;
    stylesheet.dataset.sisterSiteStyles = "";
    document.head.append(stylesheet);
  }

  if (document.querySelector(".course-family-nav")) return;

  const path = location.pathname.toLowerCase();
  const rootPath = courseRoot.pathname.replace(/\/$/, "").toLowerCase();
  const isCourseHome = path === `${rootPath}/` || path === `${rootPath}/index.html`;
  const bar = document.createElement("nav");
  bar.className = "course-family-nav screen-only";
  bar.setAttribute("aria-label", "Year 8 Agriculture course navigation");

  const inner = document.createElement("div");
  inner.className = "course-family-nav__inner";

  const brand = document.createElement("a");
  brand.className = "course-family-nav__brand";
  brand.href = new URL("index.html", courseRoot).href;
  brand.innerHTML = '<span class="course-family-nav__mark" aria-hidden="true">8A</span><span>Year 8 Agriculture</span>';

  const links = document.createElement("div");
  links.className = "course-family-nav__links";
  const items = [
    { label: "Course", href: "index.html", current: isCourseHome },
    { label: "Modules", href: "index.html#pathway", current: path.endsWith("/module.html") },
    { label: "Busy Work", href: "busy-work/", current: path.includes("/busy-work/") },
    { label: "My folio", href: "folio.html", current: path.endsWith("/folio.html") },
    { label: "Main Menu", href: HUB_URL, external: true }
  ];

  items.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.external ? item.href : new URL(item.href, courseRoot).href;
    link.textContent = item.label;
    if (item.current) link.setAttribute("aria-current", "page");
    links.append(link);
  });

  inner.append(brand, links);
  bar.append(inner);
  document.body.prepend(bar);
  document.documentElement.classList.add("has-course-family-nav");
})();
