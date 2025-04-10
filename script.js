document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const filterControls = document.getElementById('filter-controls');
    const conditionFiltersContainer = document.getElementById('condition-filters');
    const methodFiltersContainer = document.getElementById('method-filters');
    const themeFiltersContainer = document.getElementById('theme-filters');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const testimonialGrid = document.getElementById('testimonial-grid');
    const healingFactContainer = document.getElementById('healing-fact');
    const nextInsightBtn = document.getElementById('next-insight-btn');
    const modal = document.getElementById('video-modal');
    const modalCloseBtn = modal ? modal.querySelector('.close-button') : null;
    const videoIframe = document.getElementById('video-iframe');
    const voiceTagsDisplay = document.getElementById('voice-tags-display');
    // New modal content elements
    const modalTitle = document.getElementById('modal-title');
    const modalConditions = document.getElementById('modal-conditions');
    const modalMethods = document.getElementById('modal-methods');
    const modalOutcomes = document.getElementById('modal-outcomes');
    const modalMoment = document.getElementById('modal-moment');
    const modalQuotes = document.getElementById('modal-quotes');

    // --- Check if Essential Elements Exist ---
    // Add checks for new elements as well
    if (!filterControls || !conditionFiltersContainer || !methodFiltersContainer || !themeFiltersContainer || !clearFiltersBtn || !testimonialGrid || !healingFactContainer || !nextInsightBtn || !modal || !modalCloseBtn || !videoIframe || !voiceTagsDisplay || !modalTitle || !modalConditions || !modalMethods || !modalOutcomes || !modalMoment || !modalQuotes) {
        console.error('Essential UI elements not found! Check HTML IDs and structure.');
        if (testimonialGrid) testimonialGrid.innerHTML = '<p class="error-message">Error loading page structure. Please try again later.</p>';
        return; // Stop script execution
    }

    // --- State Variables ---
    let testimonialsData = []; // Holds the original full dataset
    let factsData = { healing_insights: [] };
    let currentFactIndex = 0;
    let activeFilters = {
        condition: null,
        method: null,
        theme: null
    };

    // --- Fetch Data ---
    function fetchData() {
        // Clear placeholders initially
        testimonialGrid.innerHTML = '<p class="placeholder">Loading testimonials...</p>';
        healingFactContainer.innerHTML = '<p class="placeholder">Loading insights...</p>';
        conditionFiltersContainer.innerHTML = '<span class="placeholder">Loading filters...</span>';
        methodFiltersContainer.innerHTML = ''; // Clear other filter placeholders too
        themeFiltersContainer.innerHTML = '';


        const testimonialsPromise = fetch('final_db_clustered_tagged_cleaned.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching testimonials:', error);
                if (testimonialGrid) testimonialGrid.innerHTML = '<p class="error-message">Could not load testimonials.</p>';
                return []; // Return empty array on error
            });

        const factsPromise = fetch('facts.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching facts:', error);
                if (healingFactContainer) healingFactContainer.innerHTML = '<p class="error-message">Could not load insights.</p>';
                return { healing_insights: [] }; // Return object with empty array on error
            });

        Promise.all([testimonialsPromise, factsPromise])
            .then(([testimonials, facts]) => {
                testimonialsData = testimonials;
                factsData = facts;

                // Initialize UI only after data is loaded and elements exist
                if (testimonialsData.length > 0) {
                    populateFilters();
                    renderTestimonialGrid(testimonialsData); // Render all initially
                } else if (!testimonialGrid.querySelector('.error-message')) {
                    testimonialGrid.innerHTML = '<p>No testimonials available.</p>';
                }

                if (factsData.healing_insights.length > 0) {
                    displayFact(currentFactIndex); // Display the first fact
                } else if (!healingFactContainer.querySelector('.error-message')) {
                    healingFactContainer.innerHTML = '<p>No insights available.</p>';
                }
            });
    }

    // --- Filter Logic ---

    // Helper to get unique, flattened, non-empty values from data for a specific key
    function getUniqueFilterValues(data, key) {
        const allValues = data.flatMap(item => item[key] || []); // Flatten arrays, handle missing keys
        return [...new Set(allValues)].filter(value => value); // Get unique, remove empty values
    }

    function populateFilters() {
        const uniqueConditions = getUniqueFilterValues(testimonialsData, 'conditions');
        const uniqueMethods = getUniqueFilterValues(testimonialsData, 'methods').map(m => m.name); // Assuming methods is array of objects
        const uniqueThemes = getUniqueFilterValues(testimonialsData, 'theme');

        // Clear placeholders
        conditionFiltersContainer.innerHTML = '';
        methodFiltersContainer.innerHTML = '';
        themeFiltersContainer.innerHTML = '';


        createFilterButtons(uniqueConditions, conditionFiltersContainer, 'condition');
        createFilterButtons(uniqueMethods, methodFiltersContainer, 'method');
        createFilterButtons(uniqueThemes, themeFiltersContainer, 'theme');
    }

    function createFilterButtons(values, container, filterType) {
         if (values.length === 0) {
            container.innerHTML = '<span class="placeholder">N/A</span>'; // Indicate if no filters for type
            return;
        }
        values.sort().forEach(value => {
            const button = document.createElement('button');
            button.textContent = value;
            button.dataset.filterType = filterType;
            button.dataset.filterValue = value;
            button.addEventListener('click', handleFilterClick);
            container.appendChild(button);
        });
    }

    function handleFilterClick(event) {
        const button = event.target;
        const filterType = button.dataset.filterType;
        const filterValue = button.dataset.filterValue;

        // Toggle active state for the clicked button within its group
        const filterGroupContainer = button.parentElement;
        const currentlyActive = filterGroupContainer.querySelector('button.active');

        if (currentlyActive && currentlyActive === button) {
            // Deactivate if clicking the already active button
            button.classList.remove('active');
            activeFilters[filterType] = null;
        } else {
            // Deactivate previous button in the group
            if (currentlyActive) {
                currentlyActive.classList.remove('active');
            }
            // Activate the clicked button
            button.classList.add('active');
            activeFilters[filterType] = filterValue;
        }


        filterAndRenderGrid();
    }

    clearFiltersBtn.addEventListener('click', () => {
        activeFilters = { condition: null, method: null, theme: null };
        // Remove active class from all filter buttons
        document.querySelectorAll('#filter-controls button.active').forEach(btn => btn.classList.remove('active'));
        renderTestimonialGrid(testimonialsData); // Re-render full grid
    });

    function filterAndRenderGrid() {
        const filteredData = testimonialsData.filter(item => {
            const conditionMatch = !activeFilters.condition || (Array.isArray(item.conditions) && item.conditions.includes(activeFilters.condition));
            // Adjust method match if methods is array of objects
            const methodMatch = !activeFilters.method || (Array.isArray(item.methods) && item.methods.some(m => m.name === activeFilters.method));
            const themeMatch = !activeFilters.theme || (Array.isArray(item.theme) && item.theme.includes(activeFilters.theme));

            return conditionMatch && methodMatch && themeMatch;
        });
        renderTestimonialGrid(filteredData);
    }


    // --- Grid Rendering ---
    function renderTestimonialGrid(dataToRender) {
        testimonialGrid.innerHTML = ''; // Clear previous grid

        if (dataToRender.length === 0) {
            testimonialGrid.innerHTML = '<p class="placeholder">No testimonials match the current filters.</p>';
            return;
        }

        dataToRender.forEach(item => {
             // Find the original index of the item in the full testimonialsData array
             // This is important for retrieving the full data for the modal later
             const originalIndex = testimonialsData.findIndex(originalItem => originalItem.url === item.url); // Assuming URL is a unique identifier

             if (originalIndex === -1) {
                 console.warn("Could not find original index for item:", item);
                 return; // Skip if we can't find the original item
             }

            const card = document.createElement('div');
            card.className = 'testimonial-card';
            // Store the ORIGINAL index in the data attribute
            card.dataset.index = originalIndex;

            // Handle potential missing data with fallbacks
            const imageUrl = item.thumbnail_url || 'https://placehold.co/300x180/eee/ccc?text=No+Image';
            const title = item.title || 'Untitled Testimonial';
            const conditions = Array.isArray(item.conditions) ? item.conditions.join(', ') : 'N/A';
            const theme = Array.isArray(item.theme) ? item.theme.join(', ') : 'N/A';

            card.innerHTML = `
                <img src="${imageUrl}" alt="${title}" loading="lazy">
                <h4>${title}</h4>
                <p><strong>Condition:</strong> ${conditions}</p>
                <p><strong>Theme:</strong> ${theme}</p>
            `;

            card.addEventListener('click', () => handleCardClick(originalIndex)); // Pass original index
            testimonialGrid.appendChild(card);
        });
    }

    // --- Modal Logic ---
    function handleCardClick(index) {
        // Retrieve the full data using the original index
        const testimonial = testimonialsData[index];
        if (!testimonial) {
            console.error(`Testimonial data not found for index: ${index}`);
            return;
        }

        // Populate Modal Title
        modalTitle.textContent = testimonial.title || 'Testimonial Details';

        // Populate Video
        if (testimonial.url) {
             let embedUrl = testimonial.url; // Assume it might be embeddable
              try {
                 if (testimonial.url.includes("youtube.com/watch")) {
                    const urlParams = new URLSearchParams(new URL(testimonial.url).search);
                    const videoId = urlParams.get('v');
                    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                } else if (testimonial.url.includes("youtu.be/")) {
                    const pathSegments = new URL(testimonial.url).pathname.split('/');
                    const videoId = pathSegments[pathSegments.length - 1];
                     if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
                 // Add more platform checks if needed (Vimeo, etc.)
            } catch (e) {
                console.error("Error parsing video URL:", e);
                 // Keep embedUrl as the original videoUrl if parsing fails
            }
            videoIframe.src = embedUrl;
        } else {
            videoIframe.src = ''; // Clear src if no URL
        }

        // Populate Voice Tags
        voiceTagsDisplay.innerHTML = ''; // Clear previous
        if (Array.isArray(testimonial.voice_tags) && testimonial.voice_tags.length > 0) {
            testimonial.voice_tags.forEach(tag => {
                if (tag.trim()) {
                    const tagElement = document.createElement('span');
                    tagElement.textContent = tag.trim();
                    voiceTagsDisplay.appendChild(tagElement);
                }
            });
        } else {
            voiceTagsDisplay.innerHTML = '<span>No voice tags available</span>';
        }

        // Populate Additional Context
        modalConditions.textContent = Array.isArray(testimonial.conditions) ? testimonial.conditions.join(', ') : 'N/A';
        modalMoment.textContent = testimonial.most_inspiring_moment || 'N/A';

        // Populate Methods (assuming array of objects {name: '', ...})
        modalMethods.innerHTML = '<h4>Methods Used:</h4>'; // Add title
        const methodsList = document.createElement('ul');
        if (Array.isArray(testimonial.methods) && testimonial.methods.length > 0) {
            testimonial.methods.forEach(method => {
                const li = document.createElement('li');
                // Display method name and potentially other details like efficacy
                li.textContent = `${method.name || 'Unnamed Method'}${method.efficacy_score ? ` (Efficacy: ${method.efficacy_score}/10)` : ''}`;
                methodsList.appendChild(li);
            });
        } else {
            methodsList.innerHTML = '<li>N/A</li>';
        }
        modalMethods.appendChild(methodsList);


        // Populate Outcomes (assuming object {physical: '', emotional: ''})
        modalOutcomes.innerHTML = '<h4>Outcomes:</h4>'; // Reset and add title
         const outcomesList = document.createElement('ul');
         let outcomesFound = false;
         if (testimonial.method_outcomes) {
             if(testimonial.method_outcomes.physical) {
                 const li = document.createElement('li');
                 li.innerHTML = `<strong>Physical:</strong> ${testimonial.method_outcomes.physical}`;
                 outcomesList.appendChild(li);
                 outcomesFound = true;
             }
              if(testimonial.method_outcomes.emotional) {
                 const li = document.createElement('li');
                 li.innerHTML = `<strong>Emotional:</strong> ${testimonial.method_outcomes.emotional}`;
                 outcomesList.appendChild(li);
                 outcomesFound = true;
             }
         }
         if (!outcomesFound) {
              outcomesList.innerHTML = '<li>N/A</li>';
         }
         modalOutcomes.appendChild(outcomesList);


        // Populate Hope Quotes
        modalQuotes.innerHTML = '<h4>Hope Driven Quotes:</h4>'; // Reset and add title
        const quotesList = document.createElement('ul');
        if (Array.isArray(testimonial.hope_driven_quotes) && testimonial.hope_driven_quotes.length > 0) {
            testimonial.hope_driven_quotes.forEach(quote => {
                const li = document.createElement('li');
                li.textContent = `"${quote}"`;
                quotesList.appendChild(li);
            });
        } else {
            quotesList.innerHTML = '<li>N/A</li>';
        }
        modalQuotes.appendChild(quotesList);

        // Display Modal
        modal.style.display = 'flex';
    }

    function closeModal() {
        if (!modal || !videoIframe) return;
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

        // Use textContent for security unless HTML is intended
        healingFactContainer.innerHTML = `
            <h3>${fact.title || 'Insight'}</h3>
            ${fact.stat ? `<p class="fact-stat">${fact.stat}</p>` : ''}
            ${fact.quote ? `<p class="fact-quote">"${fact.quote}"</p>` : ''}
            ${fact.action ? `<p class="fact-action">${fact.action}</p>` : ''}
        `;
        // Optional: Visual feedback on change
        healingFactContainer.style.backgroundColor = '#dcedc8';
        setTimeout(() => {
            if (healingFactContainer) healingFactContainer.style.backgroundColor = '#fff';
        }, 300);
    }

    // --- Event Listeners ---
    if (nextInsightBtn) {
        nextInsightBtn.addEventListener('click', () => {
             if (!factsData.healing_insights || factsData.healing_insights.length === 0) return;
             currentFactIndex = (currentFactIndex + 1) % factsData.healing_insights.length;
             displayFact(currentFactIndex);
        });
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // Close modal on background click
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // --- Initialization ---
    fetchData(); // Start the process

}); // End DOMContentLoaded

