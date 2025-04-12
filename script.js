document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const filterControls = document.getElementById('filter-controls');
    const conditionFiltersContainer = document.getElementById('condition-filters');
    const methodFiltersContainer = document.getElementById('method-filters');
    const themeFiltersContainer = document.getElementById('theme-filters');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const testimonialGrid = document.getElementById('testimonial-grid');
    const showMoreContainer = document.getElementById('show-more-container');
    const showMoreBtn = document.getElementById('show-more-btn');
    const healingFactContainer = document.getElementById('healing-fact');
    const nextInsightBtn = document.getElementById('next-insight-btn');
    const modal = document.getElementById('video-modal');
    const modalCloseBtn = modal ? modal.querySelector('.close-button') : null;
    const videoIframe = document.getElementById('video-iframe');
    const voiceTagsDisplay = document.getElementById('voice-tags-display');
    // Modal content elements
    const modalTitle = document.getElementById('modal-title');
    const modalConditionsContainer = document.getElementById('modal-conditions-container');
    const modalConditions = document.getElementById('modal-conditions');
    const modalThemeContainer = document.getElementById('modal-theme-container'); // Added Theme container
    const modalTheme = document.getElementById('modal-theme'); // Added Theme span
    const modalMethods = document.getElementById('modal-methods');
    const modalOutcomes = document.getElementById('modal-outcomes');
    const modalMomentContainer = document.getElementById('modal-moment-container');
    const modalMoment = document.getElementById('modal-moment');
    const modalQuotes = document.getElementById('modal-quotes');
    // Cookie Banner Elements
    const consentBanner = document.getElementById('cookieConsentBanner');
    const acceptButton = document.getElementById('cookieConsentAccept');
    // Show More Filters Button (specific to conditions for now)
    const showMoreConditionsBtn = document.querySelector('.show-more-filters[data-filter-type="condition"]');


    // --- Check if Essential Elements Exist ---
    // Add checks for new elements like showMoreConditionsBtn
    if (!filterControls || !conditionFiltersContainer || !methodFiltersContainer || !themeFiltersContainer || !clearFiltersBtn || !testimonialGrid || !showMoreContainer || !showMoreBtn || !healingFactContainer || !nextInsightBtn || !modal || !modalCloseBtn || !videoIframe || !voiceTagsDisplay || !modalTitle || !modalConditionsContainer || !modalConditions || !modalThemeContainer || !modalTheme || !modalMethods || !modalOutcomes || !modalMomentContainer || !modalMoment || !modalQuotes || !consentBanner || !acceptButton || !showMoreConditionsBtn) {
        console.error('Essential UI elements not found! Check HTML IDs and structure.');
        // Avoid wiping the grid if it exists but other elements are missing
        // if (testimonialGrid) testimonialGrid.innerHTML = '<p class="error-message">Error loading page structure. Please try again later.</p>';
        return; // Stop script execution if critical elements are missing
    }

    // --- State Variables ---
    let testimonialsData = []; // Holds the original full dataset
    let filteredTestimonials = []; // Holds the currently filtered dataset
    let factsData = { healing_insights: [] };
    let currentFactIndex = -1; // Start at -1 to ensure first random pick works
    let activeFilters = { condition: null, method: null, theme: null };
    const ITEMS_PER_PAGE = 9; // Number of items to show per page/click
    let itemsToShow = ITEMS_PER_PAGE; // Track how many items are currently visible
    const MAX_CONDITIONS_VISIBLE = 10; // Max condition filters to show initially

    // --- Fetch Data ---
    function fetchData() {
        // Clear placeholders initially
        testimonialGrid.innerHTML = '<p class="placeholder">Loading testimonials...</p>';
        healingFactContainer.innerHTML = '<p class="placeholder">Loading insights...</p>';
        conditionFiltersContainer.innerHTML = '<span class="placeholder">Loading filters...</span>';
        methodFiltersContainer.innerHTML = ''; // Clear other filter placeholders too
        themeFiltersContainer.innerHTML = '';
        showMoreBtn.style.display = 'none'; // Hide button initially
        showMoreConditionsBtn.style.display = 'none'; // Hide initially

        // Fetch testimonials and facts data
        const testimonialsPromise = fetch('final_db_clustered_tagged_cleaned.json')
            .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
            .catch(error => {
                console.error('Error fetching testimonials:', error);
                if (testimonialGrid) testimonialGrid.innerHTML = '<p class="error-message">Could not load testimonials. Check file path and JSON format.</p>';
                return []; // Return empty array on error
            });

        const factsPromise = fetch('facts.json')
            .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
            .catch(error => {
                console.error('Error fetching facts:', error);
                if (healingFactContainer) healingFactContainer.innerHTML = '<p class="error-message">Could not load insights. Check file path and JSON format.</p>';
                return { healing_insights: [] }; // Return object with empty array on error
            });

        // Process data once both fetches complete
        Promise.all([testimonialsPromise, factsPromise])
            .then(([testimonials, facts]) => {
                testimonialsData = testimonials;
                filteredTestimonials = testimonials; // Initially, filtered is all data
                factsData = facts;

                // Initialize UI based on fetched data
                if (testimonialsData.length > 0) {
                    populateFilters(); // Populate filters based on thresholds
                    renderTestimonialGrid(); // Render initial batch of testimonials
                } else if (!testimonialGrid.querySelector('.error-message')) {
                    testimonialGrid.innerHTML = '<p>No testimonials available.</p>';
                }

                if (factsData.healing_insights.length > 0) {
                    displayRandomFact(); // Display initial random fact
                } else if (!healingFactContainer.querySelector('.error-message')) {
                    healingFactContainer.innerHTML = '<p>No insights available.</p>';
                }
            });
    }

    // --- Filter Logic ---

    // Helper to get unique, flattened, non-empty values from data for a specific key
    function getUniqueFilterValues(data, key, subKey = null) {
        const allValues = data.flatMap(item => {
            const value = item[key];
            if (!value) return []; // Handle missing key
            if (subKey && Array.isArray(value)) {
                // Ensure we handle cases where elements in the array might not be objects
                return value.map(subItem => (typeof subItem === 'object' && subItem !== null) ? subItem[subKey] : null).filter(Boolean);
            }
            // If it's already an array but no subKey, return it as is (or wrap single value in array)
            return Array.isArray(value) ? value : [value];
        });
        // Get unique, filter out any remaining falsy values (like empty strings)
        return [...new Set(allValues)].filter(value => value);
    }

    // Helper to count occurrences of filter values across all testimonials
    function countOccurrences(data, key, subKey = null) {
        const counts = {};
        data.forEach(item => {
            let values = item[key];
            if (!values) return; // Skip if key is missing

            // Ensure values is an array to iterate over
            if (!Array.isArray(values)) {
                values = [values];
            }

            // Extract subKey if needed and handle potential non-objects in array
            if (subKey) {
                 values = values.map(subItem => (typeof subItem === 'object' && subItem !== null) ? subItem[subKey] : null).filter(Boolean);
            }

            // Use a Set to count each value only once per testimonial item
            const uniqueValuesPerItem = new Set(values);
            uniqueValuesPerItem.forEach(value => {
                if (value) { // Ensure value is not empty/null
                    counts[value] = (counts[value] || 0) + 1;
                }
            });
        });
        return counts;
    }

    // Populates filter buttons based on data and thresholds
    function populateFilters() {
        // Get all unique values first
        const allUniqueConditions = getUniqueFilterValues(testimonialsData, 'conditions');
        const allUniqueMethods = getUniqueFilterValues(testimonialsData, 'methods', 'name'); // Extract 'name' from method objects
        const allUniqueThemes = getUniqueFilterValues(testimonialsData, 'theme');

        // Count occurrences in the original data
        const conditionCounts = countOccurrences(testimonialsData, 'conditions');
        const methodCounts = countOccurrences(testimonialsData, 'methods', 'name');

        // Apply thresholds
        const filteredConditions = allUniqueConditions.filter(condition => conditionCounts[condition] >= 3);
        const filteredMethods = allUniqueMethods.filter(method => methodCounts[method] >= 5);
        const filteredThemes = allUniqueThemes; // No threshold for themes

        // Clear placeholders before adding buttons
        conditionFiltersContainer.innerHTML = '';
        methodFiltersContainer.innerHTML = '';
        themeFiltersContainer.innerHTML = '';

        // Create buttons only for values meeting the threshold
        createFilterButtons(filteredConditions, conditionFiltersContainer, 'condition', MAX_CONDITIONS_VISIBLE);
        // Populate others normally
        createFilterButtons(filteredMethods, methodFiltersContainer, 'method');
        createFilterButtons(filteredThemes, themeFiltersContainer, 'theme');
    }

    // Creates and appends filter buttons to the specified container, handling visibility limit
    function createFilterButtons(values, container, filterType, limit = null) {
         if (!container) return; // Safety check
         if (values.length === 0) {
            // Provide a clearer message if no filters meet the criteria
            container.innerHTML = `<span class="placeholder">No common ${filterType}s found meeting criteria.</span>`;
             // Ensure show more button for this type is hidden
             const showMoreBtnForType = document.querySelector(`.show-more-filters[data-filter-type="${filterType}"]`);
             if (showMoreBtnForType) showMoreBtnForType.style.display = 'none';
            return;
        }
        // Sort values alphabetically for consistent order
        values.sort().forEach((value, index) => {
            const button = document.createElement('button');
            button.textContent = value;
            button.dataset.filterType = filterType; // Store filter type
            button.dataset.filterValue = value; // Store filter value
            button.addEventListener('click', handleFilterClick); // Add click listener
            // Hide button if limit is set and index exceeds it
            if (limit !== null && index >= limit) {
                button.classList.add('filter-button-hidden');
            }
            container.appendChild(button);
        });

        // Show the "Show More" button if limit was applied and there are hidden buttons
        const showMoreBtnForType = document.querySelector(`.show-more-filters[data-filter-type="${filterType}"]`);
        if (showMoreBtnForType) {
            if (limit !== null && values.length > limit) {
                showMoreBtnForType.style.display = 'block'; // Show the button
            } else {
                showMoreBtnForType.style.display = 'none'; // Hide the button
            }
        }
    }

     // Add listener for the "Show More Conditions" button
     if (showMoreConditionsBtn) {
        showMoreConditionsBtn.addEventListener('click', (event) => {
            const filterType = event.target.dataset.filterType;
            const container = document.getElementById(`${filterType}-filters`);
            if (container) {
                // Remove the hidden class from all buttons within this container
                container.querySelectorAll('.filter-button-hidden').forEach(btn => {
                    btn.classList.remove('filter-button-hidden');
                });
            }
            event.target.style.display = 'none'; // Hide the "Show More" button itself
        });
    }


    // Handles clicks on filter buttons
    function handleFilterClick(event) {
        const button = event.target;
        const filterType = button.dataset.filterType;
        const filterValue = button.dataset.filterValue;
        const filterGroupContainer = button.parentElement;
        const currentlyActive = filterGroupContainer.querySelector('button.active');

        // Toggle logic: If clicking active button, deactivate. Otherwise, activate clicked, deactivate others in group.
        if (currentlyActive && currentlyActive === button) {
            button.classList.remove('active');
            activeFilters[filterType] = null; // Clear this filter type
        } else {
            if (currentlyActive) currentlyActive.classList.remove('active'); // Deactivate sibling
            button.classList.add('active'); // Activate clicked
            activeFilters[filterType] = filterValue; // Set this filter type
        }
        applyFiltersAndRender(); // Apply filters and re-render the grid
    }

    // Handles click on the "Clear All Filters" button
    clearFiltersBtn.addEventListener('click', () => {
        // Reset active filters object
        activeFilters = { condition: null, method: null, theme: null };
        // Remove 'active' class from all filter buttons visually
        document.querySelectorAll('#filter-controls button.active').forEach(btn => btn.classList.remove('active'));

        // Reset visibility of condition filters
        if (conditionFiltersContainer) {
            conditionFiltersContainer.querySelectorAll('button').forEach((btn, index) => {
                btn.classList.toggle('filter-button-hidden', index >= MAX_CONDITIONS_VISIBLE);
            });
        }
        // Show 'Show More Conditions' button again if needed
        const numConditions = conditionFiltersContainer ? conditionFiltersContainer.querySelectorAll('button').length : 0;
        if (showMoreConditionsBtn) {
             showMoreConditionsBtn.style.display = (numConditions > MAX_CONDITIONS_VISIBLE) ? 'block' : 'none';
        }

        // Apply empty filters (shows all data) and re-render the grid
        applyFiltersAndRender();
    });

    // Filters the main data based on activeFilters and triggers grid rendering
    function applyFiltersAndRender() {
         if (!testimonialGrid) return; // Safety check
         testimonialGrid.classList.add('grid-loading'); // Add loading class for visual feedback

        // Filter the original testimonialsData
        filteredTestimonials = testimonialsData.filter(item => {
            // Check condition match
            const conditionMatch = !activeFilters.condition ||
                (Array.isArray(item.conditions) && item.conditions.includes(activeFilters.condition));

            // Check method match (handles methods being array of objects with 'name')
            const methodMatch = !activeFilters.method ||
                (Array.isArray(item.methods) && item.methods.some(m => typeof m === 'object' && m !== null && m.name === activeFilters.method));

            // Check theme match
            const themeMatch = !activeFilters.theme ||
                (Array.isArray(item.theme) && item.theme.includes(activeFilters.theme));

            // Item passes if all active filters match (or if filter is not active)
            return conditionMatch && methodMatch && themeMatch;
        });

        itemsToShow = ITEMS_PER_PAGE; // Reset pagination to show the first page
        renderTestimonialGrid(); // Render the filtered results

        // Remove loading state after a short delay for visual effect
        setTimeout(() => {
            if (testimonialGrid) testimonialGrid.classList.remove('grid-loading');
        }, 150); // Adjust delay as needed
    }


    // --- Grid Rendering & Pagination ---

    // Renders the testimonial cards in the grid based on filteredTestimonials and itemsToShow
    function renderTestimonialGrid() {
        if (!testimonialGrid) return; // Safety check
        testimonialGrid.innerHTML = ''; // Clear previous grid content

        // Display message if no testimonials match filters
        if (filteredTestimonials.length === 0) {
            testimonialGrid.innerHTML = '<p class="placeholder">No testimonials match the current filters.</p>';
            if (showMoreBtn) showMoreBtn.style.display = 'none'; // Hide button if no results
            return;
        }

        // Determine the slice of data to display based on pagination
        const dataSlice = filteredTestimonials.slice(0, itemsToShow);

        // Create and append cards for the data slice
        dataSlice.forEach(item => {
             // Find the original index of the item in the full testimonialsData array
             // Using URL as a unique identifier for reliable lookup
             const originalIndex = testimonialsData.findIndex(originalItem => originalItem.url === item.url);
             if (originalIndex === -1) {
                 console.warn("Could not find original index for item:", item.title);
                 return; // Skip if we can't find the original item
             }

            // Create card element
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.dataset.index = originalIndex; // Store the ORIGINAL index

            // Prepare card content, handle N/A or missing data
            const imageUrl = item.thumbnail_url || 'https://placehold.co/300x180/eee/ccc?text=No+Image';
            const title = item.title || 'Untitled Testimonial';
            // Get first quote, handle missing quotes
            const quote = (Array.isArray(item.hope_driven_quotes) && item.hope_driven_quotes.length > 0) ? item.hope_driven_quotes[0] : null;
            // Get first 2 non-empty voice tags
            const tags = (Array.isArray(item.voice_tags) && item.voice_tags.length > 0)
                       ? item.voice_tags.filter(t => t && t.trim()).slice(0, 2)
                       : null;

            // Generate card HTML (showing quote and tags, hiding condition/theme)
            card.innerHTML = `
                <img src="${imageUrl}" alt="${title}" loading="lazy">
                <h4>${title}</h4>
                <div class="card-content">
                    ${quote ? `<p class="card-quote">"${quote}"</p>` : '<p class="card-quote" style="opacity: 0.5;"><em>No quote available.</em></p>'}
                    ${tags ? `<div class="card-tags">${tags.map(tag => `<span>${tag}</span>`).join('')}</div>` : ''}
                </div>
            `;

            // Add click listener to the entire card
            card.addEventListener('click', () => handleCardClick(originalIndex)); // Pass original index to modal handler
            testimonialGrid.appendChild(card);
        });

        // Show or hide the "Show More" button based on remaining items
        if (showMoreBtn) {
            if (filteredTestimonials.length > itemsToShow) {
                showMoreBtn.style.display = 'inline-block';
            } else {
                showMoreBtn.style.display = 'none';
            }
        }
    }

    // Event listener for "Show More" testimonials button
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            itemsToShow += ITEMS_PER_PAGE; // Increase number of items to show
            renderTestimonialGrid(); // Re-render the grid with more items
        });
    }


    // --- Modal Logic ---

    // Handles clicks on testimonial cards to open and populate the modal
    function handleCardClick(index) {
        // Retrieve the full data using the original index from testimonialsData
        const testimonial = testimonialsData[index];
        if (!testimonial || !modal) return; // Safety checks

        // Populate Modal Title
        if (modalTitle) modalTitle.textContent = testimonial.title || 'Testimonial Details';

        // Populate Video Iframe Source (with embed URL logic)
        if (videoIframe && testimonial.url) {
            let embedUrl = testimonial.url; // Default assumption
             try {
                 // Check for standard YouTube watch URL
                 if (testimonial.url.includes("youtube.com/watch")) {
                    const urlObj = new URL(testimonial.url);
                    const videoId = urlObj.searchParams.get('v');
                    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
                // Check for YouTube short URL (youtu.be)
                else if (testimonial.url.includes("youtu.be/")) {
                    const urlObj = new URL(testimonial.url);
                    const pathSegments = urlObj.pathname.split('/');
                    const videoId = pathSegments[pathSegments.length - 1]; // Get last part of path
                     if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
                 // Add more platform checks here if needed (e.g., Vimeo)
            } catch (e) {
                console.error("Error parsing video URL:", testimonial.url, e);
            }
            videoIframe.src = embedUrl;
        } else if (videoIframe) {
             videoIframe.src = ''; // Clear src if no URL provided
        }

        // Populate Voice Tags Display
        if (voiceTagsDisplay) {
            voiceTagsDisplay.innerHTML = ''; // Clear previous tags
            if (Array.isArray(testimonial.voice_tags) && testimonial.voice_tags.length > 0) {
                testimonial.voice_tags.forEach(tag => {
                    if (tag && tag.trim()) { // Ensure tag is not null/empty
                        const tagElement = document.createElement('span');
                        tagElement.textContent = tag.trim();
                        voiceTagsDisplay.appendChild(tagElement);
                    }
                });
            } else {
                voiceTagsDisplay.innerHTML = '<span>No voice tags available</span>'; // Provide fallback text
            }
        }

        // ** Populate Modal Details Conditionally (Hide if N/A or missing) **

        // Helper function to populate a simple text detail and hide its container if value is invalid
        function populateDetail(containerElement, textElement, value) {
            if (!containerElement || !textElement) return; // Safety check
            const textValue = Array.isArray(value) ? value.join(', ') : value; // Join arrays if needed
            // Check if value exists and is not considered N/A
            if (textValue && textValue !== 'N/A' && textValue !== 'unknown') {
                textElement.textContent = textValue;
                containerElement.style.display = 'block'; // Show the container paragraph
            } else {
                containerElement.style.display = 'none'; // Hide the container paragraph
            }
        }

        // Helper function to populate list details (Methods, Outcomes, Quotes)
        function populateListDetail(containerElement, title, values, renderFn) {
             if (!containerElement) return; // Safety check
            containerElement.innerHTML = ''; // Clear previous content
            const list = document.createElement('ul');
            let itemsFound = false; // Flag to track if any valid items were added
            if (Array.isArray(values) && values.length > 0) {
                values.forEach(item => {
                    const li = renderFn(item); // Use provided function to create li
                    if (li) { // Check if renderFn returned a valid list item
                        list.appendChild(li);
                        itemsFound = true; // Mark that we found at least one item
                    }
                });
            }
            // Only show the section if valid items were found
            if (itemsFound) {
                containerElement.innerHTML = `<h4>${title}</h4>`; // Add title
                containerElement.appendChild(list);
                containerElement.style.display = 'block'; // Show section
            } else {
                containerElement.style.display = 'none'; // Hide section if no valid items
            }
        }

        // Populate specific modal fields using helpers
        populateDetail(modalConditionsContainer, modalConditions, testimonial.conditions);
        populateDetail(modalThemeContainer, modalTheme, testimonial.theme); // Populate Theme here
        populateDetail(modalMomentContainer, modalMoment, testimonial.most_inspiring_moment);

        populateListDetail(modalMethods, 'Methods Used', testimonial.methods, (method) => {
            let methodText = null;
            // Handle method being object or string
            if (typeof method === 'object' && method !== null && method.name) {
                methodText = `${method.name}${method.efficacy_score ? ` (Efficacy: ${method.efficacy_score}/10)` : ''}`;
            } else if (typeof method === 'string' && method.trim()) {
                 methodText = method;
            }
            // Create list item only if text is valid
            if (methodText) {
                const li = document.createElement('li');
                li.textContent = methodText;
                return li;
            }
            return null; // Return null for invalid items
        });

        populateListDetail(modalOutcomes, 'Outcomes', testimonial.method_outcomes ? Object.entries(testimonial.method_outcomes) : [], (outcomeEntry) => {
             const [key, value] = outcomeEntry; // Key is 'physical' or 'emotional'
             if (value) { // Only show if outcome value exists
                 const li = document.createElement('li');
                 const label = key.charAt(0).toUpperCase() + key.slice(1); // Capitalize label
                 li.innerHTML = `<strong>${label}:</strong> ${value}`;
                 return li;
             }
             return null; // Return null if value is missing
        });

        populateListDetail(modalQuotes, 'Hope Driven Quotes', testimonial.hope_driven_quotes, (quote) => {
            if (quote && quote.trim()) { // Ensure quote is not empty
                const li = document.createElement('li');
                li.textContent = `"${quote.trim()}"`;
                return li;
            }
            return null; // Return null for empty quotes
        });

        // Display the modal
        modal.style.display = 'flex'; // Use flex to enable centering defined in CSS
    }

    // Closes the modal and stops video playback
    function closeModal() {
        if (!modal || !videoIframe) return; // Safety check
        modal.style.display = 'none'; // Hide modal
        videoIframe.src = ''; // Stop video playback by clearing src
    }

    // --- Healing Insights Logic ---

    // Displays a fact at the given index, hiding N/A values
    function displayFact(index) {
        // Ensure container and data exist
        if (!healingFactContainer || !factsData.healing_insights || factsData.healing_insights.length === 0) {
           if (healingFactContainer && !healingFactContainer.querySelector('.error-message')) {
                 healingFactContainer.innerHTML = '<p>No insights available.</p>';
            }
           return; // Exit if no facts or container
        }
        // Ensure index is valid after random pick or increment
        const safeIndex = Math.max(0, Math.min(index, factsData.healing_insights.length - 1));
        const fact = factsData.healing_insights[safeIndex];
        if (!fact) { // Extra safety check
             console.error("Invalid fact index:", index, "Mapped to:", safeIndex);
             return;
        }
        currentFactIndex = safeIndex; // Store the currently displayed index

        // Construct HTML safely, checking if values exist and are meaningful before including
        let factHTML = `<h3>${fact.title || 'Insight'}</h3>`;
        // Only add paragraphs if the content exists and is not 'N/A' or 'unknown'
        if (fact.stat && fact.stat !== 'N/A' && fact.stat !== 'unknown') factHTML += `<p class="fact-stat">${fact.stat}</p>`;
        if (fact.quote && fact.quote !== 'N/A' && fact.quote !== 'unknown') factHTML += `<p class="fact-quote">"${fact.quote}"</p>`;
        if (fact.action && fact.action !== 'N/A' && fact.action !== 'unknown') factHTML += `<p class="fact-action">${fact.action}</p>`;
        healingFactContainer.innerHTML = factHTML;

        // Visual feedback on change
        healingFactContainer.style.backgroundColor = '#dcedc8'; // Temporary highlight color
        setTimeout(() => {
            // Check if container still exists before changing style back
            // Use the dark theme background color for consistency
            if (healingFactContainer) healingFactContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        }, 300); // Duration of highlight
    }

    // Function to display the initial random fact on load
     function displayRandomFact() {
        if (!factsData.healing_insights || factsData.healing_insights.length === 0) return;
        const randomIndex = Math.floor(Math.random() * factsData.healing_insights.length);
        displayFact(randomIndex); // Display the randomly selected fact
    }

    // Function to display the next random fact, ensuring it's different from the current one
    function displayNextRandomFact() {
         if (!factsData.healing_insights || factsData.healing_insights.length === 0) return; // No facts
         if (factsData.healing_insights.length === 1) { // Only one fact, just display it
             displayFact(0);
             return;
         }

         let nextIndex;
         // Keep generating random indices until a different one is found
         do {
             nextIndex = Math.floor(Math.random() * factsData.healing_insights.length);
         } while (nextIndex === currentFactIndex); // Ensure it's not the same as the current one

         displayFact(nextIndex); // Display the new random fact
    }


    // --- Cookie Consent Banner Logic ---
    const consentGiven = localStorage.getItem('cookieConsentGiven');
    if (!consentGiven && consentBanner) {
        consentBanner.style.display = 'block'; // Show banner if no consent stored
        if (acceptButton) {
            acceptButton.addEventListener('click', () => {
                localStorage.setItem('cookieConsentGiven', 'true'); // Store consent
                consentBanner.classList.add('cookie-consent-hidden'); // Hide banner
            });
        }
    } else if (consentBanner) {
        consentBanner.classList.add('cookie-consent-hidden'); // Keep hidden if already consented
    }
    // Note: GA script still loads initially in this simple setup. See previous notes.


    // --- Event Listeners ---

    // Listener for "Show Another Insight" button (uses random function)
    if (nextInsightBtn) {
        nextInsightBtn.addEventListener('click', displayNextRandomFact);
    }

    // Listener for Modal Close Button
    if (modalCloseBtn) {
         modalCloseBtn.addEventListener('click', closeModal);
    }

    // Listener for Modal Background Click (closes modal)
    if (modal) {
        modal.addEventListener('click', (event) => {
            // Close only if the click is directly on the modal background (event.target)
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // Listener for Escape Key to Close Modal
    document.addEventListener('keydown', (event) => {
        // Check if modal exists and is currently displayed ('flex')
        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // --- Initialization ---
    fetchData(); // Start the process by fetching data

}); // End DOMContentLoaded

