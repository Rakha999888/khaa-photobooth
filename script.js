
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture');
const downloadBtn = document.getElementById('download');
const filterSelect = document.getElementById('filter');
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const thumbnailsContainer = document.getElementById('thumbnails');
const gallery = document.getElementById('gallery');


const ctx = canvas.getContext('2d');


let photos = [];
let currentPhoto = null;


function showCameraPlaceholder(message) {
    const container = document.querySelector('.camera-container');
    container.innerHTML = `
        <div class="no-camera">
            <div class="no-camera-icon">📷</div>
            <div class="no-camera-message">${message || 'Camera not available'}</div>
        </div>
    `;
    container.classList.add('no-camera');
}


function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.photobooth').prepend(errorDiv);
    console.error(message);
}

// Initialize the app
async function init() {
    // Check if browser supports mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Your browser does not support camera access. Please try a modern browser like Chrome or Firefox.');
        return;
    }

    try {
        // Request camera access
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set video source to the webcam stream
        video.srcObject = stream;
        
        // Handle when video starts playing
        video.onplaying = () => {
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Enable capture button
            captureBtn.disabled = false;
            
            // Start the video processing loop
            requestAnimationFrame(processVideo);
            
            // Remove any previous error messages
            const errorMsg = document.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        };
        
        // Handle video errors
        video.onerror = () => {
            showError('Error accessing video stream. Please try again.');
        };
        
    } catch (err) {
        let errorMessage = 'Could not access webcam. ';
        
        if (err.name === 'NotAllowedError') {
            errorMessage += 'Camera permission was denied. Please allow camera access to use this feature.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage += 'No camera found. Please check if your camera is properly connected.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage += 'Camera is already in use by another application.';
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
            errorMessage += 'Camera resolution not supported.';
        } else {
            errorMessage += `Error: ${err.message || err}`;
        }
        
        showError(errorMessage);
        console.error('Error accessing webcam:', err);
    }
    
    // Load saved photos from localStorage
    loadSavedPhotos();
}

// Apply brightness and contrast to image data
function applyBrightnessContrast(imageData, brightness = 100, contrast = 100) {
    const data = imageData.data;
    const factor = 259 * (contrast + 255) / (255 * (259 - contrast));
    const brightnessValue = (brightness - 100) * 2.55; // Convert from 0-200 to -255 to 255
    
    for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        data[i] = Math.max(0, Math.min(255, data[i] + brightnessValue));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightnessValue)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightnessValue)); // B
        
        // Apply contrast
        data[i] = factor * (data[i] - 128) + 128;     // R
        data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
        data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
    }
    
    return imageData;
}

// Process video frames with filters
function processVideo() {
    // Only process if video is ready
    if (video.readyState >= video.HAVE_METADATA) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame with mirror effect
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Apply brightness and contrast
        const brightness = parseInt(brightnessSlider.value);
        const contrast = parseInt(contrastSlider.value);
        applyBrightnessContrast(imageData, brightness, contrast);
        
        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Apply the selected filter
        const filter = filterSelect.value;
        if (filter === 'grayscale') {
            ctx.filter = 'grayscale(100%)';
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        } else if (filter === 'sepia') {
            ctx.filter = 'sepia(100%)';
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        } else if (filter === 'invert') {
            ctx.filter = 'invert(100%)';
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        } else if (filter === 'hue-rotate') {
            ctx.filter = 'hue-rotate(90deg)';
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        } else if (filter === 'cartoon') {
            // Cartoon effect will be applied in capture function
        } else if (filter === 'glitch') {
            // Glitch effect will be applied in capture function
        }
    }
    
    // Continue the loop
    requestAnimationFrame(processVideo);
}

