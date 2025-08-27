// Offline Reels App JavaScript

class OfflineReelsApp {
    constructor() {
        this.db = null;
        this.videos = [];
        this.currentVideoIndex = 0;
        this.dbName = 'OfflineReelsDB';
        this.dbVersion = 1;
        this.storeName = 'videos';
        
        this.init();
    }

    async init() {
        try {
            await this.initDB();
            this.bindEvents();
            await this.loadVideos();
            this.updateUI();
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    // IndexedDB Setup
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('uploadDate', 'uploadDate', { unique: false });
                }
            };
        });
    }

    // Event Binding
    bindEvents() {
        // Upload buttons
        const uploadBtn = document.getElementById('uploadBtn');
        const emptyUploadBtn = document.getElementById('emptyUploadBtn');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUploadModal();
            });
        }
        
        if (emptyUploadBtn) {
            emptyUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUploadModal();
            });
        }
        
        // Library button
        const libraryBtn = document.getElementById('libraryBtn');
        if (libraryBtn) {
            libraryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLibraryModal();
            });
        }
        
        // Modal close buttons
        const closeUpload = document.getElementById('closeUpload');
        const closeLibrary = document.getElementById('closeLibrary');
        
        if (closeUpload) {
            closeUpload.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideUploadModal();
            });
        }
        
        if (closeLibrary) {
            closeLibrary.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideLibraryModal();
            });
        }
        
        // Modal overlays
        const modalOverlay = document.getElementById('modalOverlay');
        const libraryOverlay = document.getElementById('libraryOverlay');
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.hideUploadModal());
        }
        
        if (libraryOverlay) {
            libraryOverlay.addEventListener('click', () => this.hideLibraryModal());
        }
        
        // File upload
        const browseBtn = document.getElementById('browseBtn');
        const fileInput = document.getElementById('fileInput');
        
        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        // Drag & Drop
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
            uploadArea.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }
        
        // Video navigation
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousVideo());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextVideo());
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Touch/Swipe for mobile
        this.bindTouchEvents();
    }

    bindTouchEvents() {
        let startY = 0;
        let startTime = 0;
        const videoContainer = document.getElementById('videoContainer');
        
        if (!videoContainer) return;
        
        videoContainer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        videoContainer.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            const deltaY = startY - endY;
            const deltaTime = endTime - startTime;
            
            // Swipe detection
            if (Math.abs(deltaY) > 50 && deltaTime < 300) {
                if (deltaY > 0) {
                    this.nextVideo(); // Swipe up for next video
                } else {
                    this.previousVideo(); // Swipe down for previous video
                }
            }
        });
    }

    // Modal Management
    showUploadModal() {
        console.log('Showing upload modal');
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.classList.remove('hidden');
            uploadModal.style.display = 'flex';
            this.resetUploadForm();
        }
    }

    hideUploadModal() {
        console.log('Hiding upload modal');
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.classList.add('hidden');
            uploadModal.style.display = 'none';
        }
    }

    showLibraryModal() {
        console.log('Showing library modal');
        const libraryModal = document.getElementById('libraryModal');
        if (libraryModal) {
            libraryModal.classList.remove('hidden');
            libraryModal.style.display = 'flex';
            this.renderLibrary();
        }
    }

    hideLibraryModal() {
        console.log('Hiding library modal');
        const libraryModal = document.getElementById('libraryModal');
        if (libraryModal) {
            libraryModal.classList.add('hidden');
            libraryModal.style.display = 'none';
        }
    }

    resetUploadForm() {
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadArea = document.getElementById('uploadArea');
        const progressFill = document.getElementById('progressFill');
        const fileInput = document.getElementById('fileInput');
        
        if (uploadProgress) uploadProgress.classList.add('hidden');
        if (uploadArea) uploadArea.style.display = 'block';
        if (progressFill) progressFill.style.width = '0%';
        if (fileInput) fileInput.value = '';
    }

    // File Upload Handling
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        const videoFiles = files.filter(file => file.type.startsWith('video/'));
        
        if (videoFiles.length > 0) {
            this.processFiles(videoFiles);
        } else {
            alert('Please select video files only.');
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    async processFiles(files) {
        if (files.length === 0) return;
        
        const uploadArea = document.getElementById('uploadArea');
        const uploadProgress = document.getElementById('uploadProgress');
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (uploadProgress) uploadProgress.classList.remove('hidden');
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = ((i + 1) / files.length) * 100;
            
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `Processing ${file.name}...`;
            
            try {
                await this.saveVideo(file);
            } catch (error) {
                console.error('Error processing file:', error);
                alert(`Error processing ${file.name}: ${error.message}`);
            }
        }
        
        await this.loadVideos();
        this.updateUI();
        this.hideUploadModal();
    }

    async saveVideo(file) {
        const id = Date.now() + Math.random();
        const thumbnail = await this.generateThumbnail(file);
        const duration = await this.getVideoDuration(file);
        
        const videoData = {
            id: id,
            filename: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toISOString(),
            duration: duration,
            thumbnail: thumbnail,
            blob: file
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(videoData);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async generateThumbnail(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            video.addEventListener('loadedmetadata', () => {
                canvas.width = 200;
                canvas.height = 120;
                
                video.currentTime = Math.min(1, video.duration * 0.1); // 10% into video or 1 second
            });
            
            video.addEventListener('seeked', () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
                resolve(thumbnail);
            });
            
            video.addEventListener('error', () => {
                resolve(null); // Return null if thumbnail generation fails
            });
            
            video.src = URL.createObjectURL(file);
        });
    }

    async getVideoDuration(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            
            video.addEventListener('loadedmetadata', () => {
                resolve(video.duration);
            });
            
            video.addEventListener('error', () => {
                resolve(0); // Return 0 if duration can't be determined
            });
            
            video.src = URL.createObjectURL(file);
        });
    }

    // Video Management
    async loadVideos() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                this.videos = request.result.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async deleteVideo(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // UI Updates
    updateUI() {
        const emptyState = document.getElementById('emptyState');
        const videoPlayer = document.getElementById('videoPlayer');
        
        if (this.videos.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (videoPlayer) videoPlayer.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (videoPlayer) videoPlayer.style.display = 'block';
            this.currentVideoIndex = Math.min(this.currentVideoIndex, this.videos.length - 1);
            this.loadCurrentVideo();
        }
        
        this.updateNavigationButtons();
        this.updateVideoProgress();
    }

    loadCurrentVideo() {
        if (this.videos.length === 0) return;
        
        const video = this.videos[this.currentVideoIndex];
        const videoElement = document.getElementById('videoElement');
        const videoTitle = document.getElementById('videoTitle');
        const videoMetadata = document.getElementById('videoMetadata');
        
        if (!videoElement || !video) return;
        
        // Create blob URL for video
        const videoURL = URL.createObjectURL(video.blob);
        videoElement.src = videoURL;
        
        // Update video info
        if (videoTitle) videoTitle.textContent = video.filename;
        if (videoMetadata) videoMetadata.textContent = `${this.formatFileSize(video.size)} • ${this.formatDuration(video.duration)}`;
        
        // Clean up previous blob URL
        videoElement.addEventListener('loadstart', () => {
            if (videoElement.previousSrc && videoElement.previousSrc !== videoURL) {
                URL.revokeObjectURL(videoElement.previousSrc);
            }
            videoElement.previousSrc = videoURL;
        });
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentVideoIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentVideoIndex >= this.videos.length - 1;
    }

    updateVideoProgress() {
        const currentVideo = document.getElementById('currentVideo');
        const totalVideos = document.getElementById('totalVideos');
        
        if (currentVideo) currentVideo.textContent = this.videos.length > 0 ? this.currentVideoIndex + 1 : 0;
        if (totalVideos) totalVideos.textContent = this.videos.length;
    }

    // Video Navigation
    previousVideo() {
        if (this.currentVideoIndex > 0) {
            this.currentVideoIndex--;
            this.loadCurrentVideo();
            this.updateNavigationButtons();
            this.updateVideoProgress();
        }
    }

    nextVideo() {
        if (this.currentVideoIndex < this.videos.length - 1) {
            this.currentVideoIndex++;
            this.loadCurrentVideo();
            this.updateNavigationButtons();
            this.updateVideoProgress();
        }
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.previousVideo();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.nextVideo();
                break;
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'Escape':
                e.preventDefault();
                this.hideUploadModal();
                this.hideLibraryModal();
                break;
        }
    }

    togglePlayPause() {
        const videoElement = document.getElementById('videoElement');
        if (videoElement) {
            if (videoElement.paused) {
                videoElement.play();
            } else {
                videoElement.pause();
            }
        }
    }

    // Library Management
    renderLibrary() {
        const videoGrid = document.getElementById('videoGrid');
        const libraryEmpty = document.getElementById('libraryEmpty');
        
        if (this.videos.length === 0) {
            if (videoGrid) videoGrid.style.display = 'none';
            if (libraryEmpty) libraryEmpty.classList.remove('hidden');
            return;
        }
        
        if (videoGrid) videoGrid.style.display = 'grid';
        if (libraryEmpty) libraryEmpty.classList.add('hidden');
        
        if (videoGrid) {
            videoGrid.innerHTML = '';
            
            this.videos.forEach((video, index) => {
                const videoItem = this.createVideoItem(video, index);
                videoGrid.appendChild(videoItem);
            });
        }
    }

    createVideoItem(video, index) {
        const item = document.createElement('div');
        item.className = 'video-item';
        
        const thumbnail = video.thumbnail 
            ? `<img src="${video.thumbnail}" alt="${video.filename}">`
            : `<div class="video-thumbnail-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
               </div>`;
        
        item.innerHTML = `
            <div class="video-thumbnail">
                ${thumbnail}
            </div>
            <div class="video-item-info">
                <h3 class="video-item-title">${video.filename}</h3>
                <p class="video-item-meta">
                    ${this.formatFileSize(video.size)} • ${this.formatDuration(video.duration)}
                    <br><small>Uploaded: ${this.formatDate(video.uploadDate)}</small>
                </p>
                <div class="video-item-actions">
                    <button class="btn btn--primary btn--sm play-btn">Play</button>
                    <button class="btn btn--secondary btn--sm download-btn">Download</button>
                    <button class="btn btn--outline btn--sm delete-btn">Delete</button>
                </div>
            </div>
        `;
        
        // Event listeners
        const playBtn = item.querySelector('.play-btn');
        const downloadBtn = item.querySelector('.download-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.currentVideoIndex = index;
                this.loadCurrentVideo();
                this.updateNavigationButtons();
                this.updateVideoProgress();
                this.hideLibraryModal();
            });
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadVideo(video));
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.confirmDeleteVideo(video));
        }
        
        return item;
    }

    async downloadVideo(video) {
        const url = URL.createObjectURL(video.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = video.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async confirmDeleteVideo(video) {
        if (confirm(`Are you sure you want to delete "${video.filename}"?`)) {
            try {
                await this.deleteVideo(video.id);
                await this.loadVideos();
                
                // Adjust current video index if necessary
                if (this.currentVideoIndex >= this.videos.length) {
                    this.currentVideoIndex = Math.max(0, this.videos.length - 1);
                }
                
                this.updateUI();
                this.renderLibrary();
            } catch (error) {
                console.error('Error deleting video:', error);
                alert('Error deleting video: ' + error.message);
            }
        }
    }

    // Utility Functions
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reelsApp = new OfflineReelsApp();
});