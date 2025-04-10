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
        const factsJson = await factsResponse.json();
        factsData = factsJson.healing_insights || []; // Access the healing_insights array
        
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
        
        // Get a random quote from hope_driven_quotes array if it exists
        let quoteText = 'No quote available';
        if (testimonial.hope_driven_quotes && testimonial.hope_driven_quotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * testimonial.hope_driven_quotes.length);
            quoteText = testimonial.hope_driven_quotes[randomIndex];
        }
        
        carouselItem.innerHTML = `
            <img src="${thumbnailUrl}" alt="Testimonial">
            <div class="quote-overlay">
                <p class="quote-text">"${quoteText}"</p>
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
    
    // Create formatted insight with title and action if available
    let insightHtml = `
        <h3 class="insight-title">${fact.title || 'Healing Insight'}</h3>
        <p class="insight-text">${fact.stat || fact.quote || 'No insight available at this time.'}</p>
    `;
    
    // Add action if available
    if (fact.action) {
        insightHtml += `<p class="insight-action"><strong>Try this:</strong> ${fact.action}</p>`;
    }
    
    // Add tags if available
    if (fact.tags && fact.tags.length > 0) {
        insightHtml += `<div class="insight-tags">`;
        fact.tags.forEach(tag => {
            insightHtml += `<span class="insight-tag">${tag}</span>`;
        });
        insightHtml += `</div>`;
    }
    
    insightContent.innerHTML = insightHtml;
}

// Rotate to the next fact
function rotateFact() {
    if (factsData.length === 0) return;
    
    currentFactIndex = (currentFactIndex + 1) % factsData.length;
    displayFact();
}

// Open video