// Apply cartoon/posterize effect to the canvas
function applyCartoonEffect(context, width, height) {
    // Get image data
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Posterization effect (reduce number of colors)
    const levels = 8; // Number of color levels (lower = more cartoonish)
    
    for (let i = 0; i < data.length; i += 4) {
        // Posterize RGB channels
        data[i] = Math.floor(data[i] / 255 * levels) * (255 / levels);     // R
        data[i + 1] = Math.floor(data[i + 1] / 255 * levels) * (255 / levels); // G
        data[i + 2] = Math.floor(data[i + 2] / 255 * levels) * (255 / levels); // B
    }
    
    // Apply edge detection (Sobel operator)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Draw the posterized image to temp canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Apply edge detection
    const edgeData = detectEdges(tempCanvas, width, height);
    
    // Blend the edges with the posterized image
    for (let i = 0; i < data.length; i += 4) {
        // If this is an edge pixel, make it darker
        if (edgeData[i] < 50) { // Threshold for edge detection
            data[i] *= 0.5;     // R
            data[i + 1] *= 0.5; // G
            data[i + 2] *= 0.5; // B
        }
    }
    
    // Apply some sharpening
    context.putImageData(imageData, 0, 0);
    context.filter = 'contrast(1.2) saturate(1.2)';
    context.drawImage(tempCanvas, 0, 0, width, height);
    context.filter = 'none';
}

// Helper function for edge detection (Sobel operator)
function detectEdges(canvas, width, height) {
    const tempCtx = canvas.getContext('2d');
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const sobelData = new Uint8ClampedArray(data.length);
    
    // Convert to grayscale first
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sobelData[i] = gray;
        sobelData[i + 1] = gray;
        sobelData[i + 2] = gray;
        sobelData[i + 3] = 255;
    }
    
    // Apply Sobel operator
    const output = new Uint8ClampedArray(data.length);
    const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            let idx = (y * width + x) * 4;
            
            // Apply kernels
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const kidx = (ky + 1) * 3 + (kx + 1);
                    const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
                    gx += sobelData[pixelIdx] * kernelX[kidx];
                    gy += sobelData[pixelIdx] * kernelY[kidx];
                }
            }
            
            // Calculate gradient magnitude
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            
            // Apply threshold
            output[idx] = output[idx + 1] = output[idx + 2] = magnitude > 50 ? 255 : 0;
            output[idx + 3] = 255;
        }
    }
    
    return output;
}

// Get the current filter settings
function getCurrentFilter() {
    const brightness = (brightnessSlider.value / 100).toFixed(2);
    const contrast = (contrastSlider.value / 100).toFixed(2);
    
    let filter = `brightness(${brightness}) contrast(${contrast})`;
    
    // Apply selected filter
    switch(filterSelect.value) {
        case 'grayscale':
            filter += ' grayscale(1)';
            break;
        case 'sepia':
            filter += ' sepia(1)';
            break;
        case 'invert':
            filter += ' invert(1)';
            break;
        case 'hue-rotate':
            filter += ' hue-rotate(90deg)';
            break;
        case 'cartoon':
            // Cartoon effect is applied in the capture function
            break;
        case 'glitch':
            // Glitch effect is applied in the capture function
            break;
    }
    
    return filter;
}

