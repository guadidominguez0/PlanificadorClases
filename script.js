class EnglishClassPlanner {
    constructor() {
        this.classes = this.loadClasses();
        this.fileStorage = this.loadFileStorage();
        this.homeworkResources = { files: [], links: [] };
        this.homeworkQuillEditor = null;
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

    showStorageInfo() {
        const classesSize = JSON.stringify(this.classes).length;
        const filesSize = JSON.stringify(Object.fromEntries(this.fileStorage)).length;
        const totalSize = classesSize + filesSize;
        
        console.log('📊 Información de almacenamiento:');
        console.log(`- Clases: ${(classesSize / 1024).toFixed(2)} KB`);
        console.log(`- Archivos: ${(filesSize / 1024).toFixed(2)} KB`);
        console.log(`- Total: ${(totalSize / 1024).toFixed(2)} KB`);
        console.log(`- Clases guardadas: ${this.classes.length}`);
        console.log(`- Archivos guardados: ${this.fileStorage.size}`);
        
        const classCountEl = document.getElementById('classCount');
        const fileCountEl = document.getElementById('fileCount');
        const storageSizeEl = document.getElementById('storageSize');
        
        if (classCountEl) classCountEl.textContent = this.classes.length;
        if (fileCountEl) fileCountEl.textContent = this.fileStorage.size;
        if (storageSizeEl) storageSizeEl.textContent = `${(totalSize / 1024).toFixed(2)} KB`;
    }

    exportData() {
        const data = {
            classes: this.classes,
            files: Object.fromEntries(this.fileStorage),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `english-classes-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📥 Datos exportados exitosamente', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.classes && Array.isArray(data.classes)) {
                    this.classes = data.classes.sort((a, b) => new Date(b.date) - new Date(a.date));
                    this.saveClasses();
                }
                
                if (data.files && typeof data.files === 'object') {
                    this.fileStorage = new Map(Object.entries(data.files));
                    this.saveFileStorage();
                }
                
                this.renderClasses();
                this.showNotification('📤 Datos importados exitosamente', 'success');
                this.showStorageInfo();
                
            } catch (error) {
                this.showNotification('❌ Error al importar datos: archivo inválido', 'error');
                console.error('Import error:', error);
            }
        };
        
        reader.readAsText(file);
    }

    clearAllData() {
        if (confirm('⚠️ ¿Estás seguro de que deseas eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
            this.fileStorage.clear();
            this.classes = [];
            this.saveClasses();
            this.saveFileStorage();
            this.renderClasses();
            this.showStorageInfo();
            this.showNotification('🗑️ Todos los datos han sido eliminados', 'warning');
        }
    }

    loadClasses() {
        const stored = JSON.parse(localStorage.getItem('englishClasses') || '[]');
        return stored.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    loadFileStorage() {
        const storedFiles = JSON.parse(localStorage.getItem('englishClassFiles') || '{}');
        const fileMap = new Map();
        
        Object.keys(storedFiles).forEach(key => {
            fileMap.set(key, storedFiles[key]);
        });
        
        return fileMap;
    }

    saveClasses() {
        localStorage.setItem('englishClasses', JSON.stringify(this.classes));
    }

    saveFileStorage() {
        const fileObject = {};
        this.fileStorage.forEach((value, key) => {
            fileObject[key] = value;
        });
        localStorage.setItem('englishClassFiles', JSON.stringify(fileObject));
    }

    setTodayAsDefault() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('classDate').value = today;
    }

    addInitialActivity() {
        if (document.getElementById('activitiesList').children.length === 0) {
            this.addActivityElement();
        }
    }

    initializeEventListeners() {
        document.getElementById('classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addClass();
        });

        document.getElementById('searchBox').addEventListener('input', (e) => {
            this.filterClasses(e.target.value);
        });

        document.getElementById('fileModal').addEventListener('click', (e) => {
            if (e.target.id === 'fileModal') {
                this.closeModal();
            }
        });

        document.getElementById('classDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'classDetailModal') {
                this.closeClassDetailModal();
            }
        });

        // Setup homework drag and drop
        this.setupHomeworkDragAndDrop();
    }

    setupHomeworkDragAndDrop() {
        const homeworkUploadArea = document.querySelector('#homeworkResourcesSection .file-upload-area');
        if (homeworkUploadArea) {
            this.setupDragAndDropForElement(homeworkUploadArea, 'homework');
        }
    }

    setupDragAndDropForElement(uploadArea, type = 'activity') {
        const events = ['dragenter', 'dragover', 'dragleave', 'drop'];
        
        events.forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            });
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            
            if (type === 'homework') {
                files.forEach(file => {
                    this.handleHomeworkFileUpload(file);
                });
            } else {
                const activityElement = uploadArea.closest('.activity-item');
                files.forEach(file => {
                    this.handleFileUpload(file, activityElement);
                });
            }
        });
    }

    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    handleFileUpload(file, activityElement) {
        const maxSize = 10 * 1024 * 1024;
        
        if (file.size > maxSize) {
            this.showNotification('⚠️ El archivo es demasiado grande (máx. 10MB)', 'warning');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('⚠️ Tipo de archivo no permitido', 'warning');
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
                data: e.target.result
            };

            this.fileStorage.set(fileId, fileData);
            this.saveFileStorage();
            this.addFileToActivity(activityElement, fileData);
            this.showNotification('✅ Archivo subido exitosamente', 'success');
        };

        reader.readAsDataURL(file);
    }

    handleHomeworkFileUpload(file) {
        const maxSize = 10 * 1024 * 1024;
        
        if (file.size > maxSize) {
            this.showNotification('⚠️ El archivo es demasiado grande (máx. 10MB)', 'warning');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('⚠️ Tipo de archivo no permitido', 'warning');
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
                data: e.target.result
            };

            this.fileStorage.set(fileId, fileData);
            this.saveFileStorage();
            this.addFileToHomework(fileData);
            this.showNotification('✅ Archivo subido exitosamente', 'success');
        };

        reader.readAsDataURL(file);
    }

    addFileToActivity(activityElement, fileData) {
        const uploadedFiles = activityElement.querySelector('.uploaded-files');
        const fileItem = this.createDraggableFileItem(fileData);
        uploadedFiles.appendChild(fileItem);
    }

    addFileToHomework(fileData) {
        const uploadedFiles = document.getElementById('homeworkUploadedFiles');
        const fileItem = this.createDraggableFileItem(fileData, 'homework');
        uploadedFiles.appendChild(fileItem);
        
        this.homeworkResources.files.push({
            id: fileData.id,
            name: fileData.name,
            type: fileData.type,
            size: fileData.size
        });
    }

    createDraggableFileItem(fileData, type = 'activity') {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item draggable';
        fileItem.dataset.fileId = fileData.id;
        fileItem.draggable = true;

        const fileIcon = this.getFileIcon(fileData.type);
        const fileSize = this.formatFileSize(fileData.size);

        fileItem.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="file-info">
                <span class="file-icon">${fileIcon}</span>
                <div class="file-details">
                    <span class="file-name">${fileData.name}</span>
                    <span class="file-size">${fileSize}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-preview-btn" onclick="previewFile('${fileData.id}')" title="Ver archivo">👁️</button>
                <button class="file-remove-btn" onclick="${type === 'homework' ? 'removeHomeworkFile' : 'removeFile'}(this, '${fileData.id}')" title="Eliminar">🗑️</button>
            </div>
        `;

        this.makeDraggable(fileItem, type);
        return fileItem;
    }

    makeDraggable(element, type) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', element.dataset.fileId);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });

        const container = element.closest('.uploaded-files');
        if (container) {
            this.makeSortable(container, type);
        }
    }

    makeSortable(container, type) {
        if (container.sortableInitialized) return;
        container.sortableInitialized = true;

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = container.querySelector('.dragging');
            const siblings = [...container.querySelectorAll('.file-item:not(.dragging)')];
            
            const nextSibling = siblings.find(sibling => {
                return e.clientY <= sibling.getBoundingClientRect().top + sibling.getBoundingClientRect().height / 2;
            });

            container.insertBefore(dragging, nextSibling);
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (type === 'homework') {
                this.updateHomeworkResourcesOrder();
            }
        });
    }

    makeActivityDraggable(activityElement) {
        activityElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', activityElement.dataset.activityId);
            activityElement.classList.add('dragging-activity');
        });

        activityElement.addEventListener('dragend', () => {
            activityElement.classList.remove('dragging-activity');
        });
    }

    makeActivitiesListSortable() {
        const activitiesList = document.getElementById('activitiesList');
        if (activitiesList.sortableInitialized) return;
        activitiesList.sortableInitialized = true;

        activitiesList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = activitiesList.querySelector('.dragging-activity');
            if (!dragging) return;
            
            const siblings = [...activitiesList.querySelectorAll('.activity-item:not(.dragging-activity)')];
            
            const nextSibling = siblings.find(sibling => {
                const rect = sibling.getBoundingClientRect();
                return e.clientY <= rect.top + rect.height / 2;
            });

            activitiesList.insertBefore(dragging, nextSibling);
        });

        activitiesList.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    updateHomeworkResourcesOrder() {
        const fileItems = document.querySelectorAll('#homeworkUploadedFiles .file-item');
        this.homeworkResources.files = Array.from(fileItems).map(item => {
            const fileId = item.dataset.fileId;
            const fileData = this.fileStorage.get(fileId);
            return {
                id: fileId,
                name: fileData.name,
                type: fileData.type,
                size: fileData.size
            };
        });
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType === 'application/pdf') return '📄';
        return '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    previewFile(fileId) {
        const fileData = this.fileStorage.get(fileId);
        if (!fileData) {
            this.showNotification('❌ Archivo no encontrado', 'error');
            return;
        }

        const newWindow = window.open('', '_blank');
        if (newWindow) {
            if (fileData.type.startsWith('image/')) {
                newWindow.document.write(`
                    <html>
                        <head><title>${fileData.name}</title></head>
                        <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0;">
                            <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                        </body>
                    </html>
                `);
            } else if (fileData.type === 'application/pdf') {
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
            this.showNotification('⚠️ No se pudo abrir el archivo. Verifica que los pop-ups estén habilitados.', 'warning');
        }
    }

    closeModal() {
        const modal = document.getElementById('fileModal');
        modal.classList.remove('active');
    }

    closeClassDetailModal() {
        const modal = document.getElementById('classDetailModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    openClassDetailModal(classId) {
        const classData = this.classes.find(c => c.id === classId);
        if (!classData) return;

        const modal = document.getElementById('classDetailModal');
        const title = document.getElementById('classDetailTitle');
        const body = document.getElementById('classDetailBody');

        const dateInfo = this.formatDate(classData.date);
        title.textContent = `Clase del ${dateInfo.full}`;

        const activitiesHtml = classData.activities.map(activity => {
            const filesHtml = activity.files && activity.files.length > 0 
                ? `<div class="activity-files">${activity.files.map(file => this.createFileDisplay(file)).join('')}</div>`
                : '';
            
            const linksHtml = activity.links && activity.links.length > 0 
                ? `<div class="activity-files">${activity.links.map(link => `<a href="${link.url}" target="_blank" class="file-display-item">🔗 ${link.name}</a>`).join('')}</div>`
                : '';
            
            return `
                <div class="activity-display">
                    <div class="activity-type-badge type-${activity.type}">${activity.type}</div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.textHtml || activity.text}</div>
                        ${filesHtml}
                        ${linksHtml}
                    </div>
                </div>
            `;
        }).join('');

        const homeworkHtml = classData.homework 
            ? `
                <div class="homework-section">
                    <div class="homework-title">
                        📝 Homework:
                    </div>
                    <div class="homework-content">${classData.homeworkHtml || classData.homework}</div>
                    ${classData.homeworkFiles && classData.homeworkFiles.length > 0 
                        ? `<div class="activity-files">${classData.homeworkFiles.map(file => this.createFileDisplay(file)).join('')}</div>`
                        : ''}
                    ${classData.homeworkLinks && classData.homeworkLinks.length > 0 
                        ? `<div class="activity-files">${classData.homeworkLinks.map(link => `<a href="${link.url}" target="_blank" class="file-display-item">🔗 ${link.name}</a>`).join('')}</div>`
                        : ''}
                </div>
            `
            : '';

        body.innerHTML = `
            <div class="class-detail-content-full">
                <div class="activities-list">
                    ${activitiesHtml}
                </div>
                ${homeworkHtml}
                <div class="class-actions">
                    <button onclick="planner.editClass('${classData.id}'); planner.closeClassDetailModal();" class="btn btn-secondary">
                        ✏️ Editar
                    </button>
                    <button onclick="planner.shareClass('${classData.id}');" class="btn" style="background: #22c55e; color: white;">
                        🔗 Compartir
                    </button>
                    <button onclick="planner.deleteClass('${classData.id}'); planner.closeClassDetailModal();" class="btn btn-danger">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    createFileUploadArea() {
        return `
            <button type="button" class="add-resource-trigger" onclick="toggleResourceSection(this)">
                📎 Agregar recursos para esta actividad
            </button>
            <div class="resources-main-section">
                <div class="resource-type-selector">
                    <button type="button" class="resource-type-btn active" onclick="toggleResourceType(this, 'file')">
                        📎 Subir archivo
                    </button>
                    <button type="button" class="resource-type-btn" onclick="toggleResourceType(this, 'link')">
                        🔗 Agregar enlace
                    </button>
                </div>
                
                <div class="file-upload-section">
                    <div class="file-upload-area" onclick="triggerFileInput(this)">
                        <input type="file" class="file-input" accept=".pdf,.jpg,.jpeg,.png,.gif" multiple onchange="handleFileSelect(this)">
                        <div class="file-upload-text">📎 Subir archivos</div>
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
                        <button type="button" class="add-resource-btn" onclick="addLinkResource(this)">📎 Agregar Enlace</button>
                    </div>
                    <div class="link-resources-list"></div>
                </div>
            </div>
        `;
    }

    addClass() {
        const date = document.getElementById('classDate').value;
        const homeworkContent = this.homeworkQuillEditor ? this.getRichTextContent(this.homeworkQuillEditor) : { html: '', text: '' };
        const homework = homeworkContent.text;
        
        const activities = this.getActivitiesFromForm();

        if (activities.length === 0) {
            this.showNotification('⚠️ Agrega al menos una actividad para la clase', 'warning');
            return;
        }

        const classData = {
            id: Date.now().toString(),
            date: date,
            activities: activities,
            homework: homework,
            homeworkHtml: homeworkContent.html,
            homeworkFiles: this.homeworkResources.files || [],
            homeworkLinks: this.homeworkResources.links || []
        };

        this.classes.unshift(classData);
        this.saveClasses();
        this.renderClasses();
        this.resetForm();
        this.showStorageInfo();
        
        this.showNotification('✅ Clase guardada exitosamente', 'success');
        
        switchTab('view');
    }

    getActivitiesFromForm() {
        const activities = [];
        const activityElements = document.querySelectorAll('#activitiesList .activity-item');
        
        activityElements.forEach(element => {
            const type = element.querySelector('.activity-type-select').value;
            const textContent = element.quillEditor ? this.getRichTextContent(element.quillEditor) : { html: '', text: '' };
            const text = textContent.text;
            
            if (text) {
                const files = [];
                const links = [];
                
                element.querySelectorAll('.file-item').forEach(fileEl => {
                    const fileId = fileEl.dataset.fileId;
                    const fileData = this.fileStorage.get(fileId);
                    if (fileData) {
                        files.push({
                            id: fileId,
                            name: fileData.name,
                            type: fileData.type,
                            size: fileData.size
                        });
                    }
                });
                
                element.querySelectorAll('.link-resource-item').forEach(linkEl => {
                    const name = linkEl.querySelector('.link-resource-name').textContent;
                    const url = linkEl.querySelector('.link-resource-url').href;
                    links.push({ name, url });
                });
                
                activities.push({ type, text, files, links });
                activities[activities.length - 1].textHtml = textContent.html;
            }
        });
        
        return activities;
    }

    addActivityElement() {
        const activitiesList = document.getElementById('activitiesList');
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item fade-in';
        
        activityDiv.innerHTML = `
            <div class="activity-header">
                <div class="activity-drag-handle">⋮⋮</div>
                <button type="button" class="remove-activity" onclick="removeActivity(this)" title="Eliminar actividad">×</button>
                <div class="activity-main-content">
                    <div class="activity-type-row">
                        <select class="activity-type-select">
                            <option value="activity">🎯 Activity</option>
                            <option value="game">🎮 Game</option>
                            <option value="vocabulary">📝 Vocabulary</option>
                            <option value="explanation">📚 Explanation</option>
                            <option value="review">📋 Review</option>
                            <option value="exam">📊 Exam</option>
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
        activityDiv.dataset.activityId = 'activity_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        this.makeActivityDraggable(activityDiv);
        this.makeActivitiesListSortable();
        
        const addResourceBtn = activityDiv.querySelector('.add-resource-trigger');
        addResourceBtn.addEventListener('click', () => {
            setTimeout(() => {
                const uploadArea = activityDiv.querySelector('.file-upload-area');
                if (uploadArea && !uploadArea.classList.contains('drag-setup')) {
                    this.setupDragAndDropForElement(uploadArea);
                    uploadArea.classList.add('drag-setup');
                }
            }, 100);
        });

        // Initialize rich text editor for this activity
        setTimeout(() => {
            const textContainer = activityDiv.querySelector('.activity-text-input-container');
            const editor = this.initializeRichTextEditor(textContainer, '');
            activityDiv.quillEditor = editor;
        }, 100);
    }

    deleteClass(id) {
        if (confirm('¿Estás seguro de que deseas eliminar esta clase?')) {
            const classData = this.classes.find(c => c.id === id);
            if (classData) {
                classData.activities.forEach(activity => {
                    if (activity.files) {
                        activity.files.forEach(file => {
                            this.fileStorage.delete(file.id);
                        });
                    }
                });
                
                if (classData.homeworkFiles) {
                    classData.homeworkFiles.forEach(file => {
                        this.fileStorage.delete(file.id);
                    });
                }
                
                this.saveFileStorage();
            }
            
            this.classes = this.classes.filter(c => c.id !== id);
            this.saveClasses();
            this.renderClasses();
            this.showStorageInfo();
            this.showNotification('🗑️ Clase eliminada', 'error');
        }
    }

    editClass(id) {
        const classData = this.classes.find(c => c.id === id);
        if (!classData) return;

        switchTab('create');

        document.getElementById('classDate').value = classData.date;
        
        // Set homework rich text content
        if (this.homeworkQuillEditor && classData.homeworkHtml) {
            setTimeout(() => {
                this.setRichTextContent(this.homeworkQuillEditor, classData.homeworkHtml);
            }, 300);
        } else if (this.homeworkQuillEditor && classData.homework) {
            setTimeout(() => {
                this.homeworkQuillEditor.setText(classData.homework);
            }, 300);
        }
        
        // Reset homework resources
        this.homeworkResources = {
            files: [...(classData.homeworkFiles || [])],
            links: [...(classData.homeworkLinks || [])]
        };
        
        // Clear and repopulate homework resources
        const homeworkUploadedFiles = document.getElementById('homeworkUploadedFiles');
        const homeworkLinksList = document.getElementById('homeworkLinkResourcesList');
        if (homeworkUploadedFiles) homeworkUploadedFiles.innerHTML = '';
        if (homeworkLinksList) homeworkLinksList.innerHTML = '';
        
        // Load homework files
        if (classData.homeworkFiles && classData.homeworkFiles.length > 0) {
            classData.homeworkFiles.forEach(fileRef => {
                const fileData = this.fileStorage.get(fileRef.id);
                if (fileData) {
                    const fileItem = this.createDraggableFileItem(fileData, 'homework');
                    if (homeworkUploadedFiles) homeworkUploadedFiles.appendChild(fileItem);
                }
            });
        }
        
        // Load homework links
        if (classData.homeworkLinks && classData.homeworkLinks.length > 0) {
            classData.homeworkLinks.forEach(link => {
                this.addHomeworkLinkResourceToDOM(link.name, link.url);
            });
        }
        
        const activitiesList = document.getElementById('activitiesList');
        activitiesList.innerHTML = '';
        
        classData.activities.forEach(activity => {
            this.addActivityElement();
            const lastActivity = activitiesList.lastElementChild;
            lastActivity.querySelector('.activity-type-select').value = activity.type;
            
            activity.files.forEach(fileRef => {
                const fileData = this.fileStorage.get(fileRef.id);
                if (fileData) {
                    this.addFileToActivity(lastActivity, fileData);
                }
            });
            
            activity.links.forEach(link => {
                this.addLinkResourceToActivity(lastActivity, link.name, link.url);
            });
        });

        // Set activity rich text content
        setTimeout(() => {
            const activityElements = activitiesList.querySelectorAll('.activity-item');
            classData.activities.forEach((activity, index) => {
                if (activityElements[index] && activityElements[index].quillEditor && activity.textHtml) {
                    this.setRichTextContent(activityElements[index].quillEditor, activity.textHtml);
                } else if (activityElements[index] && activityElements[index].quillEditor && activity.text) {
                    activityElements[index].quillEditor.setText(activity.text);
                }
            });
        }, 400);

        this.deleteClassSilent(id);
        this.showNotification('📝 Clase cargada para edición', 'info');
    }

    addLinkResourceToActivity(activityElement, name, url) {
        const linksList = activityElement.querySelector('.link-resources-list');
        const linkId = 'link_' + Date.now();
        
        const linkItem = document.createElement('div');
        linkItem.className = 'link-resource-item';
        linkItem.dataset.linkId = linkId;
        
        linkItem.innerHTML = `
            <div class="link-resource-info">
                <span class="link-resource-name">${name}</span>
                <a href="${url}" target="_blank" class="link-resource-url">${this.getDomainFromUrl(url)}</a>
            </div>
            <button type="button" class="remove-link-resource" onclick="removeLinkResource(this)" title="Eliminar">×</button>
        `;
        
        linksList.appendChild(linkItem);
    }

    addHomeworkLinkResourceToDOM(name, url) {
        const linksList = document.getElementById('homeworkLinkResourcesList');
        const linkId = 'link_' + Date.now();
        
        const linkItem = document.createElement('div');
        linkItem.className = 'link-resource-item';
        linkItem.dataset.linkId = linkId;
        
        linkItem.innerHTML = `
            <div class="link-resource-info">
                <span class="link-resource-name">${name}</span>
                <a href="${url}" target="_blank" class="link-resource-url">${this.getDomainFromUrl(url)}</a>
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
        this.classes = this.classes.filter(c => c.id !== id);
        this.saveClasses();
        this.renderClasses();
    }

    resetForm() {
        document.getElementById('classForm').reset();
        
        const activitiesList = document.getElementById('activitiesList');
        activitiesList.innerHTML = '';
        this.addActivityElement();
        
        // Reset homework resources
        this.homeworkResources = { files: [], links: [] };
        document.getElementById('homeworkUploadedFiles').innerHTML = '';
        document.getElementById('homeworkLinkResourcesList').innerHTML = '';
        
        this.setTodayAsDefault();
        
        // Initialize homework rich text editor
        setTimeout(() => {
            this.initializeHomeworkEditor();
        }, 200);
    }

    createFileDisplay(file) {
        const icon = this.getFileIcon(file.type);
        return `
            <div class="file-display-item" onclick="previewFile('${file.id}')" title="Ver ${file.name}">
                ${icon} ${file.name}
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        
        const dayName = days[date.getDay()];
        const day = date.getDate().toString().padStart(2, '0');
        const month = months[date.getMonth()];
        
        return {
            full: `${dayName} ${day}/${month}`,
            weekday: dayName.substring(0, 3).toUpperCase()
        };
    }

    renderClasses(classesToRender = this.classes) {
        const container = document.getElementById('classesList');
        
        if (classesToRender.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No se encontraron clases.<br>¡Crea tu primera clase de inglés!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = classesToRender.map(classData => {
            const dateInfo = this.formatDate(classData.date);
            
            const activitiesCount = classData.activities.length;
            const activityTypes = [...new Set(classData.activities.map(a => a.type))];
            const hasHomework = classData.homework ? true : false;
            const totalResources = classData.activities.reduce((total, activity) => {
                return total + (activity.files?.length || 0) + (activity.links?.length || 0);
            }, 0) + (classData.homeworkFiles?.length || 0) + (classData.homeworkLinks?.length || 0);

            const summaryText = `${activitiesCount} actividad${activitiesCount !== 1 ? 'es' : ''} • Tipos: ${activityTypes.join(', ')}${totalResources > 0 ? ` • ${totalResources} recurso${totalResources !== 1 ? 's' : ''}` : ''}${hasHomework ? ' • Con tarea' : ''}`;

            return `
                <div class="class-item compressed fade-in" data-class-id="${classData.id}">
                    <div class="class-header">
                        <div class="class-date-title">
                            <span class="class-weekday">${dateInfo.weekday}</span>
                            ${dateInfo.full}
                        </div>
                        <div class="class-header-actions">
                            <button class="expand-toggle-btn" onclick="toggleClassExpansion('${classData.id}')">
                                <span class="toggle-icon">👁️</span>
                                <span class="toggle-text">Ver detalles</span>
                            </button>
                            <button class="view-full-btn" onclick="planner.openClassDetailModal('${classData.id}')" title="Ver en pantalla completa">
                                📋 Ver completa
                            </button>
                        </div>
                    </div>
                    
                    <div class="class-summary">
                        ${summaryText}
                    </div>
                    
                    <div class="activities-list" style="display: none;">
                        ${classData.activities.map(activity => {
                            const filesHtml = activity.files && activity.files.length > 0 
                                ? `<div class="activity-files">${activity.files.map(file => this.createFileDisplay(file)).join('')}</div>`
                                : '';
                            
                            const linksHtml = activity.links && activity.links.length > 0 
                                ? `<div class="activity-files">${activity.links.map(link => `<a href="${link.url}" target="_blank" class="file-display-item">🔗 ${link.name}</a>`).join('')}</div>`
                                : '';
                            
                            return `
                                <div class="activity-display">
                                    <div class="activity-type-badge type-${activity.type}">${activity.type}</div>
                                    <div class="activity-content">
                                        <div class="activity-text">${activity.textHtml || activity.text}</div>
                                        ${filesHtml}
                                        ${linksHtml}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    ${classData.homework ? `
                        <div class="homework-section" style="display: none;">
                            <div class="homework-title">📝 Homework:</div>
                            <div class="homework-content">${classData.homeworkHtml || classData.homework}</div>
                            ${classData.homeworkFiles && classData.homeworkFiles.length > 0 
                                ? `<div class="activity-files">${classData.homeworkFiles.map(file => this.createFileDisplay(file)).join('')}</div>`
                                : ''}
                            ${classData.homeworkLinks && classData.homeworkLinks.length > 0 
                                ? `<div class="activity-files">${classData.homeworkLinks.map(link => `<a href="${link.url}" target="_blank" class="file-display-item">🔗 ${link.name}</a>`).join('')}</div>`
                                : ''}
                        </div>
                    ` : ''}
                    
                    <div class="class-actions" style="display: none;">
                        <button onclick="planner.editClass('${classData.id}')" class="btn btn-secondary btn-small">
                            ✏️ Editar
                        </button>
                        <button onclick="planner.shareClass('${classData.id}')" class="btn btn-small" style="background: #22c55e;">
                            🔗 Compartir
                        </button>
                        <button onclick="planner.deleteClass('${classData.id}')" class="btn btn-danger btn-small">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterClasses(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderClasses();
            return;
        }

        const filtered = this.classes.filter(classData => 
            classData.activities.some(activity => 
                activity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                activity.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (activity.files && activity.files.some(file => file.name.toLowerCase().includes(searchTerm.toLowerCase())))
            ) ||
            (classData.homework && classData.homework.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        this.renderClasses(filtered);
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        }, 3500);
    }

    // Rich text editor methods
    initializeRichTextEditor(container, placeholder = 'Escribe aquí...', isHomework = false) {
        const editorId = 'editor-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        
        const editorHTML = `
            <div class="rich-text-container ${isHomework ? 'homework-rich-text-container' : ''}">
                <div id="${editorId}" data-placeholder="${placeholder}"></div>
            </div>
        `;
        
        container.innerHTML = editorHTML;
        
        const quill = new Quill(`#${editorId}`, {
            theme: 'snow',
            placeholder: placeholder,
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }]
                ]
            }
        });
        
        return quill;
    }

    getRichTextContent(quill) {
        const delta = quill.getContents();
        const html = quill.root.innerHTML;
        return {
            html: html === '<p><br></p>' ? '' : html,
            text: quill.getText().trim(),
            delta: delta
        };
    }

    setRichTextContent(quill, content) {
        if (typeof content === 'string') {
            quill.root.innerHTML = content;
        } else if (content && content.delta) {
            quill.setContents(content.delta);
        } else if (content && content.html) {
            quill.root.innerHTML = content.html;
        }
    }

    initializeHomeworkEditor() {
        const homeworkTextarea = document.getElementById('homework');
        if (homeworkTextarea) {
            const parent = homeworkTextarea.parentNode;
            const newContainer = document.createElement('div');
            newContainer.id = 'homework-editor-container';
            parent.replaceChild(newContainer, homeworkTextarea);
            this.homeworkQuillEditor = this.initializeRichTextEditor(newContainer, 'Ej: Make a question with each verb', true);
        }
    }

    handleSharedClass() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('share');
        
        if (sharedData) {
            try {
                const classData = JSON.parse(atob(sharedData));
                
                if (confirm('¿Deseas importar esta clase compartida?')) {
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
                    
                    this.showNotification('✅ Clase compartida importada exitosamente', 'success');
                    
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (error) {
                this.showNotification('❌ Error al importar clase compartida', 'error');
                console.error('Share import error:', error);
            }
        }
    }

    // Share functionality
    shareClass(classId) {
        this.currentShareClassId = classId;
        const modal = document.getElementById('shareModal');
        modal.classList.add('active');
    }

    generateShareableContent(classId) {
        const classData = this.classes.find(c => c.id === classId);
        if (!classData) return null;
        
        const dateInfo = this.formatDate(classData.date);
        
        // Create shareable object with files as base64
        const shareableClass = {
            ...classData,
            shareDate: new Date().toISOString(),
            files: {}
        };
        
        // Include file data for sharing
        classData.activities.forEach(activity => {
            if (activity.files) {
                activity.files.forEach(file => {
                    const fileData = this.fileStorage.get(file.id);
                    if (fileData) {
                        shareableClass.files[file.id] = fileData;
                    }
                });
            }
        });
        
        if (classData.homeworkFiles) {
            classData.homeworkFiles.forEach(file => {
                const fileData = this.fileStorage.get(file.id);
                if (fileData) {
                    shareableClass.files[file.id] = fileData;
                }
            });
        }
        
        return shareableClass;
    }

    generateShareableText(classId) {
        const classData = this.classes.find(c => c.id === classId);
        if (!classData) return '';
        
        const dateInfo = this.formatDate(classData.date);
        let text = `📚 CLASE DE INGLÉS - ${dateInfo.full}\n`;
        text += `${'='.repeat(50)}\n\n`;
        
        text += `📋 ACTIVIDADES:\n`;
        classData.activities.forEach((activity, index) => {
            text += `${index + 1}. [${activity.type.toUpperCase()}] ${activity.text}\n`;
            if (activity.files && activity.files.length > 0) {
                text += `   📎 Archivos: ${activity.files.map(f => f.name).join(', ')}\n`;
            }
            if (activity.links && activity.links.length > 0) {
                text += `   🔗 Enlaces: ${activity.links.map(l => `${l.name} (${l.url})`).join(', ')}\n`;
            }
            text += '\n';
        });
        
        if (classData.homework) {
            text += `📝 TAREA:\n${classData.homework}\n`;
            if (classData.homeworkFiles && classData.homeworkFiles.length > 0) {
                text += `📎 Archivos de tarea: ${classData.homeworkFiles.map(f => f.name).join(', ')}\n`;
            }
            if (classData.homeworkLinks && classData.homeworkLinks.length > 0) {
                text += `🔗 Enlaces de tarea: ${classData.homeworkLinks.map(l => `${l.name} (${l.url})`).join(', ')}\n`;
            }
        }
        
        return text;
    }

    closeShareModal() {
        const modal = document.getElementById('shareModal');
        modal.classList.remove('active');
        document.getElementById('shareSuccess').classList.remove('active');
    }
}

