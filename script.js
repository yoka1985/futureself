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


        // ** UPDATED FILE PATHS (Removed 'data/') **
        const testimonialsPromise = fetch('final_db_clustered_tagged_cleaned.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching testimonials:', error);
                if (testimonialGrid) testimonialGrid.innerHTML = '<p class="error-message">Could not load testimonials. Check file path and JSON format.</p>';
                return []; // Return empty array on error
            });

        const factsPromise = fetch('facts.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching facts:', error);
                if (healingFactContainer) healingFactContainer.innerHTML = '<p class="error-message">Could not load insights. Check file path and JSON format.</p>';
                return { healing_insights: [] }; // Return object with empty array on error
            });

        Promise.all([testimonialsPromise, factsPromise])
            .then(([testimonials, facts]) => {
                testimonialsData = testimonials;
                factsData = facts;

                // Initialize UI only after data is loaded and elements exist
                if (testimonialsData.length > 0) {
                    populateFilters(); // Populate filters based on thresholds
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
    function getUniqueFilterValues(data, key, subKey = null) {
        // If subKey is provided (e.g., 'name' for methods), extract that property
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

    // Helper to count occurrences of filter values
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


    function populateFilters() {
        // Get all unique values first
        const allUniqueConditions = getUniqueFilterValues(testimonialsData, 'conditions');
        const allUniqueMethods = getUniqueFilterValues(testimonialsData, 'methods', 'name'); // Extract 'name' from method objects
        const allUniqueThemes = getUniqueFilterValues(testimonialsData, 'theme');

        // Count occurrences in the original data
        const conditionCounts = countOccurrences(testimonialsData, 'conditions');
        const methodCounts = countOccurrences(testimonialsData, 'methods', 'name');
        // No threshold for themes currently

        // ** APPLY THRESHOLDS **
        const filteredConditions = allUniqueConditions.filter(condition => conditionCounts[condition] >= 3);
        const filteredMethods = allUniqueMethods.filter(method => methodCounts[method] >= 5);
        // Themes remain unfiltered by count
        const filteredThemes = allUniqueThemes;


        // Clear placeholders
        conditionFiltersContainer.innerHTML = '';
        methodFiltersContainer.innerHTML = '';
        themeFiltersContainer.innerHTML = '';

        // Create buttons only for values meeting the threshold
        createFilterButtons(filteredConditions, conditionFiltersContainer, 'condition');
        createFilterButtons(filteredMethods, methodFiltersContainer, 'method');
        createFilterButtons(filteredThemes, themeFiltersContainer, 'theme'); // Themes use all unique values
    }

    function createFilterButtons(values, container, filterType) {
         if (values.length === 0) {
            // Provide a clearer message if no filters meet the criteria
            container.innerHTML = `<span class="placeholder">No common ${filterType}s found meeting criteria.</span>`;
            return;
        }
        // Sort values alphabetically for consistent order
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

        const filterGroupContainer = button.parentElement;
        const currentlyActive = filterGroupContainer.querySelector('button.active');

        // Logic for single selection per filter group
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
        filterAndRenderGrid(); // Update grid based on new filter state
    }

    clearFiltersBtn.addEventListener('click', () => {
        // Reset active filters object
        activeFilters = { condition: null, method: null, theme: null };
        // Remove active class from all filter buttons visually
        document.querySelectorAll('#filter-controls button.active').forEach(btn => btn.classList.remove('active'));
        // Re-render the full grid
        renderTestimonialGrid(testimonialsData);
    });

    function filterAndRenderGrid() {
        const filteredData = testimonialsData.filter(item => {
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
        renderTestimonialGrid(filteredData); // Render the filtered data
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
             // Using URL as a unique identifier, fallback if needed
             const originalIndex = testimonialsData.findIndex(originalItem => originalItem.url === item.url);
             if (originalIndex === -1) {
                 console.warn("Could not find original index for item based on URL:", item.title);
                 // As a fallback, try matching title if URL fails (less reliable)
                 // const originalIndex = testimonialsData.findIndex(originalItem => originalItem.title === item.title);
                 // if (originalIndex === -1) return; // Skip if still not found
             }

            const card = document.createElement('div');
            card.className = 'testimonial-card';
            // Store the ORIGINAL index in the data attribute
            card.dataset.index = originalIndex;

            // Handle potential missing data with fallbacks
            const imageUrl = item.thumbnail_url || 'https://placehold.co/300x180/eee/ccc?text=No+Image';
            const title = item.title || 'Untitled Testimonial';
            const conditions = Array.isArray(item.conditions) ? item.conditions.join(', ') : 'N/A';
            const theme = Array.isArray(item.theme) ? item.theme.join(', ') : 'N/A'; // Get theme text

             // ** UPDATED Card HTML: Only show Theme if it's not 'N/A' **
             // Consider adding Emojis here later based on condition/theme if desired
            card.innerHTML = `
                <img src="${imageUrl}" alt="${title}" loading="lazy">
                <h4>${title}</h4>
                <p><strong>Condition:</strong> ${conditions}</p>
                ${theme !== 'N/A' ? `<p><strong>Theme:</strong> ${theme}</p>` : ''}
            `;

            // Add click listener to the entire card
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
            return; // Exit if data is missing
        }

        // Populate Modal Title
        modalTitle.textContent = testimonial.title || 'Testimonial Details';

        // Populate Video (using updated embed logic)
        if (testimonial.url) {
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
                // If parsing fails, maybe try using the original URL directly,
                // or leave it blank if it's known not to be embeddable.
                // For now, we keep the original URL as fallback.
            }
            videoIframe.src = embedUrl;
        } else {
            videoIframe.src = ''; // Clear src if no URL provided
        }


        // Populate Voice Tags
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

        // Populate Additional Context Fields
        modalConditions.textContent = Array.isArray(testimonial.conditions) ? testimonial.conditions.join(', ') : 'N/A';
        modalMoment.textContent = testimonial.most_inspiring_moment || 'N/A';

        // Populate Methods (handles array of objects or strings)
        modalMethods.innerHTML = '<h4>Methods Used:</h4>'; // Add title
        const methodsList = document.createElement('ul');
        if (Array.isArray(testimonial.methods) && testimonial.methods.length > 0) {
            testimonial.methods.forEach(method => {
                const li = document.createElement('li');
                // Check if method is an object with a name property
                 if (typeof method === 'object' && method !== null && method.name) {
                     li.textContent = `${method.name}${method.efficacy_score ? ` (Efficacy: ${method.efficacy_score}/10)` : ''}`;
                 } else if (typeof method === 'string' && method.trim()) { // Handle if it's just a non-empty string
                      li.textContent = method;
                 }
                 // Skip if method is null, empty, or unexpected format
                 else {
                     return; // Don't append an empty/invalid list item
                 }
                methodsList.appendChild(li);
            });
             // If after iterating, no valid methods were added, show N/A
            if (methodsList.children.length === 0) {
                 methodsList.innerHTML = '<li>N/A</li>';
            }
        } else {
            methodsList.innerHTML = '<li>N/A</li>'; // Show N/A if methods array is empty/missing
        }
        modalMethods.appendChild(methodsList);


        // Populate Outcomes (checks for physical/emotional properties)
        modalOutcomes.innerHTML = '<h4>Outcomes:</h4>'; // Reset and add title
         const outcomesList = document.createElement('ul');
         let outcomesFound = false;
         if (testimonial.method_outcomes) { // Check if outcomes object exists
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
         // If outcomes object existed but had no relevant properties, or didn't exist
         if (!outcomesFound) {
              outcomesList.innerHTML = '<li>N/A</li>';
         }
         modalOutcomes.appendChild(outcomesList);


        // Populate Hope Quotes
        modalQuotes.innerHTML = '<h4>Hope Driven Quotes:</h4>'; // Reset and add title
        const quotesList = document.createElement('ul');
        if (Array.isArray(testimonial.hope_driven_quotes) && testimonial.hope_driven_quotes.length > 0) {
            testimonial.hope_driven_quotes.forEach(quote => {
                 if (quote && quote.trim()) { // Ensure quote is not null/empty
                    const li = document.createElement('li');
                    li.textContent = `"${quote.trim()}"`;
                    quotesList.appendChild(li);
                 }
            });
             // If after iterating, no valid quotes were added, show N/A
            if (quotesList.children.length === 0) {
                 quotesList.innerHTML = '<li>N/A</li>';
            }
        } else {
            quotesList.innerHTML = '<li>N/A</li>'; // Show N/A if quotes array is empty/missing
        }
        modalQuotes.appendChild(quotesList);

        // Display Modal
        modal.style.display = 'flex'; // Use flex to enable centering defined in CSS
    }

    function closeModal() {
        if (!modal || !videoIframe) return; // Safety check
        modal.style.display = 'none'; // Hide modal
        videoIframe.src = ''; // Stop video playback by clearing src
    }

    // --- Healing Insights Logic ---
    function displayFact(index) {
        // Ensure container and data exist
        if (!healingFactContainer || !factsData.healing_insights || factsData.healing_insights.length === 0) {
           // Display message only if container exists and no error message is already there
           if (healingFactContainer && !healingFactContainer.querySelector('.error-message')) {
                 healingFactContainer.innerHTML = '<p>No insights available.</p>';
            }
           return; // Exit if no facts or container
        }

        // Calculate safe index with modulo
        const safeIndex = index % factsData.healing_insights.length;
        const fact = factsData.healing_insights[safeIndex];

        // Construct HTML safely, providing fallbacks for missing properties
        healingFactContainer.innerHTML = `
            <h3>${fact.title || 'Insight'}</h3>
            ${fact.stat ? `<p class="fact-stat">${fact.stat}</p>` : ''}
            ${fact.quote ? `<p class="fact-quote">"${fact.quote}"</p>` : ''}
            ${fact.action ? `<p class="fact-action">${fact.action}</p>` : ''}
        `;
        // Optional: Visual feedback on change
        healingFactContainer.style.backgroundColor = '#dcedc8'; // Temporary highlight
        setTimeout(() => {
            // Check if container still exists before changing style back
            if (healingFactContainer) healingFactContainer.style.backgroundColor = '#fff';
        }, 300); // Duration of highlight
    }

    // --- Event Listeners ---

    // Listener for "Show Another Insight" button
    if (nextInsightBtn) {
        nextInsightBtn.addEventListener('click', () => {
             // Only proceed if facts data is available
             if (!factsData.healing_insights || factsData.healing_insights.length === 0) return;
             // Increment index safely
             currentFactIndex = (currentFactIndex + 1) % factsData.healing_insights.length;
             // Display the new fact
             displayFact(currentFactIndex);
        });
    }

    // Listener for Modal Close Button
    if (modalCloseBtn) {
         modalCloseBtn.addEventListener('click', closeModal);
    }

    // Listener for Modal Background Click
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

