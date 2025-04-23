document.addEventListener('DOMContentLoaded', () => {
    console.log('[ui-interactions.js] DOMContentLoaded fired. Initializing UI interactions...');

    // --- Ripple Effect ---
    try {
        const rippleButtons = document.querySelectorAll(
            '#clearHistoryButton, #newChatButton, #recordButton, #sendButton, #toggleHistoryButton, #historyBubbleButton, #logoutButton, #newChatButtonSidebar, #closeHistorySidebar'
        );
        console.log(`[ui-interactions.js] Found ${rippleButtons.length} buttons for ripple effect.`);

        rippleButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                // Prevent ripple on delete icon click inside history item
                if (e.target.closest('.delete-session-btn')) {
                    return;
                }

                const rect = button.getBoundingClientRect(); // Use button's rect
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const ripple = document.createElement('span');
                ripple.classList.add('ripple-effect');
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;

                // Append ripple and remove after animation
                button.appendChild(ripple); // Append to the button itself
                setTimeout(() => {
                    ripple.remove();
                }, 600); // Match animation duration in chat-styles.css
            });
        });
        console.log('[ui-interactions.js] Ripple effect listeners added successfully.');
    } catch (error) {
        console.error('[ui-interactions.js] Error setting up ripple effect:', error);
    }

    // --- Mobile History Sidebar ---
    try {
        const historyBubbleButton = document.getElementById('historyBubbleButton');
        const closeHistorySidebar = document.getElementById('closeHistorySidebar');
        const chatHistorySidebar = document.getElementById('chatHistorySidebar');
        const mobileHistoryOverlay = document.getElementById('mobileHistoryOverlay');
        const toggleHistoryHeaderButton = document.getElementById('toggleHistoryButton'); // May be hidden/absent

        // Only proceed if essential elements are found
        if (historyBubbleButton && closeHistorySidebar && chatHistorySidebar && mobileHistoryOverlay) {
            console.log('[ui-interactions.js] Mobile history sidebar elements found. Setting up listeners...');

            const toggleBodyScroll = (isOpen) => {
                document.body.classList.toggle('sidebar-open', isOpen);
                console.log(`[ui-interactions.js] Body scroll class 'sidebar-open' ${isOpen ? 'added' : 'removed'}.`);
            };

            const openHistorySidebar = () => {
                if (window.innerWidth < 768) {
                    console.log('[ui-interactions.js] Opening mobile history sidebar...');
                    chatHistorySidebar.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        chatHistorySidebar.classList.remove('translate-x-full');
                        mobileHistoryOverlay.classList.remove('hidden');
                        requestAnimationFrame(() => {
                           mobileHistoryOverlay.classList.remove('opacity-0');
                        });
                    });
                    toggleBodyScroll(true);
                }
            };

            const closeHistorySidebarHandler = () => {
                console.log('[ui-interactions.js] Closing mobile history sidebar...');
                mobileHistoryOverlay.classList.add('opacity-0');
                chatHistorySidebar.classList.add('translate-x-full');
                setTimeout(() => {
                    mobileHistoryOverlay.classList.add('hidden');
                    if (window.innerWidth < 768) {
                        chatHistorySidebar.classList.add('hidden');
                    }
                }, 300); // Match transition duration
                toggleBodyScroll(false);
            };

            historyBubbleButton.addEventListener('click', openHistorySidebar);
            // Add listener for header button ONLY if it exists
            if (toggleHistoryHeaderButton) {
                toggleHistoryHeaderButton.addEventListener('click', openHistorySidebar);
            } else {
                console.log('[ui-interactions.js] Header toggle button (#toggleHistoryButton) not found, listener not added.');
            }
            closeHistorySidebar.addEventListener('click', closeHistorySidebarHandler);
            mobileHistoryOverlay.addEventListener('click', closeHistorySidebarHandler);

            window.addEventListener('resize', () => {
                if (window.innerWidth >= 768) {
                    // Desktop view: Ensure sidebar is visible and overlay is hidden
                    chatHistorySidebar.classList.remove('hidden', 'translate-x-full');
                    mobileHistoryOverlay.classList.add('hidden', 'opacity-0');
                    document.body.classList.remove('sidebar-open');
                } else {
                    // Mobile view: If overlay is hidden (meaning sidebar wasn't explicitly opened), ensure sidebar is translated out
                    if (mobileHistoryOverlay.classList.contains('hidden')) {
                        chatHistorySidebar.classList.add('translate-x-full');
                    }
                }
            });
            console.log('[ui-interactions.js] Mobile history sidebar listeners and resize handler added.');
        } else {
            console.warn('[ui-interactions.js] One or more essential mobile history sidebar elements not found. Skipping sidebar setup.');
        }
    } catch (error) {
        console.error('[ui-interactions.js] Error setting up mobile history sidebar:', error);
    }

    console.log('[ui-interactions.js] UI interactions setup finished.');
}); 