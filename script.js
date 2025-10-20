class EnglishClassPlanner {
  constructor() {
    this.classes = this.loadClasses();
    this.courses = this.loadCourses();
    this.fileStorage = this.loadFileStorage();
    this.homeworkResources = { files: [], links: [] };
    this.homeworkQuillEditor = null;
    this.currentCourseId = null;
    this.isEditing = false;
    this.editingClassId = null;
    this.initializeEventListeners();
    this.renderClasses();
    this.setTodayAsDefault();
    this.addInitialActivity();
    this.showStorageInfo();
    this.handleSharedClass();

    // Initialize rich text editors after DOM is ready
    setTimeout(() => {
      this.initializeHomeworkEditor();
    }, 500);
  }

  formatClassDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();

    // Función para agregar el sufijo ordinal
    const getOrdinalSuffix = (num) => {
      const j = num % 10;
      const k = num % 100;
      if (j === 1 && k !== 11) {
        return num + "st";
      }
      if (j === 2 && k !== 12) {
        return num + "nd";
      }
      if (j === 3 && k !== 13) {
        return num + "rd";
      }
      return num + "th";
    };

    const dayWithSuffix = getOrdinalSuffix(day);
    return `Today is ${month} ${dayWithSuffix}`;
  }

  showStorageInfo() {
    const classesSize = JSON.stringify(this.classes).length;
    const filesSize = JSON.stringify(
      Object.fromEntries(this.fileStorage)
    ).length;
    const totalSize = classesSize + filesSize;

    console.log("📊 Información de almacenamiento:");
    console.log(`- Clases: ${(classesSize / 1024).toFixed(2)} KB`);
    console.log(`- Archivos: ${(filesSize / 1024).toFixed(2)} KB`);
    console.log(`- Total: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`- Clases guardadas: ${this.classes.length}`);
    console.log(`- Archivos guardados: ${this.fileStorage.size}`);

    const classCountEl = document.getElementById("classCount");
    const fileCountEl = document.getElementById("fileCount");
    const storageSizeEl = document.getElementById("storageSize");

    if (classCountEl) classCountEl.textContent = this.classes.length;
    if (fileCountEl) fileCountEl.textContent = this.fileStorage.size;
    if (storageSizeEl)
      storageSizeEl.textContent = `${(totalSize / 1024).toFixed(2)} KB`;
  }

  exportData() {
    const data = {
      classes: this.classes,
      courses: this.courses, // <- AGREGAR ESTA LÍNEA
      files: Object.fromEntries(this.fileStorage),
      exportDate: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `english-classes-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification("Datos exportados exitosamente", "success");
  }

  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Importar cursos si existen en el archivo
        if (data.courses && Array.isArray(data.courses)) {
          this.courses = data.courses;
          this.saveCourses();
        }

        if (data.classes && Array.isArray(data.classes)) {
          this.classes = data.classes.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          this.saveClasses();
        }

        if (data.files && typeof data.files === "object") {
          this.fileStorage = new Map(Object.entries(data.files));
          this.saveFileStorage();
        }

        this.renderClasses();

        // Actualizar los selectores de cursos
        if (typeof updateCourseSelectOptions === "function") {
          updateCourseSelectOptions();
        }
        if (typeof renderCoursesList === "function") {
          renderCoursesList();
        }

        this.showNotification("Datos importados exitosamente", "success");
        this.showStorageInfo();
      } catch (error) {
        this.showNotification(
          "❌ Error al importar datos: archivo inválido",
          "error"
        );
        console.error("Import error:", error);
      }
    };

    reader.readAsText(file);
  }

  clearAllData() {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar TODOS los datos? Esta acción no se puede deshacer.\n\nSe eliminarán:\n• Todos los cursos\n• Todas las clases\n• Todos los archivos"
      )
    ) {
      this.fileStorage.clear();
      this.classes = [];
      this.courses = []; // <- AGREGAR ESTA LÍNEA
      this.saveClasses();
      this.saveCourses(); // <- AGREGAR ESTA LÍNEA
      this.saveFileStorage();
      this.renderClasses();

      // Actualizar la interfaz
      if (typeof renderCoursesList === "function") {
        renderCoursesList();
      }
      if (typeof updateCourseSelectOptions === "function") {
        updateCourseSelectOptions();
      }

      this.showStorageInfo();
      this.showNotification("Todos los datos han sido eliminados", "warning");
    }
  }

  loadClasses() {
    const stored = JSON.parse(localStorage.getItem("englishClasses") || "[]");
    return stored.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  loadFileStorage() {
    const storedFiles = JSON.parse(
      localStorage.getItem("englishClassFiles") || "{}"
    );
    const fileMap = new Map();

    Object.keys(storedFiles).forEach((key) => {
      fileMap.set(key, storedFiles[key]);
    });

    return fileMap;
  }

  saveClasses() {
    localStorage.setItem("englishClasses", JSON.stringify(this.classes));
  }

  saveFileStorage() {
    const fileObject = {};
    this.fileStorage.forEach((value, key) => {
      fileObject[key] = value;
    });
    localStorage.setItem("englishClassFiles", JSON.stringify(fileObject));
  }

  loadCourses() {
    const stored = JSON.parse(localStorage.getItem("englishCourses") || "[]");
    return stored.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveCourses() {
    localStorage.setItem("englishCourses", JSON.stringify(this.courses));
  }

  setTodayAsDefault() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("classDate").value = today;
  }

  addInitialActivity() {
    if (document.getElementById("activitiesList").children.length === 0) {
      this.addActivityElement();
    }
  }

  initializeEventListeners() {
    document.getElementById("classForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addClass();
    });

    // document.getElementById("searchBox").addEventListener("input", (e) => {
    //   this.filterClasses(e.target.value);
    // });

    document.getElementById("fileModal").addEventListener("click", (e) => {
      if (e.target.id === "fileModal") {
        this.closeModal();
      }
    });

    document
      .getElementById("classDetailModal")
      .addEventListener("click", (e) => {
        if (e.target.id === "classDetailModal") {
          this.closeClassDetailModal();
        }
      });

    // Setup homework drag and drop
    this.setupHomeworkDragAndDrop();
  }

  setupHomeworkDragAndDrop() {
    const homeworkUploadArea = document.querySelector(
      "#homeworkResourcesSection .file-upload-area"
    );
    if (homeworkUploadArea) {
      this.setupDragAndDropForElement(homeworkUploadArea, "homework");
    }
  }

  setupDragAndDropForElement(uploadArea, type = "activity") {
    const events = ["dragenter", "dragover", "dragleave", "drop"];

    events.forEach((eventName) => {
      uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove("dragover");
      });
    });

    uploadArea.addEventListener("drop", (e) => {
      const files = Array.from(e.dataTransfer.files);

      if (type === "homework") {
        files.forEach((file) => {
          this.handleHomeworkFileUpload(file);
        });
      } else {
        const activityElement = uploadArea.closest(".activity-item");
        files.forEach((file) => {
          this.handleFileUpload(file, activityElement);
        });
      }
    });
  }

  generateFileId() {
    return "file_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  handleFileUpload(file, activityElement) {
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      this.showNotification(
        "El archivo es demasiado grande (máx. 10MB)",
        "warning"
      );
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      this.showNotification("Tipo de archivo no permitido", "warning");
      return;
    }

    const fileId = this.generateFileId();
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileData = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result,
      };

      this.fileStorage.set(fileId, fileData);
      this.saveFileStorage();
      this.addFileToActivity(activityElement, fileData);
      this.showNotification("Archivo subido exitosamente", "success");
    };

    reader.readAsDataURL(file);
  }

  handleHomeworkFileUpload(file) {
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      this.showNotification(
        "El archivo es demasiado grande (máx. 10MB)",
        "warning"
      );
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      this.showNotification("Tipo de archivo no permitido", "warning");
      return;
    }

    const fileId = this.generateFileId();
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileData = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result,
      };

      this.fileStorage.set(fileId, fileData);
      this.saveFileStorage();
      this.addFileToHomework(fileData);
      this.showNotification("Archivo subido exitosamente", "success");
    };

    reader.readAsDataURL(file);
  }

  addFileToActivity(activityElement, fileData) {
    const uploadedFiles = activityElement.querySelector(".uploaded-files");
    const fileItem = this.createDraggableFileItem(fileData);
    uploadedFiles.appendChild(fileItem);
  }

  addFileToHomework(fileData) {
    const uploadedFiles = document.getElementById("homeworkUploadedFiles");
    const fileItem = this.createDraggableFileItem(fileData, "homework");
    uploadedFiles.appendChild(fileItem);

    this.homeworkResources.files.push({
      id: fileData.id,
      name: fileData.name,
      type: fileData.type,
      size: fileData.size,
    });
  }

  createDraggableFileItem(fileData, type = "activity") {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item draggable";
    fileItem.dataset.fileId = fileData.id;
    fileItem.draggable = true;

    const fileIcon = this.getFileIcon(fileData.type);
    const fileSize = this.formatFileSize(fileData.size);

    fileItem.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="file-info">
                <div class="file-details">
                    <span class="file-name">${fileData.name}</span>
                    <span class="file-size">${fileSize}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-preview-btn" onclick="previewFile('${
                  fileData.id
                }')" title="Ver archivo"></button>
                <button class="file-remove-btn" onclick="${
                  type === "homework" ? "removeHomeworkFile" : "removeFile"
                }(this, '${fileData.id}')" title="Eliminar">🗑️</button>
            </div>
        `;

    this.makeDraggable(fileItem, type);
    return fileItem;
  }

  makeDraggable(element, type) {
    element.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", element.dataset.fileId);
      element.classList.add("dragging");
    });

    element.addEventListener("dragend", () => {
      element.classList.remove("dragging");
    });

    const container = element.closest(".uploaded-files");
    if (container) {
      this.makeSortable(container, type);
    }
  }

  makeSortable(container, type) {
    if (container.sortableInitialized) return;
    container.sortableInitialized = true;

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = container.querySelector(".dragging");
      const siblings = [
        ...container.querySelectorAll(".file-item:not(.dragging)"),
      ];

      const nextSibling = siblings.find((sibling) => {
        return (
          e.clientY <=
          sibling.getBoundingClientRect().top +
            sibling.getBoundingClientRect().height / 2
        );
      });

      container.insertBefore(dragging, nextSibling);
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      if (type === "homework") {
        this.updateHomeworkResourcesOrder();
      }
    });
  }

  makeActivityDraggable(activityElement) {
    activityElement.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", activityElement.dataset.activityId);
      activityElement.classList.add("dragging-activity");
    });

    activityElement.addEventListener("dragend", () => {
      activityElement.classList.remove("dragging-activity");
    });
  }

  makeActivitiesListSortable() {
    const activitiesList = document.getElementById("activitiesList");
    if (activitiesList.sortableInitialized) return;
    activitiesList.sortableInitialized = true;

    activitiesList.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = activitiesList.querySelector(".dragging-activity");
      if (!dragging) return;

      const siblings = [
        ...activitiesList.querySelectorAll(
          ".activity-item:not(.dragging-activity)"
        ),
      ];

      const nextSibling = siblings.find((sibling) => {
        const rect = sibling.getBoundingClientRect();
        return e.clientY <= rect.top + rect.height / 2;
      });

      activitiesList.insertBefore(dragging, nextSibling);
    });

    activitiesList.addEventListener("drop", (e) => {
      e.preventDefault();
    });
  }

  updateHomeworkResourcesOrder() {
    const fileItems = document.querySelectorAll(
      "#homeworkUploadedFiles .file-item"
    );
    this.homeworkResources.files = Array.from(fileItems).map((item) => {
      const fileId = item.dataset.fileId;
      const fileData = this.fileStorage.get(fileId);
      return {
        id: fileId,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
      };
    });
  }

  getFileIcon(fileType) {
    if (fileType.startsWith("image/")) return "";
    if (fileType === "application/pdf") return "";
    return "";
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  previewFile(fileId) {
    const fileData = this.fileStorage.get(fileId);
    if (!fileData) {
      this.showNotification("Archivo no encontrado", "error");
      return;
    }

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      if (fileData.type.startsWith("image/")) {
        newWindow.document.write(`
                    <html>
                        <head><title>${fileData.name}</title></head>
                        <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0;">
                            <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                        </body>
                    </html>
                `);
      } else if (fileData.type === "application/pdf") {
        newWindow.document.write(`
                    <html>
                        <head><title>${fileData.name}</title></head>
                        <body style="margin: 0;">
                            <embed src="${fileData.data}" type="application/pdf" width="100%" height="100%" style="height: 100vh;">
                        </body>
                    </html>
                `);
      }
      newWindow.document.close();
    } else {
      this.showNotification(
        "No se pudo abrir el archivo. Verifica que los pop-ups estén habilitados.",
        "warning"
      );
    }
  }

  closeModal() {
    const modal = document.getElementById("fileModal");
    modal.classList.remove("active");
  }

  closeClassDetailModal() {
    const modal = document.getElementById("classDetailModal");
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  openClassDetailModal(classId) {
    const classData = this.classes.find((c) => c.id === classId);
    if (!classData) return;

    const modal = document.getElementById("classDetailModal");
    const title = document.getElementById("classDetailTitle");
    const body = document.getElementById("classDetailBody");

    const dateInfo = this.formatDate(classData.date);
    const englishDate = this.formatClassDate(classData.date);
    title.textContent = `Clase del ${dateInfo.full}`;

    const activitiesHtml = classData.activities
      .map((activity, index) => {
        const filesHtml =
          activity.files && activity.files.length > 0
            ? `
                <div class="files-section">
                    <div class="files-grid">
                        ${activity.files
                          .map((file) => this.createFileDisplay(file))
                          .join("")}
                    </div>
                </div>`
            : "";

        const linksHtml =
          activity.links && activity.links.length > 0
            ? `
                <div class="links-section">
                    <div class="links-grid">
                        ${activity.links
                          .map(
                            (link) => `
                            <a href="${
                              link.url
                            }" target="_blank" class="link-item">
                                <span class="link-icon"></span>
                                <span class="link-text">
                                    <span class="link-name">${link.name}</span>
                                    <span class="link-url">${this.getDomainFromUrl(
                                      link.url
                                    )}</span>
                                </span>
                            </a>`
                          )
                          .join("")}
                    </div>
                </div>`
            : "";

        return `
            <div class="activity-card">
                <div class="activity-header">
                    <span class="activity-number">${index + 1}.</span>
                    <span class="activity-type-badge type-${
                      activity.type
                    }">${this.capitalizeFirstLetter(activity.type)}</span>
                </div>
                <div class="activity-content">
                  <div class="activity-text">${
                    activity.textHtml
                      ? activity.textHtml
                      : activity.text.replace(/\n/g, "<br>")
                  }</div>
                    ${filesHtml}
                    ${linksHtml}
                </div>
            </div>
        `;
      })
      .join("");

    const homeworkFilesHtml =
      classData.homeworkFiles && classData.homeworkFiles.length > 0
        ? `
          <div class="files-section">
              <div class="files-title">Archivos de tarea</div>
              <div class="files-grid">
                  ${classData.homeworkFiles
                    .map((file) => this.createFileDisplay(file))
                    .join("")}
              </div>
          </div>`
        : "";

    const homeworkLinksHtml =
      classData.homeworkLinks && classData.homeworkLinks.length > 0
        ? `
          <div class="links-section">
              <div class="files-title">Enlaces de tarea</div>
              <div class="links-grid">
                  ${classData.homeworkLinks
                    .map(
                      (link) => `
                      <a href="${link.url}" target="_blank" class="link-item">
                          <span class="link-icon"></span>
                          <span class="link-text">
                              <span class="link-name">${link.name}</span>
                              <span class="link-url">${this.getDomainFromUrl(
                                link.url
                              )}</span>
                          </span>
                      </a>`
                    )
                    .join("")}
              </div>
          </div>`
        : "";

    const homeworkHtml = classData.homework
      ? `
          <div class="homework-card">
              <div class="homework-header">
                  <span class="homework-icon"></span>
                  <h3 class="homework-title">Tarea</h3>
              </div>
              <div class="homework-content">
                  ${
                    classData.homeworkHtml
                      ? classData.homeworkHtml
                      : classData.homework.replace(/\n/g, "<br>")
                  }
              </div>
              ${homeworkFilesHtml}
              ${homeworkLinksHtml}
          </div>`
      : "";

    body.innerHTML = `
        <div class="class-detail-view">
            <div class="class-header-info">
                <div class="class-date-display">
                    <span class="date-english">${englishDate}</span>
                </div>
            </div>
            
            <div class="activities-container">
                <h3 class="section-title">Actividades</h3>
                <div class="activities-grid">
                    ${activitiesHtml}
                </div>
            </div>
            
            ${homeworkHtml}
            
            <div class="class-actions-footer">
                <button onclick="event.stopPropagation(); planner.editClass('${classData.id}')" class="btn-action btn-edit">
                    <span class="btn-icon edit-icon"></span>
                    <span class="btn-text">Editar</span>
                </button>
                <button onclick="event.stopPropagation(); planner.shareClass('${classData.id}')" class="btn-action btn-share">
                    <span class="btn-icon share-icon"></span>
                    <span class="btn-text">Compartir</span>
                </button>
                <button onclick="event.stopPropagation(); planner.deleteClass('${classData.id}')" class="btn-action btn-delete">
                    <span class="btn-icon delete-icon"></span>
                    <span class="btn-text">Eliminar</span>
                </button>
            </div>
        </div>
    `;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  createFileUploadArea() {
    return `
            <button type="button" class="add-resource-trigger" onclick="toggleResourceSection(this)">
                Agregar recursos
            </button>
            <div class="resources-main-section">
                <div class="resource-type-selector">
                    <button type="button" class="resource-type-btn active" onclick="toggleResourceType(this, 'file')">
                        Subir archivo
                    </button>
                    <button type="button" class="resource-type-btn" onclick="toggleResourceType(this, 'link')">
                        Agregar enlace
                    </button>
                </div>
                
                <div class="file-upload-section">
                    <div class="file-upload-area" onclick="triggerFileInput(this)">
                        <input type="file" class="file-input" accept=".pdf,.jpg,.jpeg,.png,.gif" multiple onchange="handleFileSelect(this)">
                        <div class="file-upload-text">Subir archivos</div>
                        <div class="file-upload-hint">Arrastra archivos aquí o haz clic para seleccionar<br>Soporta: PDF, JPG, PNG, GIF (máx. 10MB)</div>
                    </div>
                    <div class="uploaded-files"></div>
                </div>
                
                <div class="link-upload-section" style="display: none;">
                    <div class="add-resource-section">
                        <div class="resource-inputs">
                            <input type="text" class="resource-name-input" placeholder="Nombre del recurso">
                            <input type="url" class="resource-url-input" placeholder="https://...">
                        </div>
                        <button type="button" class="add-resource-btn" onclick="addLinkResource(this)">Agregar Enlace</button>
                    </div>
                    <div class="link-resources-list"></div>
                </div>
            </div>
        `;
  }

  addClass() {
    const courseId = document.getElementById("courseName").value;
    if (!courseId) {
      this.showNotification("Por favor selecciona un curso", "warning");
      return;
    }

    const date = document.getElementById("classDate").value;
    const homeworkContent = this.homeworkQuillEditor
      ? this.getRichTextContent(this.homeworkQuillEditor)
      : { html: "", text: "" };
    const homework = homeworkContent.text;
    const activities = this.getActivitiesFromForm();

    if (activities.length === 0) {
      this.showNotification(
        "Agrega al menos una actividad para la clase",
        "warning"
      );
      return;
    }

    const classData = {
      id: this.isEditing ? this.editingClassId : Date.now().toString(),
      date: date,
      courseId: courseId,
      activities: activities,
      homework: homework,
      homeworkHtml: homeworkContent.html,
      homeworkFiles: this.homeworkResources.files || [],
      homeworkLinks: this.homeworkResources.links || [],
    };

    // Si estamos editando, primero eliminar la clase original
    if (this.isEditing && this.editingClassId) {
      this.classes = this.classes.filter((c) => c.id !== this.editingClassId);
    }

    this.classes.unshift(classData);
    this.saveClasses();
    this.renderClasses();
    this.resetForm();
    this.showStorageInfo();

    this.isEditing = false;
    this.editingClassId = null;
    this.hideCancelButton();

    this.showNotification("Clase guardada exitosamente", "success");

    // Volver a la vista del curso actual
    if (this.currentCourseId) {
      switchTab("courses");
      setTimeout(() => {
        selectCourse(classData.courseId);
      }, 100);
    }
  }

  getClassesByCourse(courseId) {
    console.log("Buscando clases para courseId:", courseId);
    const filtered = this.classes.filter((c) => {
      return c.courseId === courseId;
    });
    console.log("Clases filtradas:", filtered.length);
    return filtered;
  }

  getActivitiesFromForm() {
    const activities = [];
    const activityElements = document.querySelectorAll(
      "#activitiesList .activity-item"
    );

    activityElements.forEach((element) => {
      const type = element.querySelector(".activity-type-select").value;
      const textContent = element.quillEditor
        ? this.getRichTextContent(element.quillEditor)
        : { html: "", text: "" };
      const text = textContent.text;

      if (text) {
        const files = [];
        const links = [];

        element.querySelectorAll(".file-item").forEach((fileEl) => {
          const fileId = fileEl.dataset.fileId;
          const fileData = this.fileStorage.get(fileId);
          if (fileData) {
            files.push({
              id: fileId,
              name: fileData.name,
              type: fileData.type,
              size: fileData.size,
            });
          }
        });

        element.querySelectorAll(".link-resource-item").forEach((linkEl) => {
          const name = linkEl.querySelector(".link-resource-name").textContent;
          const url = linkEl.querySelector(".link-resource-url").href;
          links.push({ name, url });
        });

        activities.push({ type, text, files, links });
        activities[activities.length - 1].textHtml = textContent.html;
      }
    });

    return activities;
  }

  deleteCourse(courseId) {
    if (confirm("¿Estás seguro? Se eliminarán TODAS las clases del curso.")) {
      const classesInCourse = this.getClassesByCourse(courseId);

      // Eliminar archivos asociados
      classesInCourse.forEach((classData) => {
        classData.activities.forEach((activity) => {
          if (activity.files) {
            activity.files.forEach((file) => {
              this.fileStorage.delete(file.id);
            });
          }
        });
        if (classData.homeworkFiles) {
          classData.homeworkFiles.forEach((file) => {
            this.fileStorage.delete(file.id);
          });
        }
      });

      this.classes = this.classes.filter((c) => c.courseId !== courseId);
      this.courses = this.courses.filter((c) => c.id !== courseId);
      this.saveClasses();
      this.saveCourses();
      this.saveFileStorage();
      this.currentCourseId = null;

      this.showNotification("Curso eliminado", "error");
      renderCoursesList();
    }
  }

  editCourse(courseId, newName, newDescription = "") {
    const course = this.courses.find((c) => c.id === courseId);
    if (course) {
      course.name = newName;
      course.description = newDescription;
      this.saveCourses();
      this.showNotification("Curso actualizado", "success");
    }
  }

  addActivityElement() {
    const activitiesList = document.getElementById("activitiesList");
    const activityDiv = document.createElement("div");
    activityDiv.className = "activity-item fade-in";

    activityDiv.innerHTML = `
            <div class="activity-header">
                <div class="activity-drag-handle">⋮⋮</div>
                <button type="button" class="remove-activity" onclick="removeActivity(this)" title="Eliminar actividad">×</button>
                <div class="activity-main-content">
                    <div class="activity-type-row">
                        <select class="activity-type-select">
                            <option value="activity">Activity</option>
                            <option value="exam">Exam</option>
                            <option value="explanation">Explanation</option>
                            <option value="game">Game</option>
                            <option value="oral">Oral Work</option>
                            <option value="review">Review</option>
                            <option value="vocabulary">Vocabulary</option>
                        </select>
                    </div>
                    <div class="activity-text-input-container"></div>
                </div>
            </div>
            ${this.createFileUploadArea()}
        `;

    activitiesList.appendChild(activityDiv);

    // Make the activity draggable
    activityDiv.draggable = true;
    activityDiv.dataset.activityId =
      "activity_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);

    this.makeActivityDraggable(activityDiv);
    this.makeActivitiesListSortable();

    const addResourceBtn = activityDiv.querySelector(".add-resource-trigger");
    addResourceBtn.addEventListener("click", () => {
      setTimeout(() => {
        const uploadArea = activityDiv.querySelector(".file-upload-area");
        if (uploadArea && !uploadArea.classList.contains("drag-setup")) {
          this.setupDragAndDropForElement(uploadArea);
          uploadArea.classList.add("drag-setup");
        }
      }, 100);
    });

    // Initialize rich text editor for this activity
    setTimeout(() => {
      const textContainer = activityDiv.querySelector(
        ".activity-text-input-container"
      );
      const editor = this.initializeRichTextEditor(textContainer, "");
      activityDiv.quillEditor = editor;
    }, 100);
  }

  deleteClass(id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta clase?")) {
      const classData = this.classes.find((c) => c.id === id);
      if (classData) {
        classData.activities.forEach((activity) => {
          if (activity.files) {
            activity.files.forEach((file) => {
              this.fileStorage.delete(file.id);
            });
          }
        });

        if (classData.homeworkFiles) {
          classData.homeworkFiles.forEach((file) => {
            this.fileStorage.delete(file.id);
          });
        }

        this.saveFileStorage();
      }

      this.classes = this.classes.filter((c) => c.id !== id);
      this.saveClasses();
      this.renderClasses(); // Ya filtrará por curso si está seleccionado
      this.showStorageInfo();
      this.showNotification("Clase eliminada", "error");
    }
  }

  editClass(id) {
    const classData = this.classes.find((c) => c.id === id);
    if (!classData) return;

    this.isEditing = true;
    this.editingClassId = id;
    this.showCancelButton();

    switchTab("create");

    document.getElementById("classDate").value = classData.date;
    document.getElementById("courseName").value = classData.courseId;

    // Cargar homework
    if (this.homeworkQuillEditor && classData.homeworkHtml) {
      setTimeout(() => {
        this.setRichTextContent(
          this.homeworkQuillEditor,
          classData.homeworkHtml
        );
      }, 300);
    } else if (this.homeworkQuillEditor && classData.homework) {
      setTimeout(() => {
        this.homeworkQuillEditor.setText(classData.homework);
      }, 300);
    }

    // Cargar recursos de homework
    this.homeworkResources = {
      files: [...(classData.homeworkFiles || [])],
      links: [...(classData.homeworkLinks || [])],
    };

    const homeworkUploadedFiles = document.getElementById(
      "homeworkUploadedFiles"
    );
    const homeworkLinksList = document.getElementById(
      "homeworkLinkResourcesList"
    );
    if (homeworkUploadedFiles) homeworkUploadedFiles.innerHTML = "";
    if (homeworkLinksList) homeworkLinksList.innerHTML = "";

    if (classData.homeworkFiles && classData.homeworkFiles.length > 0) {
      classData.homeworkFiles.forEach((fileRef) => {
        const fileData = this.fileStorage.get(fileRef.id);
        if (fileData) {
          const fileItem = this.createDraggableFileItem(fileData, "homework");
          if (homeworkUploadedFiles)
            homeworkUploadedFiles.appendChild(fileItem);
        }
      });
    }

    if (classData.homeworkLinks && classData.homeworkLinks.length > 0) {
      classData.homeworkLinks.forEach((link) => {
        this.addHomeworkLinkResourceToDOM(link.name, link.url);
      });
    }

    // Limpiar actividades actuales
    const activitiesList = document.getElementById("activitiesList");
    activitiesList.innerHTML = "";

    // Crear actividades con todos sus datos
    classData.activities.forEach((activity, index) => {
      this.addActivityElement();
      const activityElement = activitiesList.children[index];

      // Establecer el tipo de actividad
      activityElement.querySelector(".activity-type-select").value =
        activity.type;

      // Agregar archivos
      if (activity.files && activity.files.length > 0) {
        activity.files.forEach((fileRef) => {
          const fileData = this.fileStorage.get(fileRef.id);
          if (fileData) this.addFileToActivity(activityElement, fileData);
        });
      }

      // Agregar links
      if (activity.links && activity.links.length > 0) {
        activity.links.forEach((link) => {
          this.addLinkResourceToActivity(activityElement, link.name, link.url);
        });
      }
    });

    // Cargar el contenido de texto de las actividades DESPUÉS de que los editores estén listos
    setTimeout(() => {
      const activityElements =
        activitiesList.querySelectorAll(".activity-item");
      classData.activities.forEach((activity, index) => {
        if (activityElements[index] && activityElements[index].quillEditor) {
          if (activity.textHtml) {
            this.setRichTextContent(
              activityElements[index].quillEditor,
              activity.textHtml
            );
          } else if (activity.text) {
            activityElements[index].quillEditor.setText(activity.text);
          }
        }
      });
    }, 500);

    // this.deleteClassSilent(id);
    this.showNotification("Clase cargada para edición", "info");
  }

  // Creación o selección del curso
  createCourse(courseName) {
    if (!courseName.trim()) {
      this.showNotification(
        "El nombre del curso no puede estar vacío",
        "warning"
      );
      return null;
    }

    const newCourse = {
      id: Date.now().toString(),
      name: courseName,
      courseId: this.currentCourseId,
      createdAt: new Date().toISOString(),
      description: "",
      color: this.getRandomColor(),
    };

    this.courses.unshift(newCourse);
    this.saveCourses();
    return newCourse;
  }

  getRandomColor() {
    const colors = [
      "#3b82f6",
      "#ef4444",
      "#22c55e",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  addLinkResourceToActivity(activityElement, name, url) {
    const linksList = activityElement.querySelector(".link-resources-list");
    const linkId = "link_" + Date.now();

    const linkItem = document.createElement("div");
    linkItem.className = "link-resource-item";
    linkItem.dataset.linkId = linkId;

    linkItem.innerHTML = `
            <div class="link-resource-info">
                <span class="link-resource-name">${name}</span>
                <a href="${url}" target="_blank" class="link-resource-url">${this.getDomainFromUrl(
      url
    )}</a>
            </div>
            <button type="button" class="remove-link-resource" onclick="removeLinkResource(this)" title="Eliminar">×</button>
        `;

    linksList.appendChild(linkItem);
  }

  addHomeworkLinkResourceToDOM(name, url) {
    const linksList = document.getElementById("homeworkLinkResourcesList");
    const linkId = "link_" + Date.now();

    const linkItem = document.createElement("div");
    linkItem.className = "link-resource-item";
    linkItem.dataset.linkId = linkId;

    linkItem.innerHTML = `
            <div class="link-resource-info">
                <span class="link-resource-name">${name}</span>
                <a href="${url}" target="_blank" class="link-resource-url">${this.getDomainFromUrl(
      url
    )}</a>
            </div>
            <button type="button" class="remove-link-resource" onclick="removeHomeworkLinkResource(this)" title="Eliminar">×</button>
        `;

    linksList.appendChild(linkItem);
  }

  getDomainFromUrl(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  deleteClassSilent(id) {
    // No eliminar la clase original hasta que se guarde la edición
    // La eliminación temporal ya está manejada
  }

  resetForm() {
    document.getElementById("classForm").reset();
    const activitiesList = document.getElementById("activitiesList");
    activitiesList.innerHTML = "";
    this.addActivityElement();
    this.homeworkResources = { files: [], links: [] };
    document.getElementById("homeworkUploadedFiles").innerHTML = "";
    document.getElementById("homeworkLinkResourcesList").innerHTML = "";
    this.setTodayAsDefault();

    // Limpiar estado de edición
    this.isEditing = false;
    this.editingClassId = null;
    this.hideCancelButton();

    // Resetear el editor de homework
    setTimeout(() => {
      this.initializeHomeworkEditor();
      if (this.homeworkQuillEditor) {
        this.homeworkQuillEditor.setText("");
      }
    }, 200);
  }

  createFileDisplay(file) {
    const icon = this.getFileIcon(file.type);
    return `
            <div class="file-display-item" onclick="previewFile('${file.id}')" title="Ver ${file.name}">
                ${file.name}
            </div>
        `;
  }

  formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    const days = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const months = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, "0");
    const month = months[date.getMonth()];

    return {
      full: `${dayName} ${day}/${month}`,
      weekday: dayName.substring(0, 3).toUpperCase(),
      dayNumber: `${day}/${month}`,
    };
  }

  renderClasses(classesToRender = null) {
    const container = document.getElementById("classesList");

    // Ordenar clases por fecha (más reciente primero)
    let classesForDisplay =
      classesToRender ||
      (this.currentCourseId
        ? this.getClassesByCourse(this.currentCourseId)
        : this.classes);

    classesForDisplay = [...classesForDisplay].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    if (classesForDisplay.length === 0) {
      container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"></div>
                <p>No hay clases en este curso.</p>
                <p class="empty-subtitle">¡Crea tu primera clase!</p>
            </div>
        `;
      return;
    }

    container.innerHTML = classesForDisplay
      .map((classData) => {
        const dateInfo = this.formatDate(classData.date);

        const activitiesCount = classData.activities.length;
        const activityTypes = [
          ...new Set(classData.activities.map((a) => a.type)),
        ];
        const hasHomework = classData.homework ? true : false;
        const totalResources =
          classData.activities.reduce((total, activity) => {
            return (
              total +
              (activity.files?.length || 0) +
              (activity.links?.length || 0)
            );
          }, 0) +
          (classData.homeworkFiles?.length || 0) +
          (classData.homeworkLinks?.length || 0);

        const summaryItems = [
          `${activitiesCount} actividad${activitiesCount !== 1 ? "es" : ""}`,
          activityTypes.length > 0
            ? `Tipos: ${activityTypes.join(", ")}`
            : null,
          totalResources > 0
            ? `${totalResources} recurso${totalResources !== 1 ? "s" : ""}`
            : null,
          hasHomework ? "Con tarea" : null,
        ].filter((item) => item !== null);

        const summaryText = summaryItems.join(" • ");

        return `
                <div class="class-card ${
                  classesForDisplay.length > 1 ? "fade-in" : ""
                }" data-class-id="${classData.id}">
                    <div class="class-card-header" onclick="toggleClassExpansion('${
                      classData.id
                    }', event)">
                        <div class="class-date-info">
                            <div class="class-date-badge">
                                <span class="class-weekday">${
                                  dateInfo.weekday
                                }</span>
                                <span class="class-date">${
                                  dateInfo.dayNumber
                                }</span>
                            </div>
                            <div class="class-meta">
                                <span class="class-summary">${summaryText}</span>
                            </div>
                        </div>
                        <div class="class-header-actions">
                            <button onclick="event.stopPropagation(); planner.openClassDetailModal('${
                              classData.id
                            }')" class="btn-icon view-full-btn" title="Ver en pantalla completa">
                                <span class="icon-fullscreen"></span>
                            </button>
                            <button class="btn-icon expand-toggle-btn" title="Expandir">
                                <span class="icon-expand"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="class-card-content" style="display: none;">
                        <div class="activities-container">
                            ${classData.activities
                              .map((activity, index) => {
                                const filesHtml =
                                  activity.files && activity.files.length > 0
                                    ? `
                                        <div class="resources-section">
                                            <div class="files-grid">
                                                ${activity.files
                                                  .map((file) =>
                                                    this.createFileDisplay(file)
                                                  )
                                                  .join("")}
                                            </div>
                                        </div>`
                                    : "";

                                const linksHtml =
                                  activity.links && activity.links.length > 0
                                    ? `
                                        <div class="resources-section">
                                            <div class="links-grid">
                                                ${activity.links
                                                  .map(
                                                    (link) => `
                                                        <a href="${link.url}" target="_blank" class="link-item">
                                                            <span class="link-icon"></span>
                                                            <span class="link-text">
                                                                <span class="link-name">${link.name}</span>
                                                            </span>
                                                        </a>`
                                                  )
                                                  .join("")}
                                            </div>
                                        </div>`
                                    : "";

                                return `
                                    <div class="activity-item">
                                        <div class="activity-header">
                                            <span class="activity-number">${
                                              index + 1
                                            }.</span>
                                            <span class="activity-type-badge type-${
                                              activity.type
                                            }">${this.capitalizeFirstLetter(
                                  activity.type
                                )}</span>
                                        </div>
                                        <div class="activity-content">
                                            <div class="activity-text">${
                                              activity.textHtml
                                                ? activity.textHtml
                                                : activity.text.replace(
                                                    /\n/g,
                                                    "<br>"
                                                  )
                                            }</div>
                                            ${filesHtml}
                                            ${linksHtml}
                                        </div>
                                    </div>
                                `;
                              })
                              .join("")}
                        </div>
                        
                        ${
                          classData.homework
                            ? `
                            <div class="homework-preview">
                                <div class="homework-header">
                                    <span class="homework-icon"></span>
                                    <span class="homework-title">Tarea</span>
                                </div>
                                <div class="homework-content-preview">
                                    ${
                                      classData.homeworkHtml
                                        ? classData.homeworkHtml
                                        : classData.homework.replace(
                                            /\n/g,
                                            "<br>"
                                          )
                                    }
                                </div>
                                ${
                                  classData.homeworkFiles &&
                                  classData.homeworkFiles.length > 0
                                    ? `<div class="homework-resources">
                                        <span class="resources-count">${
                                          classData.homeworkFiles.length
                                        } archivo${
                                        classData.homeworkFiles.length !== 1
                                          ? "s"
                                          : ""
                                      }</span>
                                    </div>`
                                    : ""
                                }
                                ${
                                  classData.homeworkLinks &&
                                  classData.homeworkLinks.length > 0
                                    ? `<div class="homework-resources">
                                        <span class="resources-count">${
                                          classData.homeworkLinks.length
                                        } enlace${
                                        classData.homeworkLinks.length !== 1
                                          ? "s"
                                          : ""
                                      }</span>
                                    </div>`
                                    : ""
                                }
                            </div>`
                            : ""
                        }
                        
                        <div class="class-card-actions">
                            <button onclick="event.stopPropagation(); planner.editClass('${
                              classData.id
                            }')" class="btn-action btn-edit">
                                <span class="btn-icon edit-icon"></span>
                                <span class="btn-text">Editar</span>
                            </button>
                            <button onclick="event.stopPropagation(); planner.shareClass('${
                              classData.id
                            }')" class="btn-action btn-share">
                                <span class="btn-icon share-icon"></span>
                                <span class="btn-text">Compartir</span>
                            </button>
                            <button onclick="event.stopPropagation(); planner.deleteClass('${
                              classData.id
                            }')" class="btn-action btn-delete">
                                <span class="btn-icon delete-icon"></span>
                                <span class="btn-text">Eliminar</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  filterClasses(searchTerm) {
    if (!searchTerm.trim()) {
      this.renderClasses();
      return;
    }

    const filtered = this.classes.filter(
      (classData) =>
        classData.activities.some(
          (activity) =>
            activity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (activity.files &&
              activity.files.some((file) =>
                file.name.toLowerCase().includes(searchTerm.toLowerCase())
              ))
        ) ||
        (classData.homework &&
          classData.homework.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    this.renderClasses(filtered);
  }

  showCancelButton() {
    let cancelBtn = document.getElementById("cancelEditBtn");
    if (!cancelBtn) {
      const submitBtn = document.querySelector(
        "#classForm button[type='submit']"
      );
      cancelBtn = document.createElement("button");
      cancelBtn.id = "cancelEditBtn";
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-secondary";
      cancelBtn.textContent = "Cancelar";
      cancelBtn.style.marginRight = "10px";
      cancelBtn.onclick = () => this.cancelEdit();
      submitBtn.parentNode.insertBefore(cancelBtn, submitBtn);
    }
    cancelBtn.style.display = "inline-flex";
  }

  hideCancelButton() {
    const cancelBtn = document.getElementById("cancelEditBtn");
    if (cancelBtn) {
      cancelBtn.style.display = "none";
    }
  }

  cancelEdit() {
    if (
      confirm(
        "¿Estás seguro de que deseas cancelar la edición? Los cambios no guardados se perderán."
      )
    ) {
      this.resetForm();
      this.showNotification("Edición cancelada", "info");

      // Navegar a la vista correcta
      if (this.currentCourseId) {
        switchTab("courses");
        setTimeout(() => {
          // Asegurar que se muestren las clases del curso
          document.getElementById("coursesListView").style.display = "none";
          document.getElementById("courseClassesView").style.display = "block";
          this.renderClasses();
        }, 100);
      } else {
        backToCourses();
      }
    }
  }

  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation =
        "slideOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 400);
    }, 1500);
  }

  // Rich text editor methods
  initializeRichTextEditor(
    container,
    placeholder = "Escribe aquí...",
    isHomework = false
  ) {
    const editorId =
      "editor-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);

    const editorHTML = `
            <div class="rich-text-container ${
              isHomework ? "homework-rich-text-container" : ""
            }">
                <div id="${editorId}" data-placeholder="${placeholder}"></div>
            </div>
        `;

    container.innerHTML = editorHTML;

    const quill = new Quill(`#${editorId}`, {
      theme: "snow",
      placeholder: placeholder,
      modules: {
        toolbar: [
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
        ],
      },
    });

    return quill;
  }

  getRichTextContent(quill) {
    const delta = quill.getContents();
    const html = quill.root.innerHTML;
    return {
      html: html === "<p><br></p>" ? "" : html,
      text: quill.getText().trim(),
      delta: delta,
    };
  }

  setRichTextContent(quill, content) {
    if (typeof content === "string") {
      quill.root.innerHTML = content;
    } else if (content && content.delta) {
      quill.setContents(content.delta);
    } else if (content && content.html) {
      quill.root.innerHTML = content.html;
    }
  }

  initializeHomeworkEditor() {
    const homeworkTextarea = document.getElementById("homework");
    if (homeworkTextarea) {
      const parent = homeworkTextarea.parentNode;
      const newContainer = document.createElement("div");
      newContainer.id = "homework-editor-container";
      parent.replaceChild(newContainer, homeworkTextarea);
      this.homeworkQuillEditor = this.initializeRichTextEditor(
        newContainer,
        "",
        true
      );
    }
  }

  handleSharedClass() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get("share");

    if (sharedData) {
      try {
        const classData = JSON.parse(atob(sharedData));

        if (confirm("¿Deseas importar esta clase compartida?")) {
          // Import files
          if (classData.files) {
            Object.entries(classData.files).forEach(([fileId, fileData]) => {
              this.fileStorage.set(fileId, fileData);
            });
            this.saveFileStorage();
          }

          // Remove share-specific data
          delete classData.files;
          delete classData.shareDate;

          // Add to classes
          classData.id = Date.now().toString();
          this.classes.unshift(classData);
          this.saveClasses();
          this.renderClasses();
          this.showStorageInfo();

          this.showNotification(
            "Clase compartida importada exitosamente",
            "success"
          );

          // Clean URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      } catch (error) {
        this.showNotification("Error al importar clase compartida", "error");
        console.error("Share import error:", error);
      }
    }
  }

  // Share functionality
  shareClass(classId) {
    this.currentShareClassId = classId;
    const modal = document.getElementById("shareModal");
    modal.classList.add("active");
  }

  generateShareableContent(classId) {
    const classData = this.classes.find((c) => c.id === classId);
    if (!classData) return null;

    const dateInfo = this.formatDate(classData.date);

    // Create shareable object with files as base64
    const shareableClass = {
      ...classData,
      shareDate: new Date().toISOString(),
      files: {},
    };

    // Include file data for sharing
    classData.activities.forEach((activity) => {
      if (activity.files) {
        activity.files.forEach((file) => {
          const fileData = this.fileStorage.get(file.id);
          if (fileData) {
            shareableClass.files[file.id] = fileData;
          }
        });
      }
    });

    if (classData.homeworkFiles) {
      classData.homeworkFiles.forEach((file) => {
        const fileData = this.fileStorage.get(file.id);
        if (fileData) {
          shareableClass.files[file.id] = fileData;
        }
      });
    }

    return shareableClass;
  }

  generateShareableText(classId) {
    const classData = this.classes.find((c) => c.id === classId);
    if (!classData) return "";

    const dateInfo = this.formatDate(classData.date);
    let text = `${dateInfo.full}\n`;
    text += `${"=".repeat(50)}\n\n`;

    text += `ACTIVIDADES:\n`;
    classData.activities.forEach((activity, index) => {
      text += `${index + 1}. [${activity.type.toUpperCase()}] ${
        activity.text
      }\n`;
      if (activity.files && activity.files.length > 0) {
        text += `   Archivos: ${activity.files
          .map((f) => f.name)
          .join(", ")}\n`;
      }
      if (activity.links && activity.links.length > 0) {
        text += `   Enlaces: ${activity.links
          .map((l) => `${l.name} (${l.url})`)
          .join(", ")}\n`;
      }
      text += "\n";
    });

    if (classData.homework) {
      text += `TAREA:\n${classData.homework}\n`;
      if (classData.homeworkFiles && classData.homeworkFiles.length > 0) {
        text += `Archivos de tarea: ${classData.homeworkFiles
          .map((f) => f.name)
          .join(", ")}\n`;
      }
      if (classData.homeworkLinks && classData.homeworkLinks.length > 0) {
        text += `Enlaces de tarea: ${classData.homeworkLinks
          .map((l) => `${l.name} (${l.url}) `)
          .join(", ")}\n`;
      }
    }

    return text;
  }

  closeShareModal() {
    const modal = document.getElementById("shareModal");
    modal.classList.remove("active");
    document.getElementById("shareSuccess").classList.remove("active");
  }

  generateClassWithFiles(classId) {
    const classData = this.classes.find((c) => c.id === classId);
    if (!classData) return;

    let htmlContent = `
        <html>
        <head>
            <title>English Class - ${
              this.formatDate(classData.date).full
            }</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }

              body { 
                  font-family: "Inter", -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                  line-height: 1.5;
                  color: #37352f;
                  background: #ffffff;
                  padding: 24px;
                  -webkit-font-smoothing: antialiased;
              }

              .container {
                  max-width: 1000px;
                  margin: 0 auto;
                  background: #ffffff;
                  border-radius: 8px;
                  border: 1px solid #e9e9e7;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                  overflow: hidden;
              }

              .header {
                  background: #ffffff;
                  padding: 32px 24px;
                  text-align: center;
                  border-bottom: 1px solid #e9e9e7;
              }

              .header h1 {
                  font-size: 28px;
                  font-weight: 700;
                  color: #37352f;
                  margin-bottom: 8px;
              }

              .date {
                  font-size: 16px;
                  font-weight: 400;
                  color: #787774;
                  background: #f7f6f3;
                  padding: 8px 16px;
                  border-radius: 4px;
                  display: inline-block;
              }

              .content {
                  padding: 24px;
                  background: #ffffff;
              }

              .section-title {
                  font-size: 20px;
                  font-weight: 600;
                  color: #37352f;
                  margin-bottom: 20px;
                  padding-bottom: 12px;
                  border-bottom: 1px solid #e9e9e7;
              }

              .activity { 
                  background: #f7f6f3;
                  margin-bottom: 16px;
                  padding: 20px;
                  border-radius: 6px;
                  border: 1px solid #e9e9e7;
                  transition: all 0.15s ease;
              }

              .activity:hover {
                  border-color: #37352f;
              }

              .activity:last-child {
                  margin-bottom: 0;
              }

              .activity-header {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 16px;
              }

              .activity-number {
                  font-size: 16px;
                  font-weight: 600;
                  color: #37352f;
              }

              .activity-type {
                  background: #37352f;
                  color: #ffffff;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
              }

              .activity p {
                  font-size: 16px;
                  line-height: 1.5;
                  color: #37352f;
                  margin-bottom: 16px;
              }

              .activity p:last-child {
                  margin-bottom: 0;
              }

              .files-title {
                  font-size: 14px;
                  font-weight: 600;
                  color: #787774;
                  margin-bottom: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
              }

              .file-link { 
                  display: inline-flex;
                  align-items: center;
                  margin: 0 8px 8px 0;
                  padding: 8px 12px;
                  background: #ffffff;
                  color: #37352f;
                  text-decoration: none;
                  border-radius: 4px;
                  font-size: 14px;
                  font-weight: 500;
                  transition: all 0.15s ease;
                  border: 1px solid #e9e9e7;
                  gap: 6px;
              }

              .file-link:hover {
                  background: #37352f;
                  color: #ffffff;
                  border-color: #37352f;
              }

              .file-link:active {
                  transform: scale(0.98);
              }

              .file-link::before {
                  content: "";
                  width: 16px;
                  height: 16px;
                  background: currentColor;
                  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'/%3E%3C/svg%3E") no-repeat center;
              }

              .link-item {
                  display: inline-flex;
                  align-items: center;
                  margin: 0 8px 8px 0;
                  padding: 8px 12px;
                  background: #ffffff;
                  color: #37352f;
                  text-decoration: none;
                  border-radius: 4px;
                  font-size: 14px;
                  font-weight: 500;
                  transition: all 0.15s ease;
                  border: 1px solid #e9e9e7;
                  gap: 6px;
              }

              .link-item:hover {
                  background: #37352f;
                  color: #ffffff;
                  border-color: #37352f;
              }

              .link-item:active {
                  transform: scale(0.98);
              }

              .link-item::before {
                  content: "";
                  width: 16px;
                  height: 16px;
                  background: currentColor;
                  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.71-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'/%3E%3C/svg%3E") no-repeat center;
              }

              .homework { 
                  background: #fef9e7;
                  padding: 20px;
                  border-radius: 6px;
                  margin-top: 24px;
                  border: 1px solid #f39c12;
                  border-left: 4px solid #f39c12;
              }

              .homework h2 {
                  font-size: 18px;
                  font-weight: 600;
                  color: #8e6c0a;
                  margin-bottom: 12px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
              }

              .homework h2::before {
                  content: "";
                  width: 18px;
                  height: 18px;
                  background: currentColor;
                  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'/%3E%3C/svg%3E") no-repeat center;
              }

              .homework p {
                  font-size: 16px;
                  line-height: 1.5;
                  color: #37352f;
                  margin-bottom: 12px;
              }

              .homework p:last-child {
                  margin-bottom: 0;
              }

              .homework .files-title {
                  color: #8e6c0a;
              }

              .homework .file-link {
                  color: #8e6c0a;
                  border-color: #f39c12;
              }

              .homework .file-link:hover {
                  background: #f39c12;
                  color: #ffffff;
                  border-color: #f39c12;
              }

              .homework .link-item {
                  color: #8e6c0a;
                  border-color: #f39c12;
              }

              .homework .link-item:hover {
                  background: #f39c12;
                  color: #ffffff;
                  border-color: #f39c12;
              }

              .type-game { background: #f39c12; }
              .type-activity { background: #27ae60; }
              .type-vocabulary { background: #9b59b6; }
              .type-explanation { background: #3498db; }
              .type-review { background: #1abc9c; }
              .type-exam { background: #e74c3c; }
              .type-oral { background: #e67e22; }

              @media (max-width: 768px) {
                  body {
                      padding: 16px;
                      background: #ffffff;
                  }
                  
                  .container {
                      border-radius: 6px;
                      border: 1px solid #e9e9e7;
                  }
                  
                  .header {
                      padding: 24px 16px;
                  }
                  
                  .header h1 {
                      font-size: 24px;
                  }
                  
                  .date {
                      font-size: 14px;
                      padding: 6px 12px;
                  }
                  
                  .content {
                      padding: 16px;
                  }
                  
                  .section-title {
                      font-size: 18px;
                      margin-bottom: 16px;
                  }
                  
                  .activity {
                      padding: 16px;
                      margin-bottom: 12px;
                  }
                  
                  .activity-header {
                      flex-direction: column;
                      align-items: flex-start;
                      gap: 8px;
                      margin-bottom: 12px;
                  }
                  
                  .homework {
                      padding: 16px;
                      margin-top: 20px;
                  }
                  
                  .file-link, .link-item {
                      display: flex;
                      width: 100%;
                      text-align: left;
                      margin: 0 0 8px 0;
                      justify-content: flex-start;
                  }
                  
                  .files-section {
                    margin-top: 12px;
                  }
                  
                  .files-section, .links-section {
                      padding-top: 0;
                  }
              }

              @media (max-width: 480px) {
                  body {
                      padding: 12px;
                  }
                  
                  .header {
                      padding: 20px 12px;
                  }
                  
                  .header h1 {
                      font-size: 20px;
                  }
                  
                  .content {
                      padding: 12px;
                  }
                  
                  .activity {
                      padding: 12px;
                  }
                  
                  .activity p {
                      font-size: 15px;
                  }
                  
                  .homework {
                      padding: 12px;
                  }
                  
                  .homework h2 {
                      font-size: 16px;
                  }
                  
                  .homework p {
                      font-size: 15px;
                  }
                  
                  .file-link, .link-item {
                      font-size: 13px;
                      padding: 6px 10px;
                  }
              }

              @media print {
                  body {
                      background: #ffffff;
                      padding: 0;
                  }
                  
                  .container {
                      box-shadow: none;
                      border: none;
                      border-radius: 0;
                  }
                  
                  .header {
                      border-bottom: 2px solid #37352f;
                  }
                  
                  .activity {
                      break-inside: avoid;
                      border: 1px solid #e9e9e7;
                  }
                  
                  .file-link, .link-item {
                      border: 1px solid #e9e9e7;
                      color: #37352f;
                  }
                  
                  .file-link:hover, .link-item:hover {
                      background: transparent;
                      color: #37352f;
                      border-color: #e9e9e7;
                  }
              }

              .activity ol,
              .activity ul,
              .homework ol,
              .homework ul {
                  padding-left: 2rem;
                  margin: 0.5rem 0;
              }

              .activity ol li,
              .homework ol li {
                  list-style-type: decimal;
                  margin-bottom: 0.25rem;
                  margin-left: 0;
              }

              .activity ul li,
              .homework ul li {
                  list-style-type: disc;
                  margin-bottom: 0.25rem;
                  margin-left: 0;
              }

              .activity ol ol,
              .activity ul ul,
              .homework ol ol,
              .homework ul ul {
                  margin: 0.25rem 0;
                  padding-left: 1.5rem;
              }

              .activity p,
              .homework p {
                  margin: 0 0 0.5rem 0;
              }

              .activity p:last-child,
              .homework p:last-child {
                  margin-bottom: 0;
              }

              .activity > *,
              .homework > * {
                  margin: 0;
              }

              .activity > * + *,
              .homework > * + * {
                  margin-top: 0.5rem;
              }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${this.formatDate(classData.date).full}</h1>
                </div>
                
                <div class="content">
                    <h2 class="section-title">Activities</h2>
        `;

    classData.activities.forEach((activity, index) => {
      htmlContent += `
            <div class="activity">
                <div class="activity-header">
                    <span class="activity-number">${index + 1}.</span>
                    <span class="activity-type">${activity.type}</span>
                </div>
                <p>${activity.textHtml || activity.text}</p>
            `;

      // Agregar archivos como data URLs
      if (activity.files && activity.files.length > 0) {
        htmlContent += `
                <div class="files-section">
                    <div class="files-title"></div>
                `;
        activity.files.forEach((file) => {
          const fileData = this.fileStorage.get(file.id);
          if (fileData) {
            htmlContent += `<a href="${fileData.data}" download="${file.name}" class="file-link">${file.name}</a>`;
          }
        });
        htmlContent += "</div>";
      }

      // Agregar links de actividades
      if (activity.links && activity.links.length > 0) {
        htmlContent += `
                <div class="links-section">
                    <div class="files-title"></div>
                `;
        activity.links.forEach((link) => {
          htmlContent += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-item">${link.name}</a>`;
        });
        htmlContent += "</div>";
      }

      htmlContent += "</div>";
    });

    if (classData.homework) {
      htmlContent += `
            <div class="homework">
                <h2>Homework</h2>
                <p>${classData.homeworkHtml || classData.homework}</p>
            `;

      if (classData.homeworkFiles && classData.homeworkFiles.length > 0) {
        htmlContent += `
                <div class="files-section">
                    <div class="files-title"></div>
                `;
        classData.homeworkFiles.forEach((file) => {
          const fileData = this.fileStorage.get(file.id);
          if (fileData) {
            htmlContent += `<a href="${fileData.data}" download="${file.name}" class="file-link">${file.name}</a>`;
          }
        });
        htmlContent += "</div>";
      }

      // Agregar links de homework
      if (classData.homeworkLinks && classData.homeworkLinks.length > 0) {
        htmlContent += `
                <div class="links-section">
                    <div class="files-title"></div>
                `;
        classData.homeworkLinks.forEach((link) => {
          htmlContent += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-item">${link.name}</a>`;
        });
        htmlContent += "</div>";
      }

      htmlContent += "</div>";
    }

    htmlContent += `
                </div>
            </div>
        </body>
        </html>`;

    // Crear y descargar archivo HTML
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `english-class-${classData.date}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Añade estos métodos a la clase EnglishClassPlanner
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // truncateText(text, maxLength) {
  //   if (!text) return "";
  //   if (text.length <= maxLength) return text;
  //   return text.substring(0, maxLength) + "...";
  // }

  stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // truncateHtml(html, maxLength) {
  //   const text = this.stripHtml(html);
  //   if (text.length <= maxLength) return html;

  //   // Si el texto es muy largo, mostrar versión truncada como texto
  //   return this.truncateText(text, maxLength);
  // }
}

let planner;

function switchTab(tabName) {
  console.log("Cambiando a tab:", tabName);

  // Cerrar menú si está abierto
  closeMenu();

  // Remover active de todos los botones
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Agregar active al botón clickeado (con validación)
  const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (targetButton) {
    targetButton.classList.add("active");
  }

  // Remover active de todos los tab-content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Agregar active al tab correcto (con validación)
  const targetTab = document.getElementById(tabName + "Tab");
  if (targetTab) {
    targetTab.classList.add("active");
  }

  // Si es el tab de cursos, renderizar la lista
  if (tabName === "courses" && typeof renderCoursesList === "function") {
    renderCoursesList();
  }
}

// Menu functions
function toggleMenu() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.toggle("active");

  // Close menu when clicking outside
  if (menu.classList.contains("active")) {
    setTimeout(() => {
      document.addEventListener("click", closeMenuOutside);
    }, 0);
  } else {
    document.removeEventListener("click", closeMenuOutside);
  }
}

function closeMenu() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.remove("active");
  document.removeEventListener("click", closeMenuOutside);
}

function closeMenuOutside(event) {
  const menu = document.getElementById("dropdownMenu");
  const btn = document.getElementById("menuBtn");

  if (!menu.contains(event.target) && !btn.contains(event.target)) {
    closeMenu();
  }
}

function triggerImport() {
  closeMenu();
  document.getElementById("importFileInput").click();
}

function handleFileImport(input) {
  const file = input.files[0];
  if (file && planner) {
    planner.importData(file);
    input.value = "";
  }
  closeMenu();
}

// Homework resource functions
function toggleHomeworkResources() {
  const resourceSection = document.getElementById("homeworkResourcesSection");
  const trigger = document.querySelector(".homework-resources-trigger");

  if (resourceSection.classList.contains("active")) {
    resourceSection.classList.remove("active");
    trigger.innerHTML = "Agregar recursos para la tarea";
  } else {
    resourceSection.classList.add("active");
    trigger.innerHTML = "Ocultar recursos";

    // Setup drag and drop if not already setup
    const uploadArea = resourceSection.querySelector(".file-upload-area");
    if (uploadArea && !uploadArea.classList.contains("drag-setup")) {
      planner.setupDragAndDropForElement(uploadArea, "homework");
      uploadArea.classList.add("drag-setup");
    }
  }
}

function toggleHomeworkResourceType(button, type) {
  const resourceSection = button.closest(".resources-main-section");
  const buttons = resourceSection.querySelectorAll(".resource-type-btn");
  const fileSection = resourceSection.querySelector(".file-upload-section");
  const linkSection = resourceSection.querySelector(".link-upload-section");

  buttons.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");

  if (type === "file") {
    fileSection.style.display = "block";
    linkSection.style.display = "none";
  } else {
    fileSection.style.display = "none";
    linkSection.style.display = "block";
  }
}

function triggerHomeworkFileInput() {
  document.getElementById("homeworkFileInput").click();
}

function handleHomeworkFileSelect(input) {
  const files = Array.from(input.files);
  files.forEach((file) => {
    if (planner) {
      planner.handleHomeworkFileUpload(file);
    }
  });
  input.value = "";
}

function removeHomeworkFile(button, fileId) {
  if (planner) {
    planner.fileStorage.delete(fileId);
    planner.saveFileStorage();
    button.closest(".file-item").remove();

    // Remove from homework resources
    planner.homeworkResources.files = planner.homeworkResources.files.filter(
      (f) => f.id !== fileId
    );

    planner.showNotification("Archivo eliminado", "info");
  }
}

function addHomeworkLinkResource() {
  const nameInput = document.getElementById("homeworkResourceName");
  const urlInput = document.getElementById("homeworkResourceUrl");

  const name = nameInput.value.trim();
  const url = urlInput.value.trim();

  if (!name || !url) {
    if (planner) {
      planner.showNotification(
        "Completa el nombre y URL del recurso",
        "warning"
      );
    }
    return;
  }

  try {
    new URL(url);
  } catch {
    if (planner) {
      planner.showNotification("URL inválida", "warning");
    }
    return;
  }

  // Add to homework resources
  if (!planner.homeworkResources.links) {
    planner.homeworkResources.links = [];
  }
  planner.homeworkResources.links.push({ name, url });

  planner.addHomeworkLinkResourceToDOM(name, url);

  nameInput.value = "";
  urlInput.value = "";

  if (planner) {
    planner.showNotification("Enlace agregado exitosamente", "success");
  }
}

function removeHomeworkLinkResource(button) {
  const linkItem = button.closest(".link-resource-item");
  const name = linkItem.querySelector(".link-resource-name").textContent;
  const url = linkItem.querySelector(".link-resource-url").href;

  // Remove from homework resources
  if (planner.homeworkResources.links) {
    planner.homeworkResources.links = planner.homeworkResources.links.filter(
      (link) => link.name !== name || link.url !== url
    );
  }

  linkItem.remove();

  if (planner) {
    planner.showNotification("Enlace eliminado", "info");
  }
}

// Activity resource functions
function toggleResourceSection(button) {
  const activityItem = button.closest(".activity-item");
  const resourceSection = activityItem.querySelector(".resources-main-section");

  if (resourceSection.classList.contains("active")) {
    resourceSection.classList.remove("active");
    button.innerHTML = "Agregar recursos para esta actividad";
  } else {
    resourceSection.classList.add("active");
    button.innerHTML = "Ocultar recursos";
  }
}

function toggleResourceType(button, type) {
  const resourceSection = button.closest(".resources-main-section");
  const buttons = resourceSection.querySelectorAll(".resource-type-btn");
  const fileSection = resourceSection.querySelector(".file-upload-section");
  const linkSection = resourceSection.querySelector(".link-upload-section");

  buttons.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");

  if (type === "file") {
    fileSection.style.display = "block";
    linkSection.style.display = "none";
  } else {
    fileSection.style.display = "none";
    linkSection.style.display = "block";
  }
}

function triggerFileInput(uploadArea) {
  const fileInput = uploadArea.querySelector(".file-input");
  fileInput.click();
}

function handleFileSelect(input) {
  const files = Array.from(input.files);
  const activityElement = input.closest(".activity-item");

  files.forEach((file) => {
    if (planner) {
      planner.handleFileUpload(file, activityElement);
    }
  });

  input.value = "";
}

function removeFile(button, fileId) {
  if (planner) {
    planner.fileStorage.delete(fileId);
    planner.saveFileStorage();
    button.closest(".file-item").remove();
    planner.showNotification("Archivo eliminado", "info");
  }
}

function previewFile(fileId) {
  if (planner) {
    planner.previewFile(fileId);
  }
}

function closeClassDetailModal() {
  if (planner) {
    planner.closeClassDetailModal();
  }
}

function closeModal() {
  if (planner) {
    planner.closeModal();
  }
}

function addActivity() {
  if (planner) {
    planner.addActivityElement();
    planner.showNotification("Nueva actividad agregada", "success");
  }
}

function removeActivity(button) {
  const activitiesList = document.getElementById("activitiesList");
  if (activitiesList.children.length > 1) {
    if (planner) {
      const activityElement = button.closest(".activity-item");
      activityElement.querySelectorAll(".file-item").forEach((fileItem) => {
        const fileId = fileItem.dataset.fileId;
        planner.fileStorage.delete(fileId);
      });
      planner.saveFileStorage();
    }

    button.closest(".activity-item").remove();
    if (planner) {
      planner.showNotification("Actividad eliminada", "info");
    }
  } else {
    if (planner) {
      planner.showNotification("Debe haber al menos una actividad", "warning");
    }
  }
}

function addLinkResource(button) {
  const activityItem = button.closest(".activity-item");
  const nameInput = activityItem.querySelector(".resource-name-input");
  const urlInput = activityItem.querySelector(".resource-url-input");

  const name = nameInput.value.trim();
  const url = urlInput.value.trim();

  if (!name || !url) {
    if (planner) {
      planner.showNotification(
        "Completa el nombre y URL del recurso",
        "warning"
      );
    }
    return;
  }

  try {
    new URL(url);
  } catch {
    if (planner) {
      planner.showNotification("URL inválida", "warning");
    }
    return;
  }

  const linksList = activityItem.querySelector(".link-resources-list");
  const linkId = "link_" + Date.now();

  const linkItem = document.createElement("div");
  linkItem.className = "link-resource-item";
  linkItem.dataset.linkId = linkId;

  linkItem.innerHTML = `
        <div class="link-resource-info">
            <span class="link-resource-name">${name}</span>
            <a href="${url}" target="_blank" class="link-resource-url">${getDomainFromUrl(
    url
  )}</a>
        </div>
        <button type="button" class="remove-link-resource" onclick="removeLinkResource(this)" title="Eliminar">×</button>
    `;

  linksList.appendChild(linkItem);

  nameInput.value = "";
  urlInput.value = "";

  if (planner) {
    planner.showNotification("Enlace agregado exitosamente", "success");
  }
}

function removeLinkResource(button) {
  button.closest(".link-resource-item").remove();
  if (planner) {
    planner.showNotification("Enlace eliminado", "info");
  }
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function handleImport(input) {
  const file = input.files[0];
  if (file && planner) {
    planner.importData(file);
    input.value = "";
  }
}

function toggleAllClasses() {
  const allClassItems = document.querySelectorAll(".class-item");
  const expandAllBtn = document.getElementById("expandAllBtn");
  const expandAllIcon = document.getElementById("expandAllIcon");
  const expandAllText = document.getElementById("expandAllText");

  if (allClassItems.length === 0) return;

  const firstClassIsCompressed =
    allClassItems[0].classList.contains("compressed");

  if (firstClassIsCompressed) {
    allClassItems.forEach((classItem, index) => {
      setTimeout(() => {
        const classId = classItem.dataset.classId;
        if (classItem.classList.contains("compressed")) {
          toggleClassExpansion(classId);
        }
      }, index * 100);
    });

    expandAllIcon.textContent = "";
    expandAllText.textContent = "Comprimir todas";
  } else {
    allClassItems.forEach((classItem, index) => {
      setTimeout(() => {
        const classId = classItem.dataset.classId;
        if (!classItem.classList.contains("compressed")) {
          toggleClassExpansion(classId);
        }
      }, index * 50);
    });

    // expandAllIcon.textContent = "";
    // expandAllText.textContent = "Expandir todas";
  }
}

function toggleClassExpansion(classId, event) {
  // Si viene de un botón, no hacer nada
  if (event && event.target.closest("button")) {
    event.stopPropagation();
    return;
  }

  const classCard = document.querySelector(
    `.class-card[data-class-id="${classId}"]`
  );
  const content = classCard.querySelector(".class-card-content");
  const expandIcon = classCard.querySelector(".icon-expand");

  if (classCard.classList.contains("expanded")) {
    classCard.classList.remove("expanded");
    content.style.display = "none";
  } else {
    classCard.classList.add("expanded");
    content.style.display = "block";
  }
}

// Share functions
function exportClassWithFiles() {
  if (!planner.currentShareClassId) return;

  planner.generateClassWithFiles(planner.currentShareClassId);
  planner.showNotification("Archivo HTML generado con archivos", "success");
  planner.closeShareModal();
}

function shareAsJson() {
  if (!planner.currentShareClassId) return;

  const shareableContent = planner.generateShareableContent(
    planner.currentShareClassId
  );
  const blob = new Blob([JSON.stringify(shareableContent, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clase-ingles-${shareableContent.date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  planner.showNotification("Archivo descargado exitosamente", "success");
  planner.closeShareModal();
}

function shareAsText() {
  if (!planner.currentShareClassId) return;

  const text = planner.generateShareableText(planner.currentShareClassId);

  navigator.clipboard
    .writeText(text)
    .then(() => {
      document.getElementById("shareSuccess").classList.add("active");
      setTimeout(() => {
        planner.closeShareModal();
        switchTab("view");
      }, 2000);
    })
    .catch(() => {
      planner.showNotification("No se pudo copiar al portapapeles", "warning");
    });
}

function closeShareModal() {
  if (planner) {
    planner.closeShareModal();
  }
}

// Translation functionality
async function translateText() {
  const sourceText = document.getElementById("sourceText").value.trim();
  const sourceLang = document.getElementById("sourceLang").value;
  const targetLang = document.getElementById("targetLang").value;

  if (!sourceText) {
    if (planner) {
      planner.showNotification(
        "Por favor, ingresa texto para traducir",
        "warning"
      );
    }
    return;
  }

  if (sourceText.length > 5000) {
    if (planner) {
      planner.showNotification(
        "El texto es demasiado largo (máx. 5000 caracteres)",
        "warning"
      );
    }
    return;
  }

  if (sourceLang === targetLang) {
    if (planner) {
      planner.showNotification(
        "Los idiomas de origen y destino deben ser diferentes",
        "warning"
      );
    }
    return;
  }

  const targetTextArea = document.getElementById("targetText");
  targetTextArea.value = "Traduciendo...";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      sourceText
    )}`;

    const response = await fetch(url);
    const data = await response.json();

    let translatedText = "";
    data[0].forEach((item) => {
      if (item[0]) {
        translatedText += item[0];
      }
    });

    targetTextArea.value = translatedText;

    if (planner) {
      planner.showNotification("Traducción completada", "success");
    }
  } catch (error) {
    console.error("Translation error:", error);
    targetTextArea.value = "";
    if (planner) {
      planner.showNotification(
        "Error al traducir. Por favor, intenta nuevamente.",
        "error"
      );
    }
  }
}