let planner;

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Homework resource functions
function toggleHomeworkResources() {
    const resourceSection = document.getElementById('homeworkResourcesSection');
    const trigger = document.querySelector('.homework-resources-trigger');
    
    if (resourceSection.classList.contains('active')) {
        resourceSection.classList.remove('active');
        trigger.innerHTML = '📎 Agregar recursos para la tarea';
    } else {
        resourceSection.classList.add('active');
        trigger.innerHTML = '📎 Ocultar recursos';
        
        // Setup drag and drop if not already setup
        const uploadArea = resourceSection.querySelector('.file-upload-area');
        if (uploadArea && !uploadArea.classList.contains('drag-setup')) {
            planner.setupDragAndDropForElement(uploadArea, 'homework');
            uploadArea.classList.add('drag-setup');
        }
    }
}

function toggleHomeworkResourceType(button, type) {
    const resourceSection = button.closest('.resources-main-section');
    const buttons = resourceSection.querySelectorAll('.resource-type-btn');
    const fileSection = resourceSection.querySelector('.file-upload-section');
    const linkSection = resourceSection.querySelector('.link-upload-section');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    if (type === 'file') {
        fileSection.style.display = 'block';
        linkSection.style.display = 'none';
    } else {
        fileSection.style.display = 'none';
        linkSection.style.display = 'block';
    }
}

