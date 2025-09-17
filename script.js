class EnglishClassPlanner {
    constructor() {
        this.classes = this.loadClasses();
        this.fileStorage = this.loadFileStorage();
        this.initializeEventListeners();
        this.renderClasses();
        this.setTodayAsDefault();
        this.addInitialActivity();
    }

    loadClasses() {
        const stored = JSON.parse(sessionStorage.getItem('englishClasses') || '[]');
        return stored.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    loadFileStorage() {
        return new Map();
    }

    saveClasses() {
        sessionStorage.setItem('englishClasses', JSON.stringify(this.classes));
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
    }

    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    handleFileUpload(file, activityElement) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        
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
            this.addFileToActivity(activityElement, fileData);
            this.showNotification('✅ Archivo subido exitosamente', 'success');
        };

        reader.readAsDataURL(file);
    }

    addFileToActivity(activityElement, fileData) {
        const uploadedFiles = activityElement.querySelector('.uploaded-files');
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = fileData.id;

        const fileIcon = this.getFileIcon(fileData.type);
        const fileSize = this.formatFileSize(fileData.size);

        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">${fileIcon}</span>
                <div class="file-details">
                    <span class="file-name">${fileData.name}</span>
                    <span class="file-size">${fileSize}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-preview-btn" onclick="previewFile('${fileData.id}')" title="Ver archivo">👁️</button>
                <button class="file-remove-btn" onclick="removeFile(this, '${fileData.id}')" title="Eliminar">🗑️</button>
            </div>
        `;

        uploadedFiles.appendChild(fileItem);
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

    createFileUploadArea() {
        return `
            <button type="button" class="add-resource-trigger" onclick="toggleResourceSection(this)">
                📎 Agregar recursos para esta actividad
            </button>
            <div class="resources-main-section">
                <div class="resource-type-selector">
                    <button type="button" class="resource-type-btn active" onclick="toggleResourceType(this, 'file')">
                        📁 Subir archivo
                    </button>
                    <button type="button" class="resource-type-btn" onclick="toggleResourceType(this, 'link')">
                        🔗 Agregar enlace
                    </button>
                </div>
                
                <div class="file-upload-section">
                    <div class="file-upload-area" onclick="triggerFileInput(this)">
                        <input type="file" class="file-input" accept=".pdf,.jpg,.jpeg,.png,.gif" multiple onchange="handleFileSelect(this)">
                        <div class="file-upload-text">📁 Subir archivos</div>
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
        const homework = document.getElementById('homework').value;
        
        const activities = this.getActivitiesFromForm();

        if (activities.length === 0) {
            this.showNotification('⚠️ Agrega al menos una actividad para la clase', 'warning');
            return;
        }

        const classData = {
            id: Date.now().toString(),
            date: date,
            activities: activities,
            homework: homework
        };

        this.classes.unshift(classData);
        this.saveClasses();
        this.renderClasses();
        this.resetForm();
        
        this.showNotification('✅ Clase guardada exitosamente', 'success');
        
        switchTab('view');
    }

    getActivitiesFromForm() {
        const activities = [];
        const activityElements = document.querySelectorAll('#activitiesList .activity-item');
        
        activityElements.forEach(element => {
            const type = element.querySelector('.activity-type-select').value;
            const text = element.querySelector('.activity-text-input').value.trim();
            
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
                <div class="activity-type-row">
                    <select class="activity-type-select">
                        <option value="activity">🎯 Activity</option>
                        <option value="game">🎮 Game</option>
                        <option value="vocabulary">📝 Vocabulary</option>
                        <option value="explanation">📚 Explanation</option>
                    </select>
                    <button type="button" class="remove-activity" onclick="removeActivity(this)" title="Eliminar actividad">×</button>
                </div>
                <textarea class="activity-text-input" placeholder="Describe la actividad" required></textarea>
            </div>
            ${this.createFileUploadArea()}
        `;
        
        activitiesList.appendChild(activityDiv);
        
        // Setup drag and drop only when the resource section is activated
        const addResourceBtn = activityDiv.querySelector('.add-resource-trigger');
        addResourceBtn.addEventListener('click', () => {
            setTimeout(() => {
                const uploadArea = activityDiv.querySelector('.file-upload-area');
                if (uploadArea && !uploadArea.classList.contains('drag-setup')) {
                    this.setupDragAndDrop(uploadArea);
                    uploadArea.classList.add('drag-setup');
                }
            }, 100);
        });
    }

    setupDragAndDrop(uploadArea) {
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
            const activityElement = uploadArea.closest('.activity-item');
            
            files.forEach(file => {
                this.handleFileUpload(file, activityElement);
            });
        });
    }

    deleteClass(id) {
        if (confirm('¿Estás seguro de que deseas eliminar esta clase?')) {
            const classData = this.classes.find(c => c.id === id);
            if (classData) {
                classData.activities.forEach(activity => {
                    activity.files.forEach(file => {
                        this.fileStorage.delete(file.id);
                    });
                });
            }
            
            this.classes = this.classes.filter(c => c.id !== id);
            this.saveClasses();
            this.renderClasses();
            this.showNotification('🗑️ Clase eliminada', 'error');
        }
    }

    editClass(id) {
        const classData = this.classes.find(c => c.id === id);
        if (!classData) return;

        switchTab('create');

        document.getElementById('classDate').value = classData.date;
        document.getElementById('homework').value = classData.homework || '';
        
        const activitiesList = document.getElementById('activitiesList');
        activitiesList.innerHTML = '';
        
        classData.activities.forEach(activity => {
            this.addActivityElement();
            const lastActivity = activitiesList.lastElementChild;
            lastActivity.querySelector('.activity-type-select').value = activity.type;
            lastActivity.querySelector('.activity-text-input').value = activity.text;
            
            activity.files.forEach(fileRef => {
                const fileData = this.fileStorage.get(fileRef.id);
                if (fileData) {
                    this.addFileToActivity(lastActivity, fileData);
                }
            });
        });

        this.deleteClassSilent(id);
        this.showNotification('📝 Clase cargada para edición', 'info');
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
        
        this.setTodayAsDefault();
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
                            <div class="activity-text">${activity.text}</div>
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
                        <div class="homework-content">${classData.homework}</div>
                    </div>
                `
                : '';

            // Create summary for compressed view
            const activitiesCount = classData.activities.length;
            const activityTypes = [...new Set(classData.activities.map(a => a.type))];
            const hasHomework = classData.homework ? true : false;
            const totalResources = classData.activities.reduce((total, activity) => {
                return total + (activity.files?.length || 0) + (activity.links?.length || 0);
            }, 0);

            const summaryText = `${activitiesCount} actividad${activitiesCount !== 1 ? 'es' : ''} • Tipos: ${activityTypes.join(', ')}${totalResources > 0 ? ` • ${totalResources} recurso${totalResources !== 1 ? 's' : ''}` : ''}${hasHomework ? ' • Con tarea' : ''}`;

            return `
                <div class="class-item compressed fade-in" data-class-id="${classData.id}">
                    <div class="class-header">
                        <div class="class-date-title">
                            <span class="class-weekday">${dateInfo.weekday}</span>
                            ${dateInfo.full}
                        </div>
                        <button class="expand-toggle-btn" onclick="toggleClassExpansion('${classData.id}')">
                            <span class="toggle-icon">👁️</span>
                            <span class="toggle-text">Ver detalles</span>
                        </button>
                    </div>
                    
                    <div class="class-summary">
                        ${summaryText}
                    </div>
                    
                    <div class="activities-list">
                        ${activitiesHtml}
                    </div>
                    
                    ${homeworkHtml}
                    
                    <div class="class-actions">
                        <button onclick="planner.editClass('${classData.id}')" class="btn btn-secondary btn-small">
                            ✏️ Editar
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
                activity.files.some(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
        button.closest('.file-item').remove();
        planner.showNotification('🗑️ Archivo eliminado', 'info');
    }
}

function previewFile(fileId) {
    if (planner) {
        planner.previewFile(fileId);
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

function toggleAllClasses() {
    const allClassItems = document.querySelectorAll('.class-item');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const expandAllIcon = document.getElementById('expandAllIcon');
    const expandAllText = document.getElementById('expandAllText');
    
    if (allClassItems.length === 0) return;
    
    const firstClassIsCompressed = allClassItems[0].classList.contains('compressed');
    
    if (firstClassIsCompressed) {
        // Expand all
        allClassItems.forEach((classItem, index) => {
            setTimeout(() => {
                const classId = classItem.dataset.classId;
                if (classItem.classList.contains('compressed')) {
                    toggleClassExpansion(classId);
                }
            }, index * 100);
        });
        
        expandAllIcon.textContent = '📑';
        expandAllText.textContent = 'Comprimir todas';
        
    } else {
        // Compress all
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
        // Expand
        classItem.classList.remove('compressed');
        toggleIcon.textContent = '🔼';
        toggleText.textContent = 'Comprimir';
        
        // Animate expansion
        const hiddenElements = classItem.querySelectorAll('.activities-list, .homework-section, .class-actions');
        hiddenElements.forEach(el => {
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
        // Compress
        classItem.classList.add('compressed');
        toggleIcon.textContent = '👁️';
        toggleText.textContent = 'Ver detalles';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    planner = new EnglishClassPlanner();
    console.log('✅ English Class Planner inicializado correctamente');
});