function swapLanguages() {
  const sourceLang = document.getElementById("sourceLang");
  const targetLang = document.getElementById("targetLang");
  const sourceText = document.getElementById("sourceText");
  const targetText = document.getElementById("targetText");

  // Swap languages
  const tempLang = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = tempLang;

  // Swap texts
  const tempText = sourceText.value;
  sourceText.value = targetText.value;
  targetText.value = tempText;

  updateCharCount();
}

function copyTranslation() {
  const targetText = document.getElementById("targetText").value;

  if (!targetText || targetText === "Traduciendo...") {
    if (planner) {
      planner.showNotification("No hay traducción para copiar", "warning");
    }
    return;
  }

  navigator.clipboard.writeText(targetText).then(() => {
    if (planner) {
      planner.showNotification("Traducción copiada al portapapeles", "success");
    }
  });
}

function clearTranslation() {
  document.getElementById("sourceText").value = "";
  document.getElementById("targetText").value = "";
  updateCharCount();
}

function updateCharCount() {
  const sourceText = document.getElementById("sourceText").value;
  const charCount = document.getElementById("sourceCharCount");
  const length = sourceText.length;

  charCount.textContent = `${length} / 5000 caracteres`;

  charCount.classList.remove("warning", "error");
  if (length > 4500) {
    charCount.classList.add("error");
  } else if (length > 4000) {
    charCount.classList.add("warning");
  }
}

