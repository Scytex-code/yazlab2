import { fetchData } from './api.js';

const mainContent = document.getElementById('main-content');
let nextFeedUrl = null;

/**
 * @param {Array<object>} replies 
 * @returns {string} 
 */
const renderReplies = (replies) => {
    if (!replies || replies.length === 0) {
        return ''; 
    }
    
    const replyItems = replies.map(reply => {
        const avatar = reply.user.avatar_url ? 
            `<img src="${reply.user.avatar_url}" alt="${reply.user.username}" class="reply-avatar" />` : 
            '';

        return `
            <div class="reply-item">
                ${avatar}
                <div class="reply-content">
                    <strong><a href="#profile/${reply.user.id}">${reply.user.username}</a>:</strong>
                    <span>${reply.text}</span>
                    <small>(${new Date(reply.created_at).toLocaleTimeString()})</small>
                </div>
            </div>
        `;
    }).join('');
    
    return `<div class="replies-container">${replyItems}</div>`;
};


/**
 */
const openReplyModal = (objectId, objectType) => {
    const modelName = objectType.toLowerCase();
    
    const modalHtml = `
        <div id="reply-modal" class="modal">
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h3>Yanıt Yaz: ${objectType} ID #${objectId}</h3>
                <form id="reply-form" data-object-id="${objectId}" data-object-type="${modelName}">
                    <textarea id="reply-text" placeholder="Yanıtınızı buraya yazın..." required></textarea>
                    <button type="submit">Yanıtı Gönder</button>
                    <p id="reply-status" class="status-message"></p>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('reply-modal');
    
    modal.style.display = 'block';

    modal.querySelector('.close-btn').onclick = () => modal.remove();
    window.onclick = (event) => { if (event.target === modal) modal.remove(); };

    document.getElementById('reply-form')?.addEventListener('submit', handleReplySubmission);
};

/**
 */
const handleReplySubmission = async (e) => {
    e.preventDefault();
    const form = e.target;
    const reviewId = form.dataset.objectId;
    const objectType = form.dataset.objectType;
    const text = form.querySelector('#reply-text').value;
    const statusElement = document.getElementById('reply-status');

    statusElement.textContent = 'Gönderiliyor...';
    
    try {
        await fetchData('replies/', 'POST', {
            text: text,
            object_id: parseInt(reviewId),
            content_type: objectType 
        });
        
        statusElement.textContent = 'Yanıt başarıyla gönderildi!';
        statusElement.style.color = 'green';
        
        setTimeout(() => {
            document.getElementById('reply-modal')?.remove();
            window.location.reload(); 
        }, 1000);

    } catch (error) {
        statusElement.textContent = `Yanıt gönderme başarısız: ${error.message}`;
        statusElement.style.color = 'red';
    }
};

/**
 * @param {object} activity 
 * @returns {string} 
 */
const createActivityCard = (activity) => {
    const user = activity.user.username;
    const userProfileLink = `#profile/${activity.user.id}`;
    const userAvatar = activity.user.avatar_url || 'https://via.placeholder.com/30/AAAAAA/FFFFFF?text=P';
    const details = activity.content_object_details;
    
    const interactionObjectId = activity.object_id; 
    
    let content = null;
    let reviewDetails = null;
    let actionText = ''; 
    let visualHtml = '';
    let footerHtml = '';
    let cardContentLinkHtml = ''; 
    let repliesHtml = ''; 
    let activityClass = ''; 

    if (activity.activity_type === 1) { 
        content = details?.content_data;
        repliesHtml = renderReplies(details?.replies); 
        activityClass = 'activity-type-rating';
    } else if (activity.activity_type === 2) {
        reviewDetails = details?.review_details;
        content = reviewDetails?.content_data || details?.content_data; 
        repliesHtml = renderReplies(reviewDetails?.replies); 
        activityClass = 'activity-type-review';
    } else if (activity.activity_type === 3) {
        content = details?.content_data;
        activityClass = 'activity-type-list_add';
    } else if (activity.activity_type === 4) {
        activityClass = 'activity-type-follow';
    }
    
    
    if (!details || (!interactionObjectId && activity.activity_type !== 4)) {
        return '';
    }

    if (content && content.id) { 
        const coverUrl = content.poster_path || content.cover_url || 'placeholder.png';
        const contentType = details.content_type.toLowerCase();
        const contentDetailLink = `#content/${contentType}/${content.id}`;
        
        cardContentLinkHtml = `<a href="${contentDetailLink}"><strong>${content.title}</strong></a>`;
        
        visualHtml = `
            <div class="activity-visual">
                <a href="${contentDetailLink}">
                    <img src="${coverUrl}" alt="${content.title} Kapak" onerror="this.onerror=null;this.src='placeholder.png';" />
                </a>
        `;
    }

    if (activity.activity_type === 1) {
        const score = details.score;
        actionText = `${cardContentLinkHtml} içeriğine **${score}/10 Puan Verdi**`;
        
        const likesCount = details.likes_count || 0; 
        const isLiked = details.is_liked || false;
        const likeButtonClass = isLiked ? 'btn-liked' : 'btn-default';
        const likeButtonText = isLiked ? 'Beğendin' : 'Beğen';
        
        visualHtml += `
            <div class="score-overlay">
                <span class="score-text">${score}/10</span>
            </div>
            </div> 
        `;
        
        footerHtml = `
            <div class="card-footer">
                <span class="like-count" data-review-id="${interactionObjectId}">${likesCount} Beğeni</span>
                <button class="action-btn like-review-btn ${likeButtonClass}" data-id="${interactionObjectId}" data-is-liked="${isLiked}">
                    ${likeButtonText}
                </button> 
                <button class="action-btn comment-review-btn" data-review-id="${interactionObjectId}">Yorum Yap</button>
            </div>
            ${repliesHtml} 
        `;

    } else if (activity.activity_type === 2) { 
        const fullText = reviewDetails.text || details.review_excerpt;
        const excerpt = fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText;
        
        const likesCount = reviewDetails.likes_count || 0;
        const isLiked = reviewDetails.is_liked || false;
        const likeButtonClass = isLiked ? 'btn-liked' : 'btn-default';
        const likeButtonText = isLiked ? 'Beğendin' : 'Beğen';

        actionText = `${cardContentLinkHtml} içeriği hakkında **Yorum Yaptı**`;
        
        visualHtml += `
            <div class="review-excerpt-overlay">
                <p>"${excerpt}"</p>
                <a href="#content/${details.content_type.toLowerCase()}/${content.id}" class="read-more-link">...daha fazlasını oku</a>
            </div>
            </div>
        `;
        
        footerHtml = `
            <div class="card-footer">
                <span class="like-count" data-review-id="${interactionObjectId}">${likesCount} Beğeni</span>
                <button class="action-btn like-review-btn ${likeButtonClass}" data-id="${interactionObjectId}" data-is-liked="${isLiked}">
                    ${likeButtonText}
                </button> 
                <button class="action-btn comment-review-btn" data-review-id="${interactionObjectId}">Yorum Yap</button>
            </div>
            ${repliesHtml} 
        `;

    } else if (activity.activity_type === 3) {
        actionText = `${cardContentLinkHtml} içeriğini **${details.list_name}** listesine ekledi.`;
        visualHtml += `</div>`;
        footerHtml = '';

    } else if (activity.activity_type === 4) { 
        const followedUserDetails = details?.followed_user; 
        const followedUser = followedUserDetails?.username;
        const followedUserId = followedUserDetails?.id;
        
        actionText = ` yeni bir kullanıcıyı takip etmeye başladı: <a href="#profile/${followedUserId}">@${followedUser}</a>`;
        visualHtml = '';
        footerHtml = '';
    }
    
    return `
        <div class="feed-card ${activityClass}">
            <div class="card-header">
                <img src="${userAvatar}" alt="${user} Avatar" class="user-avatar-small" />
                <span class="header-text">
                    <strong><a href="${userProfileLink}">${user}</a></strong> ${actionText}
                </span>
            </div>
            
            ${visualHtml}
            
            <small class="timestamp">${new Date(activity.created_at).toLocaleString()}</small>
            
            ${footerHtml}
        </div>
    `;
};