function triggerHomeworkFileInput() {
    document.getElementById('homeworkFileInput').click();
}

function handleHomeworkFileSelect(input) {
    const files = Array.from(input.files);
    files.forEach(file => {
        if (planner) {
            planner.handleHomeworkFileUpload(file);
        }
    });
    input.value = '';
}

function removeHomeworkFile(button, fileId) {
    if (planner) {
        planner.fileStorage.delete(fileId);
        planner.saveFileStorage();
        button.closest('.file-item').remove();
        
        // Remove from homework resources
        planner.homeworkResources.files = planner.homeworkResources.files.filter(f => f.id !== fileId);
        
        planner.showNotification('🗑️ Archivo eliminado', 'info');
    }
}

function addHomeworkLinkResource() {
    const nameInput = document.getElementById('homeworkResourceName');
    const urlInput = document.getElementById('homeworkResourceUrl');
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name || !url) {
        if (planner) {
            planner.showNotification('⚠️ Completa el nombre y URL del recurso', 'warning');
        }
        return;
    }
    
    try {
        new URL(url);
    } catch {
        if (planner) {
            planner.showNotification('⚠️ URL inválida', 'warning');
        }
        return;
    }
    
    // Add to homework resources
    if (!planner.homeworkResources.links) {
        planner.homeworkResources.links = [];
    }
    planner.homeworkResources.links.push({ name, url });
    
    planner.addHomeworkLinkResourceToDOM(name, url);
    
    nameInput.value = '';
    urlInput.value = '';
    
    if (planner) {
        planner.showNotification('✅ Enlace agregado exitosamente', 'success');
    }
}

