import { fetchData } from './api.js';

const mainContent = document.getElementById('main-content');

// --- YARDIMCI MODAL VE REPLY FONKSİYONLARI ---

/**
 * Yanıt dizisini (replies array) HTML listesine çevirir.
 * @param {Array<object>} replies 
 * @returns {string} HTML listesi
 */
const renderReplies = (replies) => {
    if (!replies || replies.length === 0) {
        return ''; 
    }
    
    const replyItems = replies.map(reply => {
        return `
            <div class="reply-item">
                <strong><a href="#profile/${reply.user.id}">${reply.user.username}</a>:</strong>
                <span>${reply.text}</span>
                <small>(${new Date(reply.created_at).toLocaleTimeString()})</small>
            </div>
        `;
    }).join('');
    
    return `<div class="replies-container">${replyItems}</div>`;
};


/**
 * Review veya Rating objesine yanıt göndermek için modal açar.
 * (Bu kısım, form submission mantığı için gereklidir.)
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
 * Yanıt gönderme formunu işler ve API'a POST isteği gönderir.
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
            content_type: objectType // 'review' veya 'rating'
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

// --- ANA KART OLUŞTURMA FONKSİYONU ---

const createActivityCard = (activity) => {
    const user = activity.user.username;
    const userProfileLink = `#profile/${activity.user.id}`;
    const details = activity.content_object_details;
    
    const interactionObjectId = activity.object_id; 
    
    let content = null;
    let reviewDetails = null;
    let actionHtml = '';
    let visualHtml = '';
    let footerHtml = '';
    let cardContentLink = '';
    let repliesHtml = ''; // Yanıtları tutacak yeni değişken

    // Detayları aktivite tipine göre ayırıyoruz
    if (activity.activity_type === 2) { // Yorum Aktivitesi (Review)
        reviewDetails = details?.review_details;
        content = reviewDetails?.content_data || details?.content_data; 
        repliesHtml = renderReplies(reviewDetails?.replies); // ⭐ YANITLARI ÇEK
    } else if (activity.activity_type === 1) { // Puanlama Aktivitesi (Rating)
        content = details?.content_data;
        repliesHtml = renderReplies(details?.replies); // ⭐ YANITLARI ÇEK
    } else if (activity.activity_type === 3) {
        content = details?.content_data;
    }
    
    // Geçersiz aktiviteyi atla
    if (!details || (!interactionObjectId && activity.activity_type !== 4)) {
        return '';
    }

    // Görsel ve İçerik Linki Hazırlığı
    if (content && content.id) { 
        const coverUrl = content.poster_path || content.cover_url || 'placeholder.png';
        const contentType = details.content_type.toLowerCase();
        const contentDetailLink = `#content/${contentType}/${content.id}`;
        
        cardContentLink = `<a href="${contentDetailLink}"><strong>${content.title}</strong></a>`;
        
        visualHtml = `
            <div class="activity-visual">
                <a href="${contentDetailLink}">
                    <img src="${coverUrl}" alt="${content.title} Kapak" onerror="this.onerror=null;this.src='placeholder.png';" />
                </a>
        `;
    }
    
    // --- Aktivite Tipine Göre İçerik Oluşturma ---
    
    // 1. Puanlama Aktivitesi (Rating - Tip 1)
    if (activity.activity_type === 1) {
        if (!content || !content.id) return '';
        
        const score = details.score;
        actionHtml = `${cardContentLink} içeriğine **Puan Verdi**`;
        
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
                <small>Puan: ${score}/10</small> 
                <span class="like-count" data-review-id="${interactionObjectId}">${likesCount} Beğeni</span>
                <button class="action-btn like-review-btn ${likeButtonClass}" data-id="${interactionObjectId}" data-is-liked="${isLiked}">
                    ${likeButtonText}
                </button> 
                <button class="action-btn comment-review-btn" data-review-id="${interactionObjectId}">Yorum Yap</button>
            </div>
            ${repliesHtml} `;

    // 2. Yorumlama Aktivitesi (Review - Tip 2)
    } else if (activity.activity_type === 2) {
        if (!reviewDetails || !content || !content.id) return ''; 
        
        const fullText = reviewDetails.text || details.review_excerpt;
        const excerpt = fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText;
        
        const likesCount = reviewDetails.likes_count || 0;
        const isLiked = reviewDetails.is_liked || false;
        const likeButtonClass = isLiked ? 'btn-liked' : 'btn-default';
        const likeButtonText = isLiked ? 'Beğendin' : 'Beğen';

        actionHtml = `${cardContentLink} içeriği hakkında **Yorum Yaptı**`;
        
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
            ${repliesHtml} `;

    // 3. Listeye Ekleme Aktivitesi (List_Add - Tip 3)
    } else if (activity.activity_type === 3) {
         if (!content || !content.id) return '';
         
        actionHtml = `${cardContentLink} içeriğini **${details.list_name}** listesine ekledi.`;
        visualHtml += `</div>`; 
        footerHtml = '';

    // 4. Takip Aktivitesi (Follow - Tip 4)
    } else if (activity.activity_type === 4) {
        const followedUserDetails = details?.followed_user; 
        
        if (followedUserDetails && followedUserDetails.id) {
            const followedUser = followedUserDetails.username;
            const followedUserId = followedUserDetails.id;
            
            actionHtml = ` yeni bir kullanıcıyı takip etmeye başladı: <a href="#profile/${followedUserId}">@${followedUser}</a>`;
        } else {
            actionHtml = ` yeni bir kullanıcıyı takip etmeye başladı.`;
        }
        
        visualHtml = ''; 
        footerHtml = '';
    }
    
    // Ana kart yapısı
    return `
        <div class="feed-card activity-type-${activity.activity_type}">
            <div class="card-header">
                <strong><a href="${userProfileLink}">${user}</a></strong> ${actionHtml}
            </div>
            
            ${visualHtml}
            
            <small class="timestamp">${new Date(activity.created_at).toLocaleString()}</small>
            
            ${footerHtml}
        </div>
    `;
};

// --- ANA YÜKLEME VE ETKİLEŞİM FONKSİYONLARI ---

/**
 * Yorum beğenme (Like) ve yorum yapma (Comment) olaylarını API'a bağlar.
 */