/**
 */
const setupFeedInteractions = () => {
    document.querySelectorAll('.like-review-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const interactionId = e.target.dataset.id;
            const isLiked = e.target.dataset.isLiked === 'true'; 
            const countElement = document.querySelector(`.like-count[data-review-id="${interactionId}"]`);
            
            if (!interactionId || interactionId === 'undefined') {
                alert('HATA: Beğenilecek aktivite ID\'si bulunamadı. Lütfen Backend/Serileştiriciyi kontrol edin.');
                return;
            }
            
            try {
                await fetchData(`reviews/${interactionId}/like/`, 'POST'); 
                
                let currentCount = parseInt(countElement.textContent.split(' ')[0]);
                
                if (isLiked) {
                    e.target.textContent = 'Beğen';
                    e.target.classList.remove('btn-liked');
                    e.target.classList.add('btn-default');
                    e.target.dataset.isLiked = 'false';
                    countElement.textContent = `${currentCount - 1} Beğeni`;
                } else {
                    e.target.textContent = 'Beğendin';
                    e.target.classList.remove('btn-default');
                    e.target.classList.add('btn-liked');
                    e.target.dataset.isLiked = 'true';
                    countElement.textContent = `${currentCount + 1} Beğeni`;
                }
                
            } catch (error) {
                alert(`Beğeni işlemi başarısız: ${error.message}`);
            }
        });
    });

    document.querySelectorAll('.comment-review-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const interactionId = e.target.dataset.reviewId;
            const card = e.target.closest('.feed-card');
            const isReview = card.classList.contains('activity-type-review');  
            const objectType = isReview ? 'Review' : 'Rating'; 
            
            openReplyModal(interactionId, objectType);
        });
    });
    document.getElementById('load-more-btn')?.addEventListener('click', loadMoreActivities);
};