function removeHomeworkLinkResource(button) {
    const linkItem = button.closest('.link-resource-item');
    const name = linkItem.querySelector('.link-resource-name').textContent;
    const url = linkItem.querySelector('.link-resource-url').href;
    
    // Remove from homework resources
    if (planner.homeworkResources.links) {
        planner.homeworkResources.links = planner.homeworkResources.links.filter(
            link => link.name !== name || link.url !== url
        );
    }
    
    linkItem.remove();
    
    if (planner) {
        planner.showNotification('🗑️ Enlace eliminado', 'info');
    }
}

// Activity resource functions
function toggleResourceSection(button) {
    const activityItem = button.closest('.activity-item');
    const resourceSection = activityItem.querySelector('.resources-main-section');
    
    if (resourceSection.classList.contains('active')) {
        resourceSection.classList.remove('active');
        button.innerHTML = '📎 Agregar recursos para esta actividad';
    } else {
        resourceSection.classList.add('active');
        button.innerHTML = '📎 Ocultar recursos';
    }
}

function toggleResourceType(button, type) {
    const resourceSection = button.closest('.resources-main-section');
    const buttons = resourceSection.querySelectorAll('.resource-type-btn');
    const fileSection = resourceSection.querySelector('.file-upload-section');
    const linkSection = resourceSection.querySelector('.link-upload-section');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    if (type === 'file') {
        fileSection.style.display = 'block';
        linkSection.style.display = 'none';
    } else {
        fileSection.style.display = 'none';
        linkSection.style.display = 'block';
    }
}