function selectCourse(courseId) {
  if (!planner) return;

  // Establecer el curso actual
  planner.currentCourseId = courseId;

  // Obtener el nombre del curso
  const course = planner.courses.find((c) => c.id === courseId);
  const courseName = course ? course.name : "Clases del Curso";

  // Ocultar lista de cursos
  document.getElementById("coursesListView").style.display = "none";

  // Mostrar vista de clases del curso
  document.getElementById("courseClassesView").style.display = "block";
  document.getElementById("currentCourseName").textContent = courseName;

  // Renderizar las clases del curso
  planner.renderClasses();
}

function deselectCourse() {
  planner.currentCourseId = null;
  planner.renderClasses();
  document.querySelectorAll(".course-item").forEach((item) => {
    item.classList.remove("active");
  });
}

function backToCourses() {
  if (planner) {
    planner.currentCourseId = null;

    // Mostrar lista de cursos
    document.getElementById("coursesListView").style.display = "block";

    // Ocultar vista de clases
    document.getElementById("courseClassesView").style.display = "none";

    // Re-renderizar la lista de cursos
    renderCoursesList();
  }
}

function createClassInCurrentCourse() {
  if (!planner || !planner.currentCourseId) {
    alert("Error: No hay un curso seleccionado");
    return;
  }

  // Cambiar a la pestaña de crear clase
  switchTab("create");

  // Pre-seleccionar el curso actual
  setTimeout(() => {
    const courseSelect = document.getElementById("courseName");
    if (courseSelect) {
      courseSelect.value = planner.currentCourseId;
      // Opcional: deshabilitar el select para que no cambie de curso
      courseSelect.disabled = true;
    }
  }, 100);
}

