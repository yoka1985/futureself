document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const carousel = document.getElementById('testimonial-carousel');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const healingFactContainer = document.getElementById('healing-fact');
    const modal = document.getElementById('video-modal');
    const modalCloseBtn = modal.querySelector('.close-button');
    const videoIframe = document.getElementById('video-iframe');
    const voiceTagsDisplay = document.getElementById('voice-tags-display');

    // --- State Variables ---
    let testimonialsData = [];
    let factsData = { healing_insights: [] }; // Initialize with empty array
    let currentSlideIndex = 0;
    let currentFactIndex = 0;
    let factIntervalId = null; // To hold the interval timer

    const FACT_ROTATION_INTERVAL = 900000; // 15 minutes in milliseconds

    // --- Fetch Data ---
    function fetchData() {
        const testimonialsPromise = fetch('final_db_clustered_tagged_cleaned.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching testimonials:', error);
                carousel.innerHTML = '<p class="error-message">Could not load testimonials.</p>';
                return []; // Return empty array on error
            });

        const factsPromise = fetch('facts.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching facts:', error);
                healingFactContainer.innerHTML = '<p class="error-message">Could not load insights.</p>';
                return { healing_insights: [] }; // Return object with empty array on error
            });

        // Wait for both fetches to complete
        Promise.all([testimonialsPromise, factsPromise])
            .then(([testimonials, facts]) => {
                testimonialsData = testimonials;
                factsData = facts;

                // Initialize UI only after data is loaded
                if (testimonialsData.length > 0) {
                    createCarouselSlides();
                    showSlide(currentSlideIndex); // Show the first slide
                } else if (!carousel.querySelector('.error-message')) {
                     carousel.innerHTML = '<p>No testimonials available.</p>';
                     prevBtn.style.display = 'none'; // Hide buttons if no slides
                     nextBtn.style.display = 'none';
                }


                if (factsData.healing_insights.length > 0) {
                    displayFact(currentFactIndex); // Display the first fact
                    startFactRotation(); // Start rotating facts
                } else if (!healingFactContainer.querySelector('.error-message')) {
                     healingFactContainer.innerHTML = '<p>No insights available.</p>';
                }
            });
    }

    // --- Carousel Logic ---
    function createCarouselSlides() {
        // Clear placeholder or error message
        carousel.innerHTML = '';

        testimonialsData.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.setAttribute('data-index', index); // Keep track of index

            const img = document.createElement('img');
            img.src = item.thumbnail_url;
            // Use title for alt text, provide fallback if missing
            img.alt = item.title || 'Testimonial thumbnail';
            img.loading = 'lazy'; // Lazy load images

            // Store video data directly on the image element for easy access
            img.dataset.videoUrl = item.url; // The video URL to embed
            // Join tags nicely, handle case where it might be missing/empty
            img.dataset.voiceTags = (item.voice_tags || []).join(' | ');

            // Add click listener to the image to open the modal
            img.addEventListener('click', handleImageClick);

            const quote = document.createElement('p');
            quote.className = 'quote';
            // Use the first hope-driven quote, provide fallback
            quote.textContent = (item.hope_driven_quotes && item.hope_driven_quotes.length > 0)
                                ? `"${item.hope_driven_quotes[0]}"`
                                : "An inspiring journey."; // Fallback quote

            slide.appendChild(img);
            slide.appendChild(quote);
            carousel.appendChild(slide);
        });

         // Hide buttons if only one slide
        if (testimonialsData.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
             prevBtn.style.display = 'block';
             nextBtn.style.display = 'block';
        }
    }

    function showSlide(index) {
        const slides = carousel.querySelectorAll('.carousel-slide');
        if (!slides || slides.length === 0) return; // Guard against no slides

        // Ensure index is within bounds
        const numSlides = slides.length;
        // Use modulo for wrapping, ensuring positive result
        currentSlideIndex = ((index % numSlides) + numSlides) % numSlides;

        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === currentSlideIndex) {
                slide.classList.add('active');
            }
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
        const img = event.target;
        const videoUrl = img.dataset.videoUrl;
        const voiceTags = img.dataset.voiceTags;

        if (videoUrl) {
            // Attempt to create an embeddable URL if needed (basic YouTube example)
            let embedUrl = videoUrl;
            // Simple check if it's a youtube link that needs embedding
             if (videoUrl.includes("youtube.com/watch?v=")) {
                const videoId = videoUrl.split('v=')[1].split('&')[0]; // Extract video ID
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (videoUrl.includes("youtu.be/")) {
                 const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                 embedUrl = `https://www.youtube.com/embed/${videoId}`;
            }
            // Add other video platform embed logic if necessary

            videoIframe.src = embedUrl; // Set iframe source
        } else {
            videoIframe.src = ''; // Clear src if no URL
             console.warn("No video URL found for this testimonial image.");
        }

        // Display voice tags
        voiceTagsDisplay.innerHTML = ''; // Clear previous tags
        if (voiceTags) {
            const tagsArray = voiceTags.split(' | '); // Split back into array
            tagsArray.forEach(tag => {
                if(tag.trim()){ // Ensure tag is not empty
                    const tagElement = document.createElement('span');
                    tagElement.textContent = tag.trim();
                    voiceTagsDisplay.appendChild(tagElement);
                }
            });
        } else {
            voiceTagsDisplay.innerHTML = '<span>No voice tags available</span>';
        }

        modal.style.display = 'flex'; // Show modal (using flex as per CSS)
    }

    function closeModal() {
        modal.style.display = 'none'; // Hide modal
        videoIframe.src = ''; // Stop video playback by clearing src
    }

    // --- Healing Insights Logic ---
    function displayFact(index) {
        if (!factsData.healing_insights || factsData.healing_insights.length === 0) {
            healingFactContainer.innerHTML = '<p>No insights available.</p>';
            return; // Exit if no facts
        }

         // Ensure index is valid
        const safeIndex = index % factsData.healing_insights.length;
        const fact = factsData.healing_insights[safeIndex];

        healingFactContainer.innerHTML = `
            <h3>${fact.title || 'Insight'}</h3>
            ${fact.stat ? `<p class="fact-stat">${fact.stat}</p>` : ''}
            ${fact.quote ? `<p class="fact-quote">"${fact.quote}"</p>` : ''}
            ${fact.action ? `<p class="fact-action">${fact.action}</p>` : ''}
        `;
         // Briefly change background for visual feedback of update
         healingFactContainer.style.backgroundColor = '#dcedc8'; // Lighter green temporary highlight
         setTimeout(() => {
             healingFactContainer.style.backgroundColor = '#fff'; // Return to normal background
         }, 500); // Duration of the highlight
    }

    function rotateFact() {
        if (!factsData.healing_insights || factsData.healing_insights.length === 0) {
            return; // Don't rotate if no facts
        }
        currentFactIndex = (currentFactIndex + 1) % factsData.healing_insights.length;
        displayFact(currentFactIndex);
    }

    function startFactRotation() {
         // Clear any existing interval first
         if (factIntervalId) {
            clearInterval(factIntervalId);
        }
        // Start new interval only if there are facts to rotate
        if (factsData.healing_insights && factsData.healing_insights.length > 1) {
             factIntervalId = setInterval(rotateFact, FACT_ROTATION_INTERVAL);
        }
    }

    // --- Event Listeners ---
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
    modalCloseBtn.addEventListener('click', closeModal);

    // Close modal if clicking outside the modal content
    modal.addEventListener('click', (event) => {
        if (event.target === modal) { // Check if the click was directly on the modal background
            closeModal();
        }
    });

    // Close modal with the Escape key
     document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });


    // --- Initialization ---
    fetchData(); // Start the process by fetching data

}); // End DOMContentLoaded