function triggerFileInput(uploadArea) {
    const fileInput = uploadArea.querySelector('.file-input');
    fileInput.click();
}

function handleFileSelect(input) {
    const files = Array.from(input.files);
    const activityElement = input.closest('.activity-item');
    
    files.forEach(file => {
        if (planner) {
            planner.handleFileUpload(file, activityElement);
        }
    });
    
    input.value = '';
}

function removeFile(button, fileId) {
    if (planner) {
        planner.fileStorage.delete(fileId);
        planner.saveFileStorage();
        button.closest('.file-item').remove();
        planner.showNotification('🗑️ Archivo eliminado', 'info');
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
        planner.showNotification('✨ Nueva actividad agregada', 'success');
    }
}

function removeActivity(button) {
    const activitiesList = document.getElementById('activitiesList');
    if (activitiesList.children.length > 1) {
        if (planner) {
            const activityElement = button.closest('.activity-item');
            activityElement.querySelectorAll('.file-item').forEach(fileItem => {
                const fileId = fileItem.dataset.fileId;
                planner.fileStorage.delete(fileId);
            });
            planner.saveFileStorage();
        }
        
        button.closest('.activity-item').remove();
        if (planner) {
            planner.showNotification('🗑️ Actividad eliminada', 'info');
        }
    } else {
        if (planner) {
            planner.showNotification('⚠️ Debe haber al menos una actividad', 'warning');
        }
    }
}