const loadMoreActivities = async () => {
    const feedListElement = document.getElementById('feed-list');
    const loadMoreButton = document.getElementById('load-more-btn');
    
    if (!nextFeedUrl) {
        loadMoreButton.style.display = 'none';
        return;
    }
    
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = 'Yükleniyor...';
    
    try {
        const urlObj = new URL(nextFeedUrl);
        
        let apiPath = urlObj.pathname + urlObj.search; 
        
        if (apiPath.startsWith('/api/')) {
            apiPath = apiPath.substring(5); 
        }

        const response = await fetchData(apiPath); 
        
        const activities = response.results || [];
        
        let html = activities.map(createActivityCard).join('');
        feedListElement.insertAdjacentHTML('beforeend', html);
        
        nextFeedUrl = response.next;
        
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = 'Daha Fazla Yükle';
        
        if (!nextFeedUrl) {
            loadMoreButton.style.display = 'none';
        }
        
        setupFeedInteractions(); 

    } catch (error) {
        console.error("Daha fazla yüklenirken hata:", error);
        loadMoreButton.textContent = 'Yükleme Hatası';
        loadMoreButton.disabled = false;
    }
};

export const renderFeedPage = async (url = 'feed/') => { 
    mainContent.innerHTML = `
        <div class="feed-header">
            <h2>Sosyal Akışınız</h2>
            <p id="loading-status">Akış verileri yükleniyor...</p>
        </div>
        <div id="feed-list"></div>
        <div id="pagination-controls">
            <button id="load-more-btn" class="action-btn" style="display:none;">Daha Fazla Yükle</button>
        </div>
    `;
    const feedListElement = document.getElementById('feed-list');
    const loadingStatus = document.getElementById('loading-status');
    const loadMoreButton = document.getElementById('load-more-btn');

    try {
        const response = await fetchData(url);
        
        const activities = response.results || [];
        
        loadingStatus.style.display = 'none';
        
        if (activities.length === 0) { 
            feedListElement.innerHTML = '<p class="info-message">Akışınızda gösterilecek aktivite bulunamadı. Lütfen bazı kullanıcıları takip edin.</p>';
            loadMoreButton.style.display = 'none';
            return;
        }

        let html = activities.map(createActivityCard).join('');
        
        feedListElement.innerHTML = html;
        
        nextFeedUrl = response.next;

        if (nextFeedUrl) {
            loadMoreButton.style.display = 'block';
        }
        
        setupFeedInteractions(); 

    } catch (error) {
        console.error("Feed yüklenirken beklenmedik hata:", error);
        loadingStatus.textContent = `Akış yüklenirken hata oluştu: ${error.message}`;
        loadingStatus.style.display = 'block';
    }
};