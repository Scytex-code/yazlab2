import { getToken, handleLogout, renderLoginPage, renderRegisterPage } from './auth.js';
import { renderFeedPage } from './feed.js';
import { renderSearchPage, renderContentDetailPage, renderDiscoverPage } from './content.js'; 
import { renderProfilePage, renderProfileUpdatePage } from './profile.js'; 
import { renderLibraryPage, renderListDetailPage } from './library.js';

const mainContent = document.getElementById('main-content');
const authNav = document.getElementById('auth-nav-links'); 
const publicNav = document.getElementById('public-nav-links'); 
const searchBar = document.getElementById('search-bar');

const hideAllNavs = () => {
    if (authNav) authNav.style.display = 'none';
    if (publicNav) publicNav.style.display = 'none';
    if (searchBar) searchBar.style.display = 'none';
};

const getCurrentUserId = () => {
    return localStorage.getItem('user_id') || null; 
};

/**
 */
const updateNavigation = (isAuthenticated) => {
    hideAllNavs(); 

    if (isAuthenticated) {
        if (authNav) authNav.style.display = 'flex'; 
        if (searchBar) searchBar.style.display = 'flex'; 
    } else {
        if (publicNav) publicNav.style.display = 'flex'; 
    }
};

/**
 */
const setActiveNav = (route) => {
    document.querySelectorAll('#nav a').forEach(a => {
        a.classList.remove('active-nav');
    });

    let selector = `#nav a[href="#${route}"]`;
    
    if (route.startsWith('profile/')) {
         selector = `#nav a[href="#profile/me"]`;
    } else if (route.startsWith('list/') || route.startsWith('content/')) {
         selector = `#nav a[href="#library"]`;
    } else if (route === '' || route === 'feed') {
         selector = `#nav a[href="#feed"]`;
    }

    const activeLink = document.querySelector(selector);
    if (activeLink) {
        activeLink.classList.add('active-nav');
    }
};


const handleRoute = () => {
    const fullHash = window.location.hash.substring(1); 
    const route = fullHash.includes('?') ? fullHash.split('?')[0] : fullHash;
    const currentUserId = getCurrentUserId();
    const token = getToken();

    updateNavigation(!!token); 

    if (!token && route !== 'login' && route !== 'register' && route !== 'reset-password') {
        window.location.hash = '#login';
        return;
    }

    if (route === 'login') {
        renderLoginPage();
    } else if (route === 'register') {
        renderRegisterPage();
    } else if (route === 'logout') {
        handleLogout();
    } else if (route === 'feed' || route === '') {
        renderFeedPage();
    } else if (route === 'library') {
        renderLibraryPage();
    } 
    else if (route === 'discover') {
        const hashIndex = fullHash.indexOf('?');
        const params = new URLSearchParams(hashIndex !== -1 ? fullHash.substring(hashIndex) : '');
        const filters = Object.fromEntries(params.entries());
        
        const mode = filters.genre || filters.year || filters.min_score ? 'filter' : 'discover';
        
        renderDiscoverPage(mode, filters);
    }
    
    else if (route === 'profile/me/update') {
        if (!currentUserId) {
            window.location.hash = '#login';
            return;
        }
        renderProfileUpdatePage(currentUserId);
    } 
    
    else if (route.startsWith('profile/')) {
        const pathSegments = route.split('/');
        let targetUserId = pathSegments[1];

        if (targetUserId === 'me') {
            targetUserId = currentUserId;
        }

        if (!targetUserId || targetUserId === 'null' || targetUserId === 'me') {
            window.location.hash = '#login';
            return; 
        }
        
        renderProfilePage(targetUserId);

    } else if (route === 'search') {
        const hashIndex = fullHash.indexOf('?');
        const query = hashIndex !== -1 
            ? new URLSearchParams(fullHash.substring(hashIndex)).get('q')
            : null;
        renderSearchPage(query);
    } else if (route.startsWith('content/')) {
        const parts = route.split('/');
        const contentType = parts[1];
        const contentId = parts[2]; 
        renderContentDetailPage(contentType, contentId);
    } else if (route.startsWith('list/')) {
        const listId = route.split('/')[1];
        renderListDetailPage(listId);
    } else {
        window.location.hash = '#feed'; 
    }
    
    setActiveNav(route); 
};

window.addEventListener('hashchange', handleRoute); 
document.addEventListener('DOMContentLoaded', () => {
    hideAllNavs();
    handleRoute();
});