function addLinkResource(button) {
    const activityItem = button.closest('.activity-item');
    const nameInput = activityItem.querySelector('.resource-name-input');
    const urlInput = activityItem.querySelector('.resource-url-input');
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name || !url) {
        if (planner) {
            planner.showNotification('⚠️ Completa el nombre y URL del recurso', 'warning');
        }
        return;
    }
    
    try {
        new URL(url);
    } catch {
        if (planner) {
            planner.showNotification('⚠️ URL inválida', 'warning');
        }
        return;
    }
    
    const linksList = activityItem.querySelector('.link-resources-list');
    const linkId = 'link_' + Date.now();
    
    const linkItem = document.createElement('div');
    linkItem.className = 'link-resource-item';
    linkItem.dataset.linkId = linkId;
    
    linkItem.innerHTML = `
        <div class="link-resource-info">
            <span class="link-resource-name">${name}</span>
            <a href="${url}" target="_blank" class="link-resource-url">${getDomainFromUrl(url)}</a>
        </div>
        <button type="button" class="remove-link-resource" onclick="removeLinkResource(this)" title="Eliminar">×</button>
    `;
    
    linksList.appendChild(linkItem);
    
    nameInput.value = '';
    urlInput.value = '';
    
    if (planner) {
        planner.showNotification('✅ Enlace agregado exitosamente', 'success');
    }
}

