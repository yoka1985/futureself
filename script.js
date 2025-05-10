document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const testimonialGrid = document.getElementById('testimonial-grid');
    const showMoreBtn = document.getElementById('show-more-btn');
    const healingFactContainer = document.getElementById('healing-fact');
    const nextInsightBtn = document.getElementById('next-insight-btn');
    const modal = document.getElementById('video-modal');
    const modalCloseBtn = modal?.querySelector('.close-button');
    const videoIframe = document.getElementById('video-iframe');
    const voiceTagsDisplay = document.getElementById('voice-tags-display');
    const modalTitle = document.getElementById('modal-title');
    // Modal detail fields
    const modalFields = {
        conditions: { container: document.getElementById('modal-conditions-container'), el: document.getElementById('modal-conditions') },
        theme: { container: document.getElementById('modal-theme-container'), el: document.getElementById('modal-theme') },
        journeyStage: { container: document.getElementById('modal-journeyStage-container'), el: document.getElementById('modal-journeyStage') },
        transformationType: { container: document.getElementById('modal-transformationType-container'), el: document.getElementById('modal-transformationType') },
        timeframe: { container: document.getElementById('modal-timeframe-container'), el: document.getElementById('modal-timeframe') },
        emotionalTags: { container: document.getElementById('modal-emotionalTags-container'), el: document.getElementById('modal-emotionalTags') },
        methods: document.getElementById('modal-methods'),
        outcomes: document.getElementById('modal-outcomes'),
        moment: { container: document.getElementById('modal-moment-container'), el: document.getElementById('modal-moment') },
        quotes: document.getElementById('modal-quotes')
    };

    // Filter Controls
    const filterControls = document.getElementById('filter-controls');
    const searchBar = document.getElementById('search-bar');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const activeFiltersDisplay = document.getElementById('active-filters-display');

    const filterContainers = {
        condition: document.getElementById('condition-filters'),
        method: document.getElementById('method-filters'),
        theme: document.getElementById('theme-filters'),
        journeyStage: document.getElementById('journeyStage-filters'),
        transformationType: document.getElementById('transformationType-filters'),
        timeframe: document.getElementById('timeframe-filters'),
        emotion: document.getElementById('emotion-filters'),
    };

    // Saved Filters (Conceptual)
    const saveFiltersBtn = document.getElementById('save-filters-btn');
    const loadSavedFilterDropdown = document.getElementById('load-saved-filter-dropdown');
    const manageSavedFiltersBtn = document.getElementById('manage-saved-filters-btn');
    const manageSavedFiltersModal = document.getElementById('manage-saved-filters-modal');
    const closeManageSavedFiltersBtn = document.getElementById('close-manage-saved-filters-btn');
    const savedFiltersList = document.getElementById('saved-filters-list');


    // Recommendations (Conceptual)
    const recommendationsGrid = document.getElementById('recommendations-grid');
    const customizeRecommendationsBtn = document.getElementById('customize-recommendations-btn');
    const personalizationModal = document.getElementById('personalization-modal');
    const savePersonalizationBtn = document.getElementById('save-personalization-btn');
    const cancelPersonalizationBtn = document.getElementById('cancel-personalization-btn');
    const interestsSelectionContainer = document.getElementById('interests-selection');
    const recommendationConsentBanner = document.getElementById('recommendation-consent-banner');
    const giveRecommendationConsentBtn = document.getElementById('give-recommendation-consent-btn');
    const dismissRecommendationConsentBtn = document.getElementById('dismiss-recommendation-consent-btn');


    // Cookie Banner
    const consentBanner = document.getElementById('cookieConsentBanner');
    const acceptButton = document.getElementById('cookieConsentAccept');

    // Mobile Menu
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Footer Year
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    
    // --- Essential Element Check ---
    if (!testimonialGrid || !filterControls || !searchBar || !recommendationsGrid) {
        console.error('Essential UI elements for core functionality are missing. Halting script.');
        if (testimonialGrid) testimonialGrid.innerHTML = '<p class="placeholder-text col-span-full text-center py-10 text-red-400">Error: Page structure is broken. Please try refreshing.</p>';
        return;
    }


    // --- State Variables ---
    let testimonialsData = [];
    let filteredTestimonials = [];
    let factsData = { healing_insights: [] };
    let currentFactIndex = -1;
    let activeFilters = {
        condition: null, method: null, theme: null,
        journeyStage: null, transformationType: null, timeframe: null, emotion: null
    };
    let currentSearchQuery = '';
    const ITEMS_PER_PAGE = 9;
    let itemsToShow = ITEMS_PER_PAGE;
    const MAX_CONDITIONS_VISIBLE = 10; // Example, adjust as needed

    const GA_TRACKING_ID = 'G-FRDXP452X5'; // Your Google Analytics ID

    // --- Google Analytics Consent & Initialization ---
    function initializeGA() {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
        document.head.appendChild(script);
        
        script.onload = () => {
            gtag('js', new Date());
            gtag('config', GA_TRACKING_ID);
            console.log("Google Analytics initialized.");
        }
    }

    // --- Cookie Consent Logic ---
    const consentGiven = localStorage.getItem('cookieConsentGiven');
    if (consentBanner && acceptButton) {
        if (!consentGiven) {
            consentBanner.style.display = 'block';
            acceptButton.addEventListener('click', () => {
                localStorage.setItem('cookieConsentGiven', 'true');
                consentBanner.classList.add('hidden');
                initializeGA(); // Initialize GA after consent
            });
        } else {
            consentBanner.classList.add('hidden');
            initializeGA(); // Initialize GA if already consented
        }
    } else {
        // Fallback or if elements are missing, consider initializing GA if no consent mechanism is present
        // For this example, GA only loads with explicit consent or prior consent.
    }


    // --- Fetch Data ---
    function fetchData() {
        testimonialGrid.innerHTML = '<p class="placeholder-text col-span-full text-center py-10">Loading testimonials...</p>';
        if (healingFactContainer) healingFactContainer.innerHTML = '<p class="placeholder-text">Loading insights...</p>';
        Object.values(filterContainers).forEach(container => {
            if (container) container.innerHTML = '<span class="text-gray-400 italic text-xs">Loading filters...</span>';
        });
        if (showMoreBtn) showMoreBtn.style.display = 'none';

        const testimonialsPromise = fetch('final_db_clustered_tagged_cleaned.json')
            .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
            .catch(error => {
                console.error('Error fetching testimonials:', error);
                testimonialGrid.innerHTML = '<p class="placeholder-text col-span-full text-center py-10 text-red-400">Could not load testimonials. Please check the data source or try again later.</p>';
                return [];
            });

        const factsPromise = fetch('facts.json')
            .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
            .catch(error => {
                console.error('Error fetching facts:', error);
                if (healingFactContainer) healingFactContainer.innerHTML = '<p class="placeholder-text text-red-400">Could not load insights.</p>';
                return { healing_insights: [] };
            });

        Promise.all([testimonialsPromise, factsPromise])
            .then(([testimonials, facts]) => {
                testimonialsData = testimonials;
                filteredTestimonials = [...testimonialsData];
                factsData = facts;

                if (testimonialsData.length > 0) {
                    populateAllFilters();
                    renderTestimonialGrid();
                    loadPersonalizationPreferences(); // Load and potentially show recommendations
                } else if (!testimonialGrid.querySelector('.text-red-400')) {
                    testimonialGrid.innerHTML = '<p class="placeholder-text col-span-full text-center py-10">No testimonials available at the moment.</p>';
                }

                if (factsData.healing_insights.length > 0 && healingFactContainer) {
                    displayRandomFact();
                } else if (healingFactContainer && !healingFactContainer.querySelector('.text-red-400')) {
                    healingFactContainer.innerHTML = '<p class="placeholder-text">No insights available.</p>';
                }
                updateActiveFiltersDisplay();
            });
    }

    // --- Filter Logic ---
    function getUniqueValues(data, key, subKey = null) {
        const allValues = data.flatMap(item => {
            let value = item[key];
            if (value === undefined || value === null) return [];
            if (subKey && Array.isArray(value)) {
                return value.map(subItem => (typeof subItem === 'object' && subItem !== null) ? subItem[subKey] : null).filter(Boolean);
            }
            return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
        });
        return [...new Set(allValues)].sort();
    }
    
    function countOccurrences(data, key, subKey = null) {
        const counts = {};
        data.forEach(item => {
            let values = item[key];
            if (!values) return;
            if (!Array.isArray(values)) values = [values];
            if (subKey) {
                 values = values.map(subItem => (typeof subItem === 'object' && subItem !== null) ? subItem[subKey] : null).filter(Boolean);
            }
            const uniqueValuesPerItem = new Set(values.filter(Boolean));
            uniqueValuesPerItem.forEach(value => {
                counts[value] = (counts[value] || 0) + 1;
            });
        });
        return counts;
    }


    function populateAllFilters() {
        const filterConfig = {
            condition: { dataKey: 'conditions', threshold: 3, limit: MAX_CONDITIONS_VISIBLE },
            method: { dataKey: 'methods', subKey: 'name', threshold: 5 },
            theme: { dataKey: 'theme' },
            journeyStage: { dataKey: 'journeyStage' },
            transformationType: { dataKey: 'transformationType' },
            timeframe: { dataKey: 'timeframe' },
            emotion: { dataKey: 'emotionalTags' }
        };

        for (const type in filterConfig) {
            const config = filterConfig[type];
            const container = filterContainers[type];
            if (!container) continue;

            container.innerHTML = ''; // Clear placeholder
            
            const allUniqueValues = getUniqueValues(testimonialsData, config.dataKey, config.subKey);
            let valuesToDisplay = allUniqueValues;

            if (config.threshold) {
                const counts = countOccurrences(testimonialsData, config.dataKey, config.subKey);
                valuesToDisplay = allUniqueValues.filter(val => counts[val] >= config.threshold);
            }
            
            createFilterButtons(valuesToDisplay, container, type, config.limit);
        }
    }

    function createFilterButtons(values, container, filterType, limit = null) {
        if (!container) return;
        if (values.length === 0) {
            container.innerHTML = `<span class="text-gray-500 italic text-xs">No common ${filterType.replace(/([A-Z])/g, ' $1').toLowerCase()}s.</span>`;
            const showMoreBtnForType = document.querySelector(`.show-more-filters[data-filter-type="${filterType}"]`);
            if (showMoreBtnForType) showMoreBtnForType.style.display = 'none';
            return;
        }

        values.forEach((value, index) => {
            const button = document.createElement('button');
            button.textContent = value;
            button.dataset.filterType = filterType;
            button.dataset.filterValue = value;
            // Tailwind classes for filter buttons
            button.className = "px-2.5 py-1 text-xs rounded-full border transition-colors duration-150 ease-in-out whitespace-nowrap " +
                               "bg-slate-600 border-slate-500 text-gray-300 hover:bg-slate-500 hover:border-slate-400";
            
            if (limit !== null && index >= limit) {
                button.classList.add('hidden', 'filter-button-hidden'); // Keep hidden class for toggling
            }
            button.addEventListener('click', handleFilterClick);
            container.appendChild(button);
        });

        const showMoreBtnForType = document.querySelector(`.show-more-filters[data-filter-type="${filterType}"]`);
        if (showMoreBtnForType) {
            if (limit !== null && values.length > limit) {
                showMoreBtnForType.style.display = 'inline';
                showMoreBtnForType.textContent = `Show More ${filterType.replace(/([A-Z])/g, ' $1').toLowerCase()}s (${values.length - limit})`;
            } else {
                showMoreBtnForType.style.display = 'none';
            }
        }
    }
    
    document.querySelectorAll('.show-more-filters').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const filterType = event.target.dataset.filterType;
            const container = filterContainers[filterType];
            if (container) {
                container.querySelectorAll('.filter-button-hidden').forEach(hiddenBtn => {
                    hiddenBtn.classList.remove('hidden', 'filter-button-hidden'); // Make them visible
                });
            }
            event.target.style.display = 'none'; // Hide the "Show More" button itself
        });
    });

    function handleFilterClick(event) {
        const button = event.target;
        const filterType = button.dataset.filterType;
        const filterValue = button.dataset.filterValue;
        
        const isActive = button.classList.contains('active');

        // Deactivate any other active button in the same group
        button.parentElement.querySelectorAll('button.active').forEach(activeBtn => {
            if (activeBtn !== button) {
                 activeBtn.classList.remove('active', 'bg-sky-500', 'border-sky-400', 'text-white', 'font-semibold');
                 activeBtn.classList.add('bg-slate-600', 'border-slate-500', 'text-gray-300');
            }
        });

        if (isActive) {
            button.classList.remove('active', 'bg-sky-500', 'border-sky-400', 'text-white', 'font-semibold');
            button.classList.add('bg-slate-600', 'border-slate-500', 'text-gray-300');
            activeFilters[filterType] = null;
        } else {
            button.classList.add('active', 'bg-sky-500', 'border-sky-400', 'text-white', 'font-semibold');
            button.classList.remove('bg-slate-600', 'border-slate-500', 'text-gray-300');
            activeFilters[filterType] = filterValue;
        }
        applyFiltersAndRender();
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            activeFilters = { condition: null, method: null, theme: null, journeyStage: null, transformationType: null, timeframe: null, emotion: null };
            currentSearchQuery = '';
            if(searchBar) searchBar.value = '';
            
            document.querySelectorAll('#filter-controls button.active').forEach(btn => {
                btn.classList.remove('active', 'bg-sky-500', 'border-sky-400', 'text-white', 'font-semibold');
                btn.classList.add('bg-slate-600', 'border-slate-500', 'text-gray-300');
            });

            // Reset visibility of "Show More" buttons and hidden filter items
            Object.keys(filterContainers).forEach(type => {
                const container = filterContainers[type];
                const showMoreBtnForType = document.querySelector(`.show-more-filters[data-filter-type="${type}"]`);
                const config = { // Simplified config for reset
                    condition: { limit: MAX_CONDITIONS_VISIBLE },
                    // Add other types if they have limits
                }[type];

                if (container && config && config.limit) {
                    const buttons = container.querySelectorAll('button');
                    buttons.forEach((btn, index) => {
                        if (index >= config.limit) {
                            btn.classList.add('hidden', 'filter-button-hidden');
                        } else {
                            btn.classList.remove('hidden', 'filter-button-hidden');
                        }
                    });
                    if (showMoreBtnForType && buttons.length > config.limit) {
                        showMoreBtnForType.style.display = 'inline';
                        showMoreBtnForType.textContent = `Show More ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}s (${buttons.length - config.limit})`;
                    } else if (showMoreBtnForType) {
                         showMoreBtnForType.style.display = 'none';
                    }
                } else if (showMoreBtnForType) {
                    // If no limit configured for this type, ensure show more is hidden if not needed
                    // This part might need refinement based on how limits are defined for all filter types
                }
            });
            applyFiltersAndRender();
        });
    }
    
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            applyFiltersAndRender();
        });
    }

    function applyFiltersAndRender() {
        testimonialGrid.classList.add('opacity-50', 'pointer-events-none'); // Visual feedback for loading

        filteredTestimonials = testimonialsData.filter(item => {
            const searchFields = [
                item.title,
                ...(item.conditions || []),
                ...(item.theme || []),
                item.journeyStage,
                item.transformationType,
                item.timeframe,
                ...(item.emotionalTags || []),
                item.storyContent, // Assumed field for deeper search
                ...(item.methods || []).map(m => m.name) // Search in method names
            ];
            const searchableText = searchFields.filter(Boolean).join(' ').toLowerCase();
            const searchMatch = !currentSearchQuery || searchableText.includes(currentSearchQuery);

            if (!searchMatch) return false;

            for (const type in activeFilters) {
                if (activeFilters[type]) {
                    let itemValue = item[type];
                    if (type === 'method' && Array.isArray(item.methods)) { // Special handling for methods array of objects
                        itemValue = item.methods.map(m => m.name);
                    }

                    if (Array.isArray(itemValue)) {
                        if (!itemValue.includes(activeFilters[type])) return false;
                    } else {
                        if (itemValue !== activeFilters[type]) return false;
                    }
                }
            }
            return true;
        });

        itemsToShow = ITEMS_PER_PAGE;
        renderTestimonialGrid();
        updateActiveFiltersDisplay();

        setTimeout(() => {
            testimonialGrid.classList.remove('opacity-50', 'pointer-events-none');
        }, 150);
    }
    
    function updateActiveFiltersDisplay() {
        if (!activeFiltersDisplay) return;
        const active = [];
        if (currentSearchQuery) {
            active.push(`Searching for: "${currentSearchQuery}"`);
        }
        for (const type in activeFilters) {
            if (activeFilters[type]) {
                const typeName = type.replace(/([A-Z])/g, ' $1'); // Add space before caps
                active.push(`${typeName.charAt(0).toUpperCase() + typeName.slice(1)}: ${activeFilters[type]}`);
            }
        }
        if (active.length > 0) {
            activeFiltersDisplay.innerHTML = `<strong>Active Filters:</strong> ${active.join('; ')}`;
        } else {
            activeFiltersDisplay.innerHTML = 'No filters applied. Showing all stories.';
        }
    }


    // --- Grid Rendering & Pagination ---
    function renderTestimonialGrid() {
        testimonialGrid.innerHTML = ''; 

        if (filteredTestimonials.length === 0) {
            testimonialGrid.innerHTML = `<p class="placeholder-text col-span-full text-center py-10">${currentSearchQuery || Object.values(activeFilters).some(f=>f) ? 'No testimonials match your criteria.' : 'No testimonials available.'}</p>`;
            if(showMoreBtn) showMoreBtn.style.display = 'none';
            return;
        }

        const dataSlice = filteredTestimonials.slice(0, itemsToShow);

        dataSlice.forEach(item => {
            const originalIndex = testimonialsData.findIndex(originalItem => originalItem.url === item.url); // Assuming URL is unique
            if (originalIndex === -1) {
                console.warn("Could not find original index for item:", item.title);
                return; 
            }

            const card = document.createElement('div');
            card.className = 'testimonial-card bg-slate-700/60 rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 ease-in-out hover:shadow-sky-500/30 hover:ring-2 hover:ring-sky-600 cursor-pointer';
            card.dataset.index = originalIndex;

            const imageUrl = item.thumbnail_url || `https://placehold.co/400x225/3A3A5E/a0a0c0?text=${encodeURIComponent(item.title || 'Story Image')}`;
            const title = item.title || 'Untitled Testimonial';
            const quote = (Array.isArray(item.hope_driven_quotes) && item.hope_driven_quotes.length > 0) ? item.hope_driven_quotes[0] : null;
            
            let tagsToDisplay = [];
            if (item.emotionalTags && item.emotionalTags.length > 0) tagsToDisplay.push(...item.emotionalTags.slice(0,1));
            if (item.transformationType && tagsToDisplay.length < 2) tagsToDisplay.push(item.transformationType);
            if (item.journeyStage && tagsToDisplay.length < 2) tagsToDisplay.push(item.journeyStage);


            card.innerHTML = `
                <img src="${imageUrl}" alt="Thumbnail for ${title}" class="w-full h-48 object-cover" loading="lazy" onerror="this.src='https://placehold.co/400x225/3A3A5E/a0a0c0?text=Image+Error';">
                <div class="p-5 flex flex-col flex-grow">
                    <h4 class="text-lg font-semibold text-sky-300 mb-2 leading-tight">${title}</h4>
                    ${quote ? `<p class="card-quote-custom-truncate text-sm text-gray-300 italic mb-3">"${quote}"</p>` : '<p class="text-sm text-gray-400 italic mb-3">No quote available.</p>'}
                    <div class="mt-auto pt-2 border-t border-slate-600/50">
                        ${tagsToDisplay.length > 0 ? `<div class="flex flex-wrap gap-1.5 text-xs">
                            ${tagsToDisplay.map(tag => `<span class="bg-slate-600 text-sky-300 px-2 py-0.5 rounded-full">${tag}</span>`).join('')}
                        </div>` : '<div class="text-xs text-gray-500">No tags</div>'}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => handleCardClick(originalIndex));
            testimonialGrid.appendChild(card);
        });

        if (showMoreBtn) {
            showMoreBtn.style.display = filteredTestimonials.length > itemsToShow ? 'inline-block' : 'none';
        }
    }

    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            itemsToShow += ITEMS_PER_PAGE;
            renderTestimonialGrid();
        });
    }

    // --- Modal Logic ---
    function handleCardClick(index) {
        const testimonial = testimonialsData[index];
        if (!testimonial || !modal) return;

        logStoryView(testimonial); // For personalization

        modalTitle.textContent = testimonial.title || 'Testimonial Details';
        
        let embedUrl = testimonial.url; 
        if (testimonial.url) {
            try {
                if (testimonial.url.includes("youtube.com/watch?v=")) {
                    const videoId = new URL(testimonial.url).searchParams.get('v');
                    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                } else if (testimonial.url.includes("youtu.be/")) {
                    const videoId = new URL(testimonial.url).pathname.substring(1);
                    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
            } catch(e) { console.error("Error parsing video URL:", testimonial.url, e); }
        }
        videoIframe.src = embedUrl || "";

        voiceTagsDisplay.innerHTML = '';
        if (Array.isArray(testimonial.voice_tags) && testimonial.voice_tags.length > 0) {
            testimonial.voice_tags.filter(tag => tag && tag.trim()).forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'bg-sky-700 text-sky-200 px-2.5 py-1 text-xs rounded-full';
                tagElement.textContent = tag.trim();
                voiceTagsDisplay.appendChild(tagElement);
            });
        } else {
            voiceTagsDisplay.innerHTML = '<span class="text-xs text-gray-400">No specific voice tags.</span>';
        }

        // Populate details
        function populateDetail(fieldConfig, value) {
            if (!fieldConfig || !fieldConfig.container || !fieldConfig.el) return;
            const textValue = Array.isArray(value) ? value.join(', ') : value;
            if (textValue && textValue.toLowerCase() !== 'n/a' && textValue.toLowerCase() !== 'unknown') {
                fieldConfig.el.textContent = textValue;
                fieldConfig.container.style.display = 'block';
            } else {
                fieldConfig.container.style.display = 'none';
            }
        }
        
        populateDetail(modalFields.conditions, testimonial.conditions);
        populateDetail(modalFields.theme, testimonial.theme);
        populateDetail(modalFields.journeyStage, testimonial.journeyStage);
        populateDetail(modalFields.transformationType, testimonial.transformationType);
        populateDetail(modalFields.timeframe, testimonial.timeframe);
        populateDetail(modalFields.emotionalTags, testimonial.emotionalTags);
        populateDetail(modalFields.moment, testimonial.most_inspiring_moment);

        function populateListDetail(containerElement, title, values, renderFn) {
            if (!containerElement) return;
            containerElement.innerHTML = '';
            const list = document.createElement('ul');
            list.className = "space-y-1";
            let itemsFound = false;
            if (Array.isArray(values) && values.length > 0) {
                values.forEach(item => {
                    const li = renderFn(item);
                    if (li) {
                        list.appendChild(li);
                        itemsFound = true;
                    }
                });
            }
            if (itemsFound) {
                const titleEl = document.createElement('h4');
                titleEl.className = "text-sm font-semibold text-sky-300 mt-2";
                titleEl.textContent = title;
                containerElement.appendChild(titleEl);
                containerElement.appendChild(list);
                containerElement.style.display = 'block';
            } else {
                containerElement.style.display = 'none';
            }
        }

        populateListDetail(modalFields.methods, 'Methods Used', testimonial.methods, (method) => {
            let methodText = null;
            if (typeof method === 'object' && method !== null && method.name) {
                methodText = `${method.name}${method.efficacy_score ? ` (Efficacy: ${method.efficacy_score}/10)` : ''}`;
            } else if (typeof method === 'string' && method.trim()) {
                methodText = method;
            }
            if (methodText) {
                const li = document.createElement('li');
                li.className = "bg-slate-700 p-2 rounded-md text-gray-300 text-xs";
                li.textContent = methodText;
                return li;
            }
            return null;
        });

        populateListDetail(modalFields.outcomes, 'Outcomes', testimonial.method_outcomes ? Object.entries(testimonial.method_outcomes) : [], (outcomeEntry) => {
            const [key, value] = outcomeEntry;
            if (value) {
                const li = document.createElement('li');
                li.className = "bg-slate-700 p-2 rounded-md text-gray-300 text-xs";
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                li.innerHTML = `<strong class="text-sky-400">${label}:</strong> ${value}`;
                return li;
            }
            return null;
        });

        populateListDetail(modalFields.quotes, 'Hope Driven Quotes', testimonial.hope_driven_quotes, (quote) => {
            if (quote && quote.trim()) {
                const li = document.createElement('li');
                li.className = "border-l-4 border-sky-500 pl-3 py-1 italic text-gray-300 text-sm";
                li.textContent = `"${quote.trim()}"`;
                return li;
            }
            return null;
        });

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden'); // Prevent background scroll
    }

    function closeModal() {
        if (!modal || !videoIframe) return;
        modal.classList.add('hidden');
        videoIframe.src = ''; 
        document.body.classList.remove('overflow-hidden');
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

    // --- Healing Insights Logic ---
    function displayFact(index) {
        if (!healingFactContainer || !factsData.healing_insights || factsData.healing_insights.length === 0) {
            if (healingFactContainer && !healingFactContainer.querySelector('.text-red-400')) healingFactContainer.innerHTML = '<p class="placeholder-text">No insights available.</p>';
            return;
        }
        const safeIndex = Math.max(0, Math.min(index, factsData.healing_insights.length - 1));
        const fact = factsData.healing_insights[safeIndex];
        if (!fact) return;
        currentFactIndex = safeIndex;

        let factHTML = `<h3 class="text-lg font-semibold text-sky-300 mb-2">${fact.title || 'Insight'}</h3>`;
        if (fact.stat && fact.stat.toLowerCase() !== 'n/a') factHTML += `<p class="text-gray-300 mb-1"><strong class="text-teal-400">Statistic:</strong> ${fact.stat}</p>`;
        if (fact.quote && fact.quote.toLowerCase() !== 'n/a') factHTML += `<p class="text-gray-300 italic border-l-2 border-teal-500 pl-3 py-1 mb-1">"${fact.quote}"</p>`;
        if (fact.action && fact.action.toLowerCase() !== 'n/a') factHTML += `<p class="text-gray-300"><strong class="text-teal-400">Actionable Tip:</strong> ${fact.action}</p>`;
        healingFactContainer.innerHTML = factHTML;

        healingFactContainer.classList.add('transition-all', 'duration-300', 'transform', 'scale-105', 'bg-slate-600');
        setTimeout(() => {
            if (healingFactContainer) healingFactContainer.classList.remove('scale-105', 'bg-slate-600');
        }, 300);
    }
    function displayRandomFact() {
        if (!factsData.healing_insights || factsData.healing_insights.length === 0) return;
        const randomIndex = Math.floor(Math.random() * factsData.healing_insights.length);
        displayFact(randomIndex);
    }
    function displayNextRandomFact() {
        if (!factsData.healing_insights || factsData.healing_insights.length === 0) return;
        if (factsData.healing_insights.length === 1) { displayFact(0); return; }
        let nextIndex;
        do { nextIndex = Math.floor(Math.random() * factsData.healing_insights.length); }
        while (nextIndex === currentFactIndex);
        displayFact(nextIndex);
    }
    if (nextInsightBtn) nextInsightBtn.addEventListener('click', displayNextRandomFact);

    // --- Mobile Menu Toggle ---
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
            mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
            mobileMenu.classList.toggle('hidden');
            mobileMenuButton.querySelectorAll('svg').forEach(svg => svg.classList.toggle('hidden'));
        });
    }
    
    // --- Personalization Logic (Conceptual Frontend) ---
    const MAX_RECOMMENDATIONS = 3;
    const MAX_VIEWED_ITEMS_TRACKED = 10;

    function logStoryView(story) {
        let viewedStories = JSON.parse(localStorage.getItem('viewedStoriesMeta')) || [];
        // Store relevant metadata like transformationType, emotionalTags, theme
        const storyMeta = {
            id: story.url, // Assuming URL is a unique ID
            transformationType: story.transformationType,
            emotionalTags: story.emotionalTags || [],
            theme: story.theme || [],
            viewedAt: Date.now()
        };
        // Remove oldest if exceeding max
        if (viewedStories.length >= MAX_VIEWED_ITEMS_TRACKED) {
            viewedStories.shift(); 
        }
        viewedStories.push(storyMeta);
        localStorage.setItem('viewedStoriesMeta', JSON.stringify(viewedStories));
    }

    function getUserInterests() {
        return JSON.parse(localStorage.getItem('userInterests')) || [];
    }

    function getRecommendedStories() {
        const userInterests = getUserInterests();
        const viewedStoriesMeta = JSON.parse(localStorage.getItem('viewedStoriesMeta')) || [];
        let potentialRecommendations = [];

        if (testimonialsData.length === 0) return [];

        testimonialsData.forEach(story => {
            let score = 0;
            let reasons = [];

            // Match user interests
            if (userInterests.includes(story.transformationType)) {
                score += 5;
                reasons.push(`Interest: ${story.transformationType}`);
            }
            if (story.emotionalTags && story.emotionalTags.some(tag => userInterests.includes(tag))) {
                score += 3;
                reasons.push(`Interest: Emotion (${story.emotionalTags.find(tag => userInterests.includes(tag))})`);
            }

            // Match recently viewed (more sophisticated matching could be done)
            viewedStoriesMeta.forEach(viewed => {
                if (viewed.transformationType === story.transformationType && story.url !== viewed.id) {
                    score += 2;
                    if (!reasons.includes(`Similar to viewed: ${story.transformationType}`)) reasons.push(`Similar to viewed: ${story.transformationType}`);
                }
                if (story.emotionalTags && viewed.emotionalTags && story.emotionalTags.some(tag => viewed.emotionalTags.includes(tag)) && story.url !== viewed.id) {
                    score += 1;
                     if (!reasons.includes(`Similar emotion`)) reasons.push(`Similar emotion`);
                }
            });
            
            // Avoid recommending already viewed items (from the current session's detailed views)
            if (viewedStoriesMeta.some(v => v.id === story.url)) {
                score = 0; // Or significantly reduce score
            }

            if (score > 0) {
                potentialRecommendations.push({ ...story, recommendationScore: score, recommendationReasons: reasons });
            }
        });

        // Sort by score and take top N, add some randomness if scores are tied
        potentialRecommendations.sort((a, b) => b.recommendationScore - a.recommendationScore || Math.random() - 0.5);
        return potentialRecommendations.slice(0, MAX_RECOMMENDATIONS);
    }

    function renderRecommendations() {
        if (!recommendationsGrid) return;
        const recommended = getRecommendedStories();
        recommendationsGrid.innerHTML = '';

        if (recommended.length === 0) {
            // Show some popular or random stories if no specific recommendations
            const fallbackStories = testimonialsData.sort(() => 0.5 - Math.random()).slice(0, MAX_RECOMMENDATIONS);
            if (fallbackStories.length === 0 && testimonialsData.length > 0) { // Should not happen if testimonialsData has items
                 recommendationsGrid.innerHTML = '<p class="placeholder-text col-span-full text-center py-6">Could not generate recommendations at this time.</p>';
                 return;
            }
            if (fallbackStories.length === 0 && testimonialsData.length === 0) {
                 recommendationsGrid.innerHTML = '<p class="placeholder-text col-span-full text-center py-6">No stories available to recommend.</p>';
                 return;
            }

            fallbackStories.forEach(item => recommendationsGrid.appendChild(createStoryCard(item, false)));
            if (recommendationConsentBanner && !localStorage.getItem('userInterests') && !localStorage.getItem('recommendationConsentDismissed')) {
                recommendationConsentBanner.classList.remove('hidden');
            }
            return;
        }
        
        recommended.forEach(item => recommendationsGrid.appendChild(createStoryCard(item, true)));
    }
    
    function createStoryCard(item, isRecommendation) { // Helper to create card for both grids
        const originalIndex = testimonialsData.findIndex(originalItem => originalItem.url === item.url);
        const card = document.createElement('div');
        card.className = 'testimonial-card bg-slate-700/60 rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 ease-in-out hover:shadow-sky-500/30 hover:ring-2 hover:ring-sky-600 cursor-pointer';
        card.dataset.index = originalIndex;

        const imageUrl = item.thumbnail_url || `https://placehold.co/400x225/3A3A5E/a0a0c0?text=${encodeURIComponent(item.title || 'Story Image')}`;
        const title = item.title || 'Untitled Testimonial';
        const quote = (Array.isArray(item.hope_driven_quotes) && item.hope_driven_quotes.length > 0) ? item.hope_driven_quotes[0] : null;
        
        let tagsToDisplay = [];
        if (item.emotionalTags && item.emotionalTags.length > 0) tagsToDisplay.push(...item.emotionalTags.slice(0,1));
        if (item.transformationType && tagsToDisplay.length < 2) tagsToDisplay.push(item.transformationType);

        let recommendationReasonHTML = '';
        if (isRecommendation && item.recommendationReasons && item.recommendationReasons.length > 0) {
            recommendationReasonHTML = `<p class="text-xs text-sky-400/70 mt-1">Reason: ${item.recommendationReasons[0]}</p>`; // Show first reason
        }

        card.innerHTML = `
            <img src="${imageUrl}" alt="Thumbnail for ${title}" class="w-full h-40 object-cover" loading="lazy" onerror="this.src='https://placehold.co/400x225/3A3A5E/a0a0c0?text=Image+Error';">
            <div class="p-4 flex flex-col flex-grow">
                <h4 class="text-md font-semibold text-sky-300 mb-1 leading-tight">${title}</h4>
                ${quote ? `<p class="card-quote-custom-truncate text-xs text-gray-300 italic mb-2">"${quote}"</p>` : '<p class="text-xs text-gray-400 italic mb-2">No quote available.</p>'}
                ${recommendationReasonHTML}
                <div class="mt-auto pt-1.5 border-t border-slate-600/50">
                    ${tagsToDisplay.length > 0 ? `<div class="flex flex-wrap gap-1 text-[0.65rem]">
                        ${tagsToDisplay.map(tag => `<span class="bg-slate-600 text-sky-300 px-1.5 py-0.5 rounded-full">${tag}</span>`).join('')}
                    </div>` : '<div class="text-[0.65rem] text-gray-500">No tags</div>'}
                </div>
            </div>
        `;
        card.addEventListener('click', () => handleCardClick(originalIndex));
        return card;
    }
    
    function openPersonalizationModal() {
        if (!personalizationModal || !interestsSelectionContainer) return;
        // Populate checkboxes based on available transformation types or a predefined list
        const availableInterests = getUniqueValues(testimonialsData, 'transformationType').concat(['Motivation', 'Resilience']); // Example: add some general ones
        interestsSelectionContainer.innerHTML = '<label class="block text-sm font-medium text-sky-300 mb-1">What are you focusing on?</label>';
        const currentInterests = getUserInterests();
        
        availableInterests.forEach(interest => {
            if (!interest) return;
            const div = document.createElement('div');
            div.className = "flex items-center";
            const inputId = `interest-${interest.toLowerCase().replace(/\s+/g, '-')}`;
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = inputId;
            input.value = interest;
            input.className = "h-4 w-4 text-sky-500 border-slate-500 rounded focus:ring-sky-400 bg-slate-600";
            if (currentInterests.includes(interest)) input.checked = true;
            
            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.className = "ml-2 text-sm text-gray-300";
            label.textContent = interest;
            
            div.appendChild(input);
            div.appendChild(label);
            interestsSelectionContainer.appendChild(div);
        });
        personalizationModal.classList.remove('hidden');
    }

    if (customizeRecommendationsBtn) customizeRecommendationsBtn.addEventListener('click', openPersonalizationModal);
    if (giveRecommendationConsentBtn) giveRecommendationConsentBtn.addEventListener('click', () => {
        openPersonalizationModal();
        if(recommendationConsentBanner) recommendationConsentBanner.classList.add('hidden');
    });
    if (dismissRecommendationConsentBtn) dismissRecommendationConsentBtn.addEventListener('click', () => {
        localStorage.setItem('recommendationConsentDismissed', 'true');
        if(recommendationConsentBanner) recommendationConsentBanner.classList.add('hidden');
    });

    if (savePersonalizationBtn) {
        savePersonalizationBtn.addEventListener('click', () => {
            const selectedInterests = [];
            interestsSelectionContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
                selectedInterests.push(checkbox.value);
            });
            localStorage.setItem('userInterests', JSON.stringify(selectedInterests));
            if(personalizationModal) personalizationModal.classList.add('hidden');
            renderRecommendations(); // Re-render recommendations with new preferences
            if(recommendationConsentBanner) recommendationConsentBanner.classList.add('hidden'); // Hide banner after interaction
        });
    }
    if (cancelPersonalizationBtn && personalizationModal) cancelPersonalizationBtn.addEventListener('click', () => personalizationModal.classList.add('hidden'));

    function loadPersonalizationPreferences() {
        // This function is called after data is fetched.
        // It will trigger recommendation rendering.
        renderRecommendations();
    }
    
    // --- Saved Filters Logic (Conceptual Frontend) ---
    function getSavedFilters() {
        return JSON.parse(localStorage.getItem('savedFilters')) || [];
    }

    function saveCurrentFilters() {
        const filterName = prompt("Enter a name for this filter set:", "My Custom Filter");
        if (!filterName) return;

        const savedFilters = getSavedFilters();
        const newFilterSet = {
            name: filterName,
            filters: JSON.parse(JSON.stringify(activeFilters)), // Deep copy
            searchQuery: currentSearchQuery
        };
        // Check if filter with same name exists, overwrite or ask user
        const existingIndex = savedFilters.findIndex(f => f.name === filterName);
        if (existingIndex > -1) {
            if (!confirm(`A filter named "${filterName}" already exists. Overwrite it?`)) return;
            savedFilters[existingIndex] = newFilterSet;
        } else {
            savedFilters.push(newFilterSet);
        }
        localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
        populateSavedFiltersDropdown();
        alert(`Filter set "${filterName}" saved!`);
    }
    
    function populateSavedFiltersDropdown() {
        if (!loadSavedFilterDropdown) return;
        const savedFilters = getSavedFilters();
        loadSavedFilterDropdown.innerHTML = '<option value="">Load Saved Filter...</option>'; // Reset
        savedFilters.forEach((filterSet, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = filterSet.name;
            loadSavedFilterDropdown.appendChild(option);
        });
    }

    function loadSelectedFilter(selectedIndex) {
        const savedFilters = getSavedFilters();
        if (selectedIndex === "" || !savedFilters[selectedIndex]) return;

        const filterSet = savedFilters[selectedIndex];
        activeFilters = JSON.parse(JSON.stringify(filterSet.filters)); // Deep copy
        currentSearchQuery = filterSet.searchQuery;

        // Update UI: search bar and active state of filter buttons
        if(searchBar) searchBar.value = currentSearchQuery;
        document.querySelectorAll('#filter-controls button').forEach(btn => {
            const type = btn.dataset.filterType;
            const value = btn.dataset.filterValue;
            if (activeFilters[type] === value) {
                btn.classList.add('active', 'bg-sky-500', 'border-sky-400', 'text-white', 'font-semibold');
                btn.classList.remove('bg-slate-600', 'border-slate-500', 'text-gray-300');
            } else {
                btn.classList.remove('active', 'bg-sky-500', 'border-sky-400', 'text-white', 'font-semibold');
                btn.classList.add('bg-slate-600', 'border-slate-500', 'text-gray-300');
            }
        });
        applyFiltersAndRender();
    }

    function openManageSavedFiltersModal() {
        if (!manageSavedFiltersModal || !savedFiltersList) return;
        const savedFilters = getSavedFilters();
        savedFiltersList.innerHTML = '';
        if (savedFilters.length === 0) {
            savedFiltersList.innerHTML = '<p class="text-gray-400 text-sm">No filters saved yet.</p>';
        } else {
            savedFilters.forEach((filterSet, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'flex justify-between items-center p-2 bg-slate-700 rounded';
                itemDiv.innerHTML = `
                    <span class="text-sm text-gray-200">${filterSet.name}</span>
                    <button data-index="${index}" class="delete-saved-filter-btn text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Delete</button>
                `;
                savedFiltersList.appendChild(itemDiv);
            });
            document.querySelectorAll('.delete-saved-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const indexToDelete = parseInt(e.target.dataset.index);
                    deleteSavedFilter(indexToDelete);
                });
            });
        }
        manageSavedFiltersModal.classList.remove('hidden');
    }
    
    function deleteSavedFilter(index) {
        let savedFilters = getSavedFilters();
        if (index >= 0 && index < savedFilters.length) {
            if (confirm(`Are you sure you want to delete the filter "${savedFilters[index].name}"?`)) {
                savedFilters.splice(index, 1);
                localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
                populateSavedFiltersDropdown();
                openManageSavedFiltersModal(); // Refresh the list in the modal
            }
        }
    }

    if (saveFiltersBtn) saveFiltersBtn.addEventListener('click', saveCurrentFilters);
    if (loadSavedFilterDropdown) loadSavedFilterDropdown.addEventListener('change', (e) => loadSelectedFilter(e.target.value));
    if (manageSavedFiltersBtn) manageSavedFiltersBtn.addEventListener('click', openManageSavedFiltersModal);
    if (closeManageSavedFiltersBtn && manageSavedFiltersModal) closeManageSavedFiltersBtn.addEventListener('click', () => manageSavedFiltersModal.classList.add('hidden'));


    // --- Initialization ---
    fetchData();
    populateSavedFiltersDropdown(); // Populate on load

}); // End DOMContentLoaded