function createNewCourse() {
  const courseName = prompt("Ingresa el nombre del nuevo curso:");
  if (courseName) {
    planner.createCourse(courseName);
    renderCoursesList();
    planner.showNotification("Curso creado exitosamente", "success");
  }
}

function renderCoursesList() {
  const container = document.getElementById("coursesList");
  if (!container) return;

  const sortedCourses = [...planner.courses].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );

  container.innerHTML = sortedCourses
    .map(
      (course) => `
        <div class="course-item" data-course-id="${
          course.id
        }" onclick="selectCourse('${course.id}')">
            <div class="course-header" style="border-left: 4px solid ${
              course.color
            };">
                <div class="course-name">${course.name}</div>
                <div class="course-count">${
                  planner.getClassesByCourse(course.id).length
                } clases</div>
            </div>
            <div class="course-actions">
                <button onclick="createClassInCourse('${
                  course.id
                }')" class="btn btn-secondary btn-small">
                    <span class="icon icon-plus"></span>
                    <span class="btn-text">Nueva Clase</span>
                </button>
                <button onclick="editCourseDialog('${
                  course.id
                }')" class="btn btn-secondary btn-small">
                    <span class="icon icon-edit"></span>
                    <span class="btn-text">Editar</span>
                </button>
                <button onclick="planner.deleteCourse('${
                  course.id
                }')" class="btn btn-danger btn-small">
                    <span class="icon icon-delete"></span>
                    <span class="btn-text">Eliminar</span>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function editCourseDialog(courseId) {
  const course = planner.courses.find((c) => c.id === courseId);
  const newName = prompt("Nuevo nombre del curso:", course.name);
  if (newName) {
    planner.editCourse(courseId, newName);
    renderCoursesList();
  }
}

function updateCourseSelectOptions() {
  if (!planner) return;
  const select = document.getElementById("courseName");
  if (!select) return;

  const options =
    '<option value="">-- Selecciona un curso --</option>' +
    planner.courses
      .map((course) => `<option value="${course.id}">${course.name}</option>`)
      .join("");

  select.innerHTML = options;
}

function updateCourseFilterOptions() {
  if (!planner) return;
  const select = document.getElementById("courseFilter");
  if (!select) return;

  const currentValue = select.value;
  const options =
    '<option value="">Todas las clases</option>' +
    planner.courses
      .map((course) => `<option value="${course.id}">${course.name}</option>`)
      .join("");

  select.innerHTML = options;
  select.value = currentValue;
}

function createClassInCourse(courseId) {
  if (!planner) return;

  planner.currentCourseId = courseId;

  // Cambiar a la pestaña de crear clase
  switchTab("create");

  // Pre-seleccionar el curso
  setTimeout(() => {
    const courseSelect = document.getElementById("courseName");
    updateCourseSelectOptions();
    if (courseSelect) {
      courseSelect.value = courseId;
    }
  }, 100);
}

function cancelCreateClass() {
  // Limpiar el formulario
  if (planner) {
    planner.resetForm();
  }

  // Volver a la vista de clases del curso
  if (planner && planner.currentCourseId) {
    switchTab("courses");

    // Asegurar que se muestre la vista correcta
    setTimeout(() => {
      document.getElementById("coursesListView").style.display = "none";
      document.getElementById("courseClassesView").style.display = "block";

      // Forzar el re-render de las clases del curso actual
      planner.renderClasses();
    }, 50);
  } else {
    // Si no hay curso seleccionado, volver a la lista de cursos
    backToCourses();
  }
}

// Menu functions
function toggleMenu() {
  const menu = document.getElementById("dropdownMenu");
  const btn = document.getElementById("menuBtn");
  menu.classList.toggle("active");

  // Close menu when clicking outside
  if (menu.classList.contains("active")) {
    setTimeout(() => {
      document.addEventListener("click", closeMenuOutside);
    }, 0);
  } else {
    document.removeEventListener("click", closeMenuOutside);
  }
}

function closeMenu() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.remove("active");
  document.removeEventListener("click", closeMenuOutside);
}

function closeMenuOutside(event) {
  const menu = document.getElementById("dropdownMenu");
  const btn = document.getElementById("menuBtn");

  if (!menu.contains(event.target) && !btn.contains(event.target)) {
    closeMenu();
  }
}

function triggerImport() {
  closeMenu();
  document.getElementById("importFileInput").click();
}

function handleFileImport(input) {
  const file = input.files[0];
  if (file && planner) {
    planner.importData(file);
    input.value = "";
  }
}

function showNotification(title, message, type = "info", duration = 5000) {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <div class="notification-icon"></div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

  container.appendChild(notification);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.add("hiding");
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }

  return notification;
}

function initializeNotifications() {
  // Crear contenedor si no existe
  let container = document.getElementById("notificationContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "notificationContainer";
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  // Forzar estilos de posición
  container.style.position = "fixed";
  container.style.top = "20px";
  container.style.right = "20px";
  container.style.zIndex = "10000";
}

function showNotification(title, message, type = "info", duration = 5000) {
  // Asegurar que el contenedor esté inicializado
  initializeNotifications();

  const container = document.getElementById("notificationContainer");

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <div class="notification-icon"></div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="closeNotification(this)">×</button>
    `;

  container.appendChild(notification);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      closeNotification(notification.querySelector(".notification-close"));
    }, duration);
  }

  return notification;
}

function closeNotification(closeButton) {
  const notification = closeButton.closest(".notification");
  if (notification) {
    notification.classList.add("hiding");
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 300);
  }
}

// Inicializar al cargar la página
document.addEventListener("DOMContentLoaded", initializeNotifications);

// Event listeners for translation
document.addEventListener("DOMContentLoaded", () => {
  const sourceTextArea = document.getElementById("sourceText");
  if (sourceTextArea) {
    sourceTextArea.addEventListener("input", updateCharCount);

    // Allow Enter to translate (Ctrl+Enter for new line)
    sourceTextArea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        translateText();
      }
    });
  }
});

// INICIALIZAR PLANNER
document.addEventListener("DOMContentLoaded", () => {
  planner = new EnglishClassPlanner();
  console.log("Planificador de Clases inicializado correctamente");

  // Llamar funciones de inicialización después de crear el planner
  setTimeout(() => {
    if (typeof renderCoursesList === "function") {
      renderCoursesList();
    }
    if (typeof updateCourseSelectOptions === "function") {
      updateCourseSelectOptions();
    }
    if (typeof updateCourseFilterOptions === "function") {
      updateCourseFilterOptions();
    }
  }, 600);
});