// Capture photo
function capturePhoto() {
    // Create a temporary canvas to apply the frame
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set dimensions
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Draw the current video frame to temp canvas with mirror effect
    tempCtx.save();
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, -tempCanvas.width, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.restore();
    
    // Get image data
    let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Apply brightness and contrast first
    const brightness = parseInt(brightnessSlider.value);
    const contrast = parseInt(contrastSlider.value);
    imageData = applyBrightnessContrast(imageData, brightness, contrast);
    tempCtx.putImageData(imageData, 0, 0);
    
    // Apply the selected filter
    const filter = filterSelect.value;
    if (filter === 'grayscale') {
        tempCtx.filter = 'grayscale(100%)';
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
    } else if (filter === 'sepia') {
        tempCtx.filter = 'sepia(100%)';
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
    } else if (filter === 'invert') {
        tempCtx.filter = 'invert(100%)';
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
    } else if (filter === 'hue-rotate') {
        tempCtx.filter = 'hue-rotate(90deg)';
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
    } else if (filter === 'cartoon') {
        applyCartoonEffect(tempCtx, tempCanvas.width, tempCanvas.height);
    } else if (filter === 'glitch') {
        applyGlitchEffect(tempCtx, tempCanvas.width, tempCanvas.height);
    }
    
    // Get the image data URL
    const photoData = tempCanvas.toDataURL('image/png');
    
    // Add to photos array
    const photo = {
        id: Date.now(),
        data: photoData,
        filter: filterSelect.value,
        brightness: brightnessSlider.value,
        contrast: contrastSlider.value,
        timestamp: new Date().toISOString()
    };
    
    photos.unshift(photo);
    currentPhoto = photo;
    
    // Update gallery
    updateGallery();
    
    // Enable download button
    downloadBtn.disabled = false;
    
    // Save to localStorage
    savePhotos();
    
    // Show notification
    showNotification('Foto berhasil diambil!');
}

// Apply glitch effect to the canvas
function applyGlitchEffect(context, width, height) {
    // Save the current image data
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Apply RGB shift
    const shiftAmount = 2;
    const tempData = new Uint8ClampedArray(data);
    
    // Red channel shift
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const ni = (y * width + (x + shiftAmount)) * 4;
            
            if (ni < data.length - 4) {
                data[i] = tempData[ni]; // Red
            }
        }
    }
    
    // Green channel shift (opposite direction)
    for (let y = 0; y < height; y++) {
        for (let x = width - 1; x >= 0; x--) {
            const i = (y * width + x) * 4 + 1;
            const ni = (y * width + (x - shiftAmount)) * 4 + 1;
            
            if (ni >= 0) {
                data[i] = tempData[ni]; // Green
            }
        }
    }
    
    // Add some random noise
    for (let i = 0; i < data.length; i += Math.floor(Math.random() * 5) + 1) {
        if (i % 4 !== 3) { // Skip alpha channel
            data[i] = Math.random() > 0.9 ? 255 : data[i];
        }
    }
    
    // Put the modified data back
    context.putImageData(imageData, 0, 0);
}

// Update the gallery with captured photos
function updateGallery() {
    // Clear current thumbnails
    thumbnailsContainer.innerHTML = '';
    
    // Show/hide gallery section based on photos
    gallery.style.display = photos.length > 0 ? 'block' : 'none';
    
    // Add thumbnails
    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = 'Captured photo';
        img.className = 'thumbnail';
        img.dataset.id = photo.id;
        
        // Add click handler to select photo
        img.addEventListener('click', () => selectPhoto(photo.id));
        
        thumbnailsContainer.appendChild(img);
    });
}

// Select a photo from the gallery
function selectPhoto(photoId) {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
        currentPhoto = photo;
        downloadBtn.disabled = false;
        
        // Highlight selected thumbnail
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.toggle('selected', thumb.dataset.id === photoId.toString());
        });
    }
}

// Download the current photo
function downloadPhoto() {
    if (!currentPhoto) return;
    
    const link = document.createElement('a');
    link.download = `gamer-photo-${new Date(currentPhoto.timestamp).getTime()}.png`;
    link.href = currentPhoto.data;
    link.click();
    
    showNotification('Download started!');
}

// Save photos to localStorage
function savePhotos() {
    // Only save the 10 most recent photos to avoid using too much storage
    const photosToSave = photos.slice(0, 10);
    localStorage.setItem('gamerPhotoboothPhotos', JSON.stringify(photosToSave));
}

