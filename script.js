document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // Select elements and immediately check if they exist
    const carousel = document.getElementById('testimonial-carousel');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const healingFactContainer = document.getElementById('healing-fact');
    const modal = document.getElementById('video-modal');
    const videoIframe = document.getElementById('video-iframe');
    const voiceTagsDisplay = document.getElementById('voice-tags-display');

    // Select modal close button *after* confirming modal exists
    const modalCloseBtn = modal ? modal.querySelector('.close-button') : null;

    // --- Log Elements for Debugging (Optional) ---
    // console.log('Carousel Element:', carousel);
    // console.log('Prev Button Element:', prevBtn);
    // console.log('Next Button Element:', nextBtn);
    // console.log('Healing Fact Container:', healingFactContainer);
    // console.log('Modal Element:', modal);
    // console.log('Modal Close Button:', modalCloseBtn);
    // console.log('Video Iframe:', videoIframe);
    // console.log('Voice Tags Display:', voiceTagsDisplay);

    // --- Check if Essential Elements Exist ---
    if (!carousel || !healingFactContainer || !modal || !modalCloseBtn || !videoIframe || !voiceTagsDisplay) {
        console.error('Essential UI elements not found! Check HTML IDs and structure.');
        // Optionally display a user-friendly error message on the page
        // document.body.innerHTML = '<h1>Error loading page content. Please try again later.</h1>';
        return; // Stop script execution if critical elements are missing
    }
     // Hide buttons initially, show them later only if needed
     if (prevBtn) prevBtn.style.display = 'none';
     if (nextBtn) nextBtn.style.display = 'none';


    // --- State Variables ---
    let testimonialsData = [];
    let factsData = { healing_insights: [] };
    let currentSlideIndex = 0;
    let currentFactIndex = 0;
    let factIntervalId = null;

    const FACT_ROTATION_INTERVAL = 900000; // 15 minutes

    // --- Fetch Data ---
    function fetchData() {
        const testimonialsPromise = fetch('final_db_clustered_tagged_cleaned.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching testimonials:', error);
                if (carousel) { // Check if carousel exists before modifying
                     carousel.innerHTML = '<p class="error-message">Could not load testimonials.</p>';
                }
                return [];
            });

        const factsPromise = fetch('facts.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching facts:', error);
                 if (healingFactContainer) { // Check if container exists
                    healingFactContainer.innerHTML = '<p class="error-message">Could not load insights.</p>';
                 }
                return { healing_insights: [] };
            });

        Promise.all([testimonialsPromise, factsPromise])
            .then(([testimonials, facts]) => {
                testimonialsData = testimonials;
                factsData = facts;

                // Initialize UI *only if elements exist*
                if (carousel && testimonialsData.length > 0) {
                    createCarouselSlides();
                    showSlide(currentSlideIndex);
                } else if (carousel && !carousel.querySelector('.error-message')) {
                    carousel.innerHTML = '<p>No testimonials available.</p>';
                }

                if (healingFactContainer && factsData.healing_insights.length > 0) {
                    displayFact(currentFactIndex);
                    startFactRotation();
                } else if (healingFactContainer && !healingFactContainer.querySelector('.error-message')) {
                    healingFactContainer.innerHTML = '<p>No insights available.</p>';
                }
            });
    }

    // --- Carousel Logic ---
    function createCarouselSlides() {
        if (!carousel) return; // Guard clause
        carousel.innerHTML = ''; // Clear placeholder

        testimonialsData.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.setAttribute('data-index', index);

            const img = document.createElement('img');
            img.src = item.thumbnail_url;
            img.alt = item.title || 'Testimonial thumbnail';
            img.loading = 'lazy';
            img.dataset.videoUrl = item.url;
            img.dataset.voiceTags = (item.voice_tags || []).join(' | ');
            img.addEventListener('click', handleImageClick); // Add listener here

            const quote = document.createElement('p');
            quote.className = 'quote';
            quote.textContent = (item.hope_driven_quotes && item.hope_driven_quotes[0])
                                ? `"${item.hope_driven_quotes[0]}"`
                                : "An inspiring journey.";

            slide.appendChild(img);
            slide.appendChild(quote);
            carousel.appendChild(slide); // This is safe now because we checked 'carousel'
        });

        // Show/hide buttons based on slide count (check if buttons exist first)
        if (testimonialsData.length > 1) {
           if (prevBtn) prevBtn.style.display = 'block';
           if (nextBtn) nextBtn.style.display = 'block';
        } else {
           if (prevBtn) prevBtn.style.display = 'none';
           if (nextBtn) nextBtn.style.display = 'none';
        }
    }

    function showSlide(index) {
        if (!carousel) return; // Guard clause
        const slides = carousel.querySelectorAll('.carousel-slide');
        if (!slides || slides.length === 0) return;

        const numSlides = slides.length;
        currentSlideIndex = ((index % numSlides) + numSlides) % numSlides;

        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === currentSlideIndex); // More concise way to toggle active class
        });
    }

    function nextSlide() {
        showSlide(currentSlideIndex + 1);
    }

    function prevSlide() {
        showSlide(currentSlideIndex - 1);
    }

    // --- Modal Logic ---
    function handleImageClick(event) {
        // We already checked modal, videoIframe, voiceTagsDisplay exist
        const img = event.target;
        const videoUrl = img.dataset.videoUrl;
        const voiceTags = img.dataset.voiceTags;

        if (videoUrl) {
            let embedUrl = videoUrl; // Basic assumption
             // Basic YouTube URL to Embed URL conversion (adjust if needed)
            try {
                 if (videoUrl.includes("youtube.com/watch?v=")) {
                    const urlParams = new URLSearchParams(new URL(videoUrl).search);
                    const videoId = urlParams.get('v');
                    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                } else if (videoUrl.includes("youtu.be/")) {
                    const pathSegments = new URL(videoUrl).pathname.split('/');
                    const videoId = pathSegments[pathSegments.length - 1];
                     if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
            } catch (e) {
                console.error("Error parsing video URL:", e);
                // Keep embedUrl as the original videoUrl if parsing fails
            }
            videoIframe.src = embedUrl;
        } else {
            videoIframe.src = '';
            console.warn("No video URL found for this testimonial image.");
        }

        voiceTagsDisplay.innerHTML = ''; // Clear previous tags
        if (voiceTags) {
            const tagsArray = voiceTags.split(' | ');
            tagsArray.forEach(tag => {
                if (tag.trim()) {
                    const tagElement = document.createElement('span');
                    tagElement.textContent = tag.trim();
                    voiceTagsDisplay.appendChild(tagElement);
                }
            });
        } else {
            voiceTagsDisplay.innerHTML = '<span>No voice tags available</span>';
        }

        modal.style.display = 'flex';
    }

    function closeModal() {
        if (!modal || !videoIframe) return; // Guard clause
        modal.style.display = 'none';
        videoIframe.src = ''; // Stop video
    }

    // --- Healing Insights Logic ---
    function displayFact(index) {
        if (!healingFactContainer || !factsData.healing_insights || factsData.healing_insights.length === 0) {
           if (healingFactContainer && !healingFactContainer.querySelector('.error-message')) {
                 healingFactContainer.innerHTML = '<p>No insights available.</p>';
            }
           return;
        }

        const safeIndex = index % factsData.healing_insights.length;
        const fact = factsData.healing_insights[safeIndex];

        healingFactContainer.innerHTML = `
            <h3>${fact.title || 'Insight'}</h3>
            ${fact.stat ? `<p class="fact-stat">${fact.stat}</p>` : ''}
            ${fact.quote ? `<p class="fact-quote">"${fact.quote}"</p>` : ''}
            ${fact.action ? `<p class="fact-action">${fact.action}</p>` : ''}
        `;
        healingFactContainer.style.backgroundColor = '#dcedc8';
        setTimeout(() => {
            if (healingFactContainer) healingFactContainer.style.backgroundColor = '#fff';
        }, 500);
    }

    function rotateFact() {
        if (!factsData.healing_insights || factsData.healing_insights.length === 0) return;
        currentFactIndex = (currentFactIndex + 1) % factsData.healing_insights.length;
        displayFact(currentFactIndex);
    }

    function startFactRotation() {
        if (factIntervalId) clearInterval(factIntervalId);
        if (factsData.healing_insights && factsData.healing_insights.length > 1) {
            factIntervalId = setInterval(rotateFact, FACT_ROTATION_INTERVAL);
        }
    }

    // --- Event Listeners (Attach only if elements exist) ---
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal); // Safe now

    // Modal background click listener (safe because we checked 'modal')
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Escape key listener
    document.addEventListener('keydown', (event) => {
        // Check modal exists and is displayed before closing
        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // --- Initialization ---
    fetchData(); // Start fetching data

}); // End DOMContentLoaded
