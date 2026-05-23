function createProjectElement(project) {
  const el = document.createElement("div");
  el.className = "project-card fade-in";

  const hasImages = project.images && project.images.length > 0;

  let projectImageHTML = "";

  if (hasImages) {
    const slidesHTML = project.images
      .map((img, idx) => {
        return `
            <div class="project-image-slide ${idx === 0 ? "active" : ""}">
              <img src="${img}" alt="Project image ${idx + 1}" />
            </div>
          `;
      })
      .join("");

    const indicatorsHTML = project.images
      .map((_, idx) => {
        return `
            <div class="image-indicator ${idx === 0 ? "active" : ""}" data-index="${idx}"></div>
          `;
      })
      .join("");

    projectImageHTML = `
        <div class="project-image">
          <div class="project-image-carousel">
            ${slidesHTML}
          </div>

          ${
            project.images.length > 1
              ? `
            <div class="image-indicators">
              ${indicatorsHTML}
            </div>

            <button class="image-nav-button prev" data-action="prev">‹</button>
            <button class="image-nav-button next" data-action="next">›</button>
          `
              : ""
          }
        </div>
      `;
  } else {
    projectImageHTML = `
        <div class="project-image">
          <div class="project-icon" style="background: ${project.gradient};">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
            </svg>
          </div>
        </div>
      `;
  }

  const tagsHTML = project.tags
    .map((t) => {
      let cls = "tag";

      if (t === "C++") cls += " tag-lime";
      if (t === "Unity") cls += " tag-coral";

      return `<span class="${cls}">${t}</span>`;
    })
    .join("");

  el.innerHTML = `
      ${projectImageHTML}

      <div class="project-content">
        <h3 style="font-size: 20px; margin: 0 0 8px 0; font-weight: 600;">
          ${project.title}
        </h3>

        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          ${project.description}
        </p>

        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
          ${tagsHTML}
        </div>

        <a href="${project.link}" target="_blank" class="btn-primary">
          ${project.btnText}
        </a>
      </div>
    `;

  // Add carousel navigation logic
  if (hasImages && project.images.length > 1) {
    let currentImageIndex = 0;

    const updateCarousel = (index) => {
      const slides = el.querySelectorAll(".project-image-slide");
      const indicators = el.querySelectorAll(".image-indicator");

      slides.forEach((slide, idx) => {
        slide.classList.toggle("active", idx === index);
      });

      indicators.forEach((indicator, idx) => {
        indicator.classList.toggle("active", idx === index);
      });

      currentImageIndex = index;
    };

    const prevBtn = el.querySelector(".image-nav-button.prev");
    const nextBtn = el.querySelector(".image-nav-button.next");
    const indicators = el.querySelectorAll(".image-indicator");

    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const newIndex =
        (currentImageIndex - 1 + project.images.length) % project.images.length;

      updateCarousel(newIndex);
    });

    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const newIndex = (currentImageIndex + 1) % project.images.length;

      updateCarousel(newIndex);
    });

    indicators.forEach((indicator, idx) => {
      indicator.addEventListener("click", (e) => {
        e.stopPropagation();
        updateCarousel(idx);
      });
    });
  }

  if (typeof observer !== "undefined") {
    observer.observe(el);
  } else {
    el.classList.add("visible");
  }

  return el;
}
const PROJECTS_PER_LOAD = 3;

let allProjects = [];
let visibleProjects = PROJECTS_PER_LOAD;

function renderProjects() {
  const grid = document.getElementById("projects-grid");
  const toggleBtn = document.getElementById("projects-toggle-btn");

  grid.innerHTML = "";

  const projectsToRender = allProjects.slice(0, visibleProjects);

  projectsToRender.forEach((project, index) => {
    const el = createProjectElement(project);

    el.classList.add("project-card-entrance");
    el.classList.add(`delay-${(index % 3) + 1}`);

    grid.appendChild(el);
  });

  // Button logic
  if (visibleProjects >= allProjects.length) {
    toggleBtn.textContent = "Collapse";
  } else {
    toggleBtn.textContent = "Show More";
  }
}

async function initProjects() {
  try {
    const res = await fetch("/projects/data/projects.json");

    allProjects = await res.json();

    renderProjects();

    const toggleBtn = document.getElementById("projects-toggle-btn");

    toggleBtn.addEventListener("click", () => {
      if (visibleProjects >= allProjects.length) {
        visibleProjects = PROJECTS_PER_LOAD;

        renderProjects();

        document
          .getElementById("projects")
          ?.scrollIntoView({ behavior: "smooth" });

        return;
      }

      visibleProjects += PROJECTS_PER_LOAD;

      if (visibleProjects > allProjects.length) {
        visibleProjects = allProjects.length;
      }

      renderProjects();
    });
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

initProjects();
