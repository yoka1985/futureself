// Global data storage
let testimonialsData = [];
let factsData = [];
let currentTestimonialIndex = 0;
let currentFactIndex = 0;

// DOM elements
const testimonialCarousel = document.getElementById('testimonialCarousel');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const insightContent = document.getElementById('insightContent');
const videoModal = document.getElementById('videoModal');
const videoContainer = document.getElementById('videoContainer');
const voiceTags = document.getElementById('voiceTags');
const closeModal = document.getElementById('closeModal');

// Load JSON data
async function loadData() {
    try {
        // Load testimonials
        const testimonialsResponse = await fetch('final_db_clustered_tagged_cleaned.json');
        testimonialsData = await testimonialsResponse.json();
        
        // Load healing facts
        const factsResponse = await fetch('facts.json');
        factsData = await factsResponse.json();
        
        // Initialize UI components
        initializeCarousel();
        displayFact();
        
        // Set up the fact rotation timer (15 minutes = 900,000ms)
        setInterval(rotateFact, 900000);
        
    } catch (error) {
        console.error('Error loading data:', error);
        // Display error message in the UI
        testimonialCarousel.innerHTML = `<div class="error-message">Failed to load data. Please check your internet connection and try again.</div>`;
        insightContent.innerHTML = `<div class="error-message">Failed to load healing insights. Please check your internet connection and try again.</div>`;
    }
}

// Initialize carousel with testimonials
function initializeCarousel() {
    if (testimonialsData.length === 0) return;
    
    // Clear existing content
    testimonialCarousel.innerHTML = '';
    
    // Create carousel items
    testimonialsData.forEach(testimonial => {
        const carouselItem = document.createElement('div');
        carouselItem.className = 'carousel-item';
        
        // Extract YouTube video ID from URL (if available)
        let thumbnailUrl = testimonial.thumbnail_url || 'https://via.placeholder.com/640x360?text=No+Thumbnail';
        
        carouselItem.innerHTML = `
            <img src="${thumbnailUrl}" alt="Testimonial">
            <div class="quote-overlay">
                <p class="quote-text">"${testimonial.hope_driven_quote || 'No quote available'}"</p>
            </div>
        `;
        
        // Add click event to open modal
        carouselItem.addEventListener('click', () => {
            openVideoModal(testimonial);
        });
        
        testimonialCarousel.appendChild(carouselItem);
    });
    
    // Set initial position
    updateCarouselPosition();
}

// Update carousel position based on current index
function updateCarouselPosition() {
    const offset = -currentTestimonialIndex * 100;
    testimonialCarousel.style.transform = `translateX(${offset}%)`;
}

// Navigate to previous testimonial
function navigateToPrev() {
    if (currentTestimonialIndex > 0) {
        currentTestimonialIndex--;
    } else {
        // Loop to the end
        currentTestimonialIndex = testimonialsData.length - 1;
    }
    updateCarouselPosition();
}

// Navigate to next testimonial
function navigateToNext() {
    if (currentTestimonialIndex < testimonialsData.length - 1) {
        currentTestimonialIndex++;
    } else {
        // Loop to the beginning
        currentTestimonialIndex = 0;
    }
    updateCarouselPosition();
}

// Display a fact from the facts data
function displayFact() {
    if (factsData.length === 0) return;
    
    const fact = factsData[currentFactIndex];
    insightContent.innerHTML = `
        <p class="insight-text">${fact.fact || 'No insight available at this time.'}</p>
    `;
}

// Rotate to the next fact
function rotateFact() {
    if (factsData.length === 0) return;
    
    currentFactIndex = (currentFactIndex + 1) % factsData.length;
    displayFact();
}

// Open video modal with testimonial data
function openVideoModal(testimonial) {
    // Extract YouTube video ID from URL
    let videoId = '';
    let videoUrl = testimonial.url || '';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // Extract video ID from YouTube URL
        const urlParams = new URLSearchParams(new URL(videoUrl).search);
        videoId = urlParams.get('v');
        
        // Handle youtu.be format
        if (!videoId && videoUrl.includes('youtu.be')) {
            videoId = videoUrl.split('/').pop().split('?')[0];
        }
    }
    
    // Create video embed if video ID is available
    if (videoId) {
        videoContainer.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
    } else {
        // If no video available, show the thumbnail
        videoContainer.innerHTML = `
            <img src="${testimonial.thumbnail_url || 'https://via.placeholder.com/640x360?text=No+Video+Available'}" 
                 alt="Testimonial" style="width: 100%;">
        `;
    }
    
    // Display voice tags if available
    voiceTags.innerHTML = '';
    if (testimonial.voice_tags && testimonial.voice_tags.length > 0) {
        testimonial.voice_tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'voice-tag';
            tagElement.textContent = tag;
            voiceTags.appendChild(tagElement);
        });
    } else {
        voiceTags.innerHTML = '<span class="voice-tag">No tags available</span>';
    }
    
    // Show the modal
    videoModal.style.display = 'block';
    
    // Prevent scrolling on the body when modal is open
    document.body.style.overflow = 'hidden';
}

// Close video modal
function closeVideoModal() {
    videoModal.style.display = 'none';
    videoContainer.innerHTML = '';
    
    // Restore scrolling
    document.body.style.overflow = 'auto';
}

// Event listeners
prevBtn.addEventListener('click', navigateToPrev);
nextBtn.addEventListener('click', navigateToNext);
closeModal.addEventListener('click', closeVideoModal);

// Close modal when clicking outside the content
videoModal.addEventListener('click', (event) => {
    if (event.target === videoModal) {
        closeVideoModal();
    }
});

// Keyboard navigation
document.addEventListener('keydown', (event) => {
    if (videoModal.style.display === 'block') {
        if (event.key === 'Escape') {
            closeVideoModal();
        }
    } else {
        if (event.key === 'ArrowLeft') {
            navigateToPrev();
        } else if (event.key === 'ArrowRight') {
            navigateToNext();
        }
    }
});

// Initialize data loading when the page loads
document.addEventListener('DOMContentLoaded', loadData);