const setupFeedInteractions = () => {
    // 1. Yorum Beğenme (Like Review/Rating) İşlemi
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

    // 2. Yorum Yapma İşlemi (Modalı Açma)
    document.querySelectorAll('.comment-review-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const interactionId = e.target.dataset.reviewId;
            
            const card = e.target.closest('.feed-card');
            const isReview = card.classList.contains('activity-type-2'); 
            
            const objectType = isReview ? 'Review' : 'Rating'; 
            
            openReplyModal(interactionId, objectType);
        });
    });
};

export const renderFeedPage = async () => {
    mainContent.innerHTML = `
        <div class="feed-header">
            <h2>Sosyal Akışınız</h2>
            <p id="loading-status">Akış verileri yükleniyor...</p>
        </div>
        <div id="feed-list"></div>
    `;
    const feedListElement = document.getElementById('feed-list');
    const loadingStatus = document.getElementById('loading-status');

    try {
        const response = await fetchData('feed/');
        
        const activities = response.results || [];
        
        loadingStatus.style.display = 'none';
        
        if (activities.length === 0) { 
            feedListElement.innerHTML = '<p class="info-message">Akışınızda gösterilecek aktivite bulunamadı. Lütfen bazı kullanıcıları takip edin.</p>';
            return;
        }

        let html = activities.map(createActivityCard).join('');
        
        feedListElement.innerHTML = html;
        
        setupFeedInteractions(); 

    } catch (error) {
        console.error("Feed yüklenirken beklenmedik hata:", error);
        loadingStatus.textContent = `Akış yüklenirken hata oluştu: ${error.message}`;
        loadingStatus.style.display = 'block';
    }
};