// Load saved photos from localStorage
function loadSavedPhotos() {
    const savedPhotos = localStorage.getItem('gamerPhotoboothPhotos');
    if (savedPhotos) {
        photos = JSON.parse(savedPhotos);
        if (photos.length > 0) {
            currentPhoto = photos[0];
            downloadBtn.disabled = false;
            updateGallery();
        }
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(0, 0, 0, 0.8);
        color: var(--neon-blue);
        padding: 12px 24px;
        border-radius: 30px;
        font-family: 'Orbitron', sans-serif;
        font-weight: bold;
        box-shadow: 0 0 15px rgba(0, 243, 255, 0.5);
        border: 1px solid var(--neon-blue);
        z-index: 1000;
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .notification.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    
    .thumbnail.selected {
        box-shadow: 0 0 20px var(--neon-pink);
        transform: scale(1.05);
    }
`;
document.head.appendChild(style);

// Event Listeners
captureBtn.addEventListener('click', capturePhoto);
downloadBtn.addEventListener('click', downloadPhoto);

// Function to start the camera
async function startCamera() {
    try {
        // Show loading message
        showCameraPlaceholder('Mengaktifkan kamera...');
        
        // Check if browser supports mediaDevices
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser Anda tidak mendukung akses kamera. Gunakan Chrome, Firefox, atau Edge.');
        }

        // Request camera access with simpler constraints
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        // Try to get media stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set video source
        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
            const onLoadedMetadata = () => {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Start playing the video
                video.play().then(() => {
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    video.removeEventListener('error', onError);
                    resolve();
                }).catch(err => {
                    reject(new Error('Gagal memutar video: ' + err.message));
                });
            };
            
            const onError = (e) => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                reject(new Error('Gagal memuat video'));
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
            video.addEventListener('error', onError, { once: true });
            
            // Set timeout in case video never loads
            setTimeout(() => {
                if (video.readyState < 2) { // 0=HAVE_NOTHING, 1=HAVE_METADATA
                    reject(new Error('Kamera terlalu lama merespon'));
                }
            }, 5000);
        });
        
        // Enable capture button
        captureBtn.disabled = false;
        
        // Hide any error messages and placeholder
        const errorMsg = document.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
        
        const container = document.querySelector('.camera-container');
        if (container) {
            container.classList.remove('no-camera');
            container.innerHTML = '';
            container.appendChild(video);
            container.appendChild(canvas);
        }
        
        // Start the video processing loop
        requestAnimationFrame(processVideo);
        
        return true;
        
    } catch (err) {
        console.error('Kesalahan kamera:', err);
        
        let errorMessage = 'Gagal mengakses kamera. ';
        
        if (err.name === 'NotAllowedError') {
            errorMessage = 'Izin kamera ditolak. Mohon izinkan akses kamera dan muat ulang halaman.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = 'Kamera tidak ditemukan. Periksa koneksi kamera Anda.';
        } else if (err.name === 'NotReadableError') {
            errorMessage = 'Kamera sedang digunakan oleh aplikasi lain.';
        } else {
            errorMessage += err.message || 'Silakan coba lagi nanti.';
        }
        
        showCameraPlaceholder(errorMessage);
        showError(errorMessage);
        
        // Add retry button
        const retryBtn = document.createElement('button');
        retryBtn.className = 'btn';
        retryBtn.textContent = 'Coba Lagi';
        retryBtn.style.marginTop = '10px';
        retryBtn.onclick = () => window.location.reload();
        
        const container = document.querySelector('.camera-container');
        if (container) {
            container.appendChild(retryBtn);
        }
        
        return false;
    }
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    // Start the camera
    const cameraStarted = await startCamera();
    
    // If camera didn't start, add retry button
    if (!cameraStarted) {
        const retryButton = document.createElement('button');
        retryButton.className = 'btn';
        retryButton.textContent = 'Retry Camera';
        retryButton.style.marginTop = '10px';
        retryButton.onclick = async () => {
            retryButton.disabled = true;
            retryButton.textContent = 'Retrying...';
            await startCamera();
            retryButton.remove();
        };
        
        const container = document.querySelector('.camera-container');
        if (container) {
            container.appendChild(retryButton);
        }
    }
});