function removeLinkResource(button) {
    button.closest('.link-resource-item').remove();
    if (planner) {
        planner.showNotification('🗑️ Enlace eliminado', 'info');
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
        input.value = '';
    }
}

function toggleAllClasses() {
    const allClassItems = document.querySelectorAll('.class-item');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const expandAllIcon = document.getElementById('expandAllIcon');
    const expandAllText = document.getElementById('expandAllText');
    
    if (allClassItems.length === 0) return;
    
    const firstClassIsCompressed = allClassItems[0].classList.contains('compressed');
    
    if (firstClassIsCompressed) {
        allClassItems.forEach((classItem, index) => {
            setTimeout(() => {
                const classId = classItem.dataset.classId;
                if (classItem.classList.contains('compressed')) {
                    toggleClassExpansion(classId);
                }
            }, index * 100);
        });
        
        expandAllIcon.textContent = '📕';
        expandAllText.textContent = 'Comprimir todas';
        
    } else {
        allClassItems.forEach((classItem, index) => {
            setTimeout(() => {
                const classId = classItem.dataset.classId;
                if (!classItem.classList.contains('compressed')) {
                    toggleClassExpansion(classId);
                }
            }, index * 50);
        });
        
        expandAllIcon.textContent = '📖';
        expandAllText.textContent = 'Expandir todas';
    }
}

