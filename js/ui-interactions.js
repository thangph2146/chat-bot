document.addEventListener('DOMContentLoaded', () => {

    // --- Ripple Effect ---
    try {
        const rippleButtons = document.querySelectorAll(
            '#clearHistoryButton, #newChatButton, #recordButton, #sendButton, #toggleHistoryButton, #historyBubbleButton, #logoutButton, #newChatButtonSidebar, #closeHistorySidebar'
        );

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

            const toggleBodyScroll = (isOpen) => {
                document.body.classList.toggle('sidebar-open', isOpen);
            };

            const openHistorySidebar = () => {
                if (window.innerWidth < 768) {
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
        } else {
            console.warn('[ui-interactions.js] One or more essential mobile history sidebar elements not found. Skipping sidebar setup.');
        }
    } catch (error) {
        console.error('[ui-interactions.js] Error setting up mobile history sidebar:', error);
    }

});