function toggleClassExpansion(classId) {
    const classItem = document.querySelector(`[data-class-id="${classId}"]`);
    const toggleBtn = classItem.querySelector('.expand-toggle-btn');
    const toggleIcon = toggleBtn.querySelector('.toggle-icon');
    const toggleText = toggleBtn.querySelector('.toggle-text');
    
    if (classItem.classList.contains('compressed')) {
        classItem.classList.remove('compressed');
        toggleIcon.textContent = '🔼';
        toggleText.textContent = 'Comprimir';
        
        const hiddenElements = classItem.querySelectorAll('.activities-list, .homework-section, .class-actions');
        hiddenElements.forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px)';
        });
        
        setTimeout(() => {
            hiddenElements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.transition = 'all 0.3s ease';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }, 50);
        
    } else {
        classItem.classList.add('compressed');
        toggleIcon.textContent = '👁️';
        toggleText.textContent = 'Ver detalles';
        
        const hiddenElements = classItem.querySelectorAll('.activities-list, .homework-section, .class-actions');
        hiddenElements.forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Share functions
function shareAsUrl() {
    if (!planner.currentShareClassId) return;
    
    const shareableContent = planner.generateShareableContent(planner.currentShareClassId);
    const compressed = btoa(JSON.stringify(shareableContent));
    const url = `${window.location.origin}${window.location.pathname}?share=${compressed}`;
    
    navigator.clipboard.writeText(url).then(() => {
        document.getElementById('shareSuccess').classList.add('active');
        setTimeout(() => {
            planner.closeShareModal();
        }, 2000);
    }).catch(() => {
        planner.showNotification('⚠️ No se pudo copiar al portapapeles', 'warning');
    });
}

function shareAsJson() {
    if (!planner.currentShareClassId) return;
    
    const shareableContent = planner.generateShareableContent(planner.currentShareClassId);
    const blob = new Blob([JSON.stringify(shareableContent, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clase-ingles-${shareableContent.date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    planner.showNotification('📄 Archivo descargado exitosamente', 'success');
    planner.closeShareModal();
}

function shareAsText() {
    if (!planner.currentShareClassId) return;
    
    const text = planner.generateShareableText(planner.currentShareClassId);
    
    navigator.clipboard.writeText(text).then(() => {
        document.getElementById('shareSuccess').classList.add('active');
        setTimeout(() => {
            planner.closeShareModal();
            switchTab('view');
        }, 2000);
    }).catch(() => {
        planner.showNotification('⚠️ No se pudo copiar al portapapeles', 'warning');
    });
}

function closeShareModal() {
    if (planner) {
        planner.closeShareModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    planner = new EnglishClassPlanner();
    console.log('✅ English Class Planner inicializado correctamente');
});