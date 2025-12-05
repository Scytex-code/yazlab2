import { fetchData } from './api.js';
import { openListModal } from './library.js';
import { getUserId } from './auth.js';

const mainContent = document.getElementById('main-content');

/**
 * @param {object} content 
 * @param {string} type 
 */
const createContentCard = (content, type) => {
    const coverUrl = content.poster_path || content.cover_url || 'placeholder.png';

    const creator = type.toLowerCase() === 'book' ? content.authors : content.director_name; 
    const creatorDisplay = creator || 'Bilinmiyor';

    return `
        <div class="content-card">
            <img src="${coverUrl}" alt="${content.title} Kapak" onerror="this.onerror=null;this.src='placeholder.png';" />
            <h3><a href="#content/${type.toLowerCase()}/${content.id}">${content.title}</a></h3>
            <p>${type.toLowerCase() === 'book' ? 'Yazar' : 'Yönetmen'}: ${creatorDisplay}</p>
        </div>
    `;
};

export const renderSearchPage = async (query) => {
    mainContent.innerHTML = `
        <h2>"${query}" için Arama Sonuçları</h2>
        <p id="search-status">Arama yapılıyor...</p>
        <div id="search-results" class="content-grid"></div>
    `;
    const searchStatus = document.getElementById('search-status');
    const searchResults = document.getElementById('search-results');

    try {
        const results = await fetchData(`search/?q=${encodeURIComponent(query)}`); 
        
        searchStatus.style.display = 'none';

        if (results.length === 0) {
            searchResults.innerHTML = '<p class="info-message">Arama sonucunda içerik bulunamadı.</p>';
            return;
        }

        let html = results.map(item => createContentCard(item, item.content_type)).join('');
        searchResults.innerHTML = html;

    } catch (error) {
        searchStatus.textContent = `Arama başarısız: ${error.message}`;
    }
};

export const renderContentDetailPage = async (contentType, contentId) => {
    mainContent.innerHTML = `
        <h2 id="content-title">İçerik Yükleniyor...</h2>
        <div id="content-details"></div>
        <div id="user-interaction"></div>
        <div id="reviews-section"><h3>Yorumlar ve Puanlar</h3><div id="review-list"></div></div>
    `;

    try {
        const details = await fetchData(`content/${contentType}/${contentId}/`);
        
        const titleElement = document.getElementById('content-title');
        titleElement.textContent = details.title || 'Detay Sayfası';

        let extraInfo = '';
        if (contentType.toLowerCase() === 'movie') {
            const director = details.director_name || 'Bilinmiyor';
            const actors = details.actors_list || 'Yok';
            const genres = details.genres_list || 'Yok';

            extraInfo = `
                <p><strong>Yönetmen:</strong> ${director}</p>
                <p><strong>Oyuncular:</strong> ${actors.split(',').slice(0, 3).join(', ')}</p>
                <p><strong>Türler:</strong> ${genres}</p>
                <p><strong>Yayın Tarihi:</strong> ${details.release_date || 'Bilinmiyor'}</p>
            `;
        } else if (contentType.toLowerCase() === 'book') {
             const authors = details.authors || 'Bilinmiyor';
             const pages = details.page_count || 'Bilinmiyor';
             
             const bookYear = details.publication_year || 'Bilinmiyor';
             const bookGenres = details.genres_list || 'Yok';

             extraInfo = `
                <p><strong>Yazarlar:</strong> ${authors}</p>
                <p><strong>Türler:</strong> ${bookGenres}</p>
                <p><strong>Yayın Yılı:</strong> ${bookYear}</p>
                <p><strong>Sayfa Sayısı:</strong> ${pages}</p>
             `;
        }

        document.getElementById('content-details').innerHTML = `
            <div class="content-header-layout">
                <div class="content-image">
                    <img 
                        src="${details.cover_url || details.poster_path || 'placeholder.png'}" 
                        alt="${details.title} Kapak"
                        onerror="this.onerror=null;this.src='placeholder.png';"
                    />
                </div>
                <div class="content-info">
                    ${extraInfo} 
                    <p><strong>Özet:</strong> ${details.overview || details.description}</p>
                    <p><strong>Ortalama Puan:</strong> ${details.average_score ? details.average_score.toFixed(2) : 'Puanlanmamış'}</p>
                </div>
            </div>
        `;

        const interactionElement = document.getElementById('user-interaction');
        interactionElement.innerHTML = renderInteractionArea(details, contentType); 
        
        renderReviews(details.reviews, details.content_type_id, details.id);

    } catch (error) {
        mainContent.innerHTML = `<h2>Hata</h2><p>İçerik yüklenemedi: API isteği başarısız: ${error.message}</p>`;
    }
};

const renderInteractionArea = (details, contentType) => { 
    const userScore = details.user_score; 
    
    let interactionHtml = `
        <h4>Puan Verin</h4>
        <form id="rating-form">
            <select id="score" required>
                ${Array.from({ length: 10 }, (_, i) => i + 1).map(s => 
                    `<option value="${s}" ${userScore === s ? 'selected' : ''}>${s} Puan</option>`
                ).join('')}
            </select>
            <button type="submit">${userScore ? 'Puanı Güncelle' : 'Puan Ver'}</button>
            <p id="rating-status" class="status-message"></p>
        </form>
        
        <h4>Listeye Ekle</h4>
        <div id="list-add-container">
            <button id="add-to-list-btn">Listelerimi Görüntüle / Ekle</button>
            <p id="list-status" class="status-message"></p>
        </div>
    `;

    setTimeout(() => {
        setupRatingForm(details, contentType); 
        setupReviewForm(details, contentType); 

        document.getElementById('add-to-list-btn')?.addEventListener('click', () => {
            openListModal(contentType, details.id); 
        });

    }, 0); 

    return interactionHtml;
};

const setupRatingForm = (details, contentType) => { 
    document.getElementById('rating-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const score = parseInt(e.target.score.value);
        const statusElement = document.getElementById('rating-status');

        try {
            await fetchData('ratings/', 'POST', {
                score: score,
                content_type: contentType.toLowerCase(), 
                object_id: parseInt(details.id) 
            });
            statusElement.textContent = 'Puan başarıyla kaydedildi!';
            statusElement.style.color = 'green';
            window.location.reload(); 
        } catch (error) {
            statusElement.textContent = `Puanlama hatası: ${error.message}`;
            statusElement.style.color = 'red';
        }
    });
};

const renderReviews = (reviews, contentTypeId, objectId) => {
    const reviewListElement = document.getElementById('review-list');
    
    const currentUserId = getUserId(); 
    
    let formHtml = `
        <h4>Yeni Yorum Yap</h4>
        <form id="review-form">
            <textarea id="review-text" placeholder="Yorumunuzu buraya yazın..." required></textarea>
            <button type="submit">Yorum Gönder</button>
            <p id="review-status" class="status-message"></p>
        </form>
        <hr>
    `;

    const safeReviews = reviews || []; 

    const reviewHtml = safeReviews.map(review => {
        const isOwner = currentUserId && (currentUserId === review.user.id);
        
        return `
            <div class="review-item" data-review-id="${review.id}">
                <strong><a href="#profile/${review.user.id}">${review.user.username}</a>:</strong>
                <p id="review-text-${review.id}">${review.text}</p>
                <small>${new Date(review.created_at).toLocaleString()}</small>
                
                ${isOwner ? `
                    <div class="review-actions">
                        <button class="edit-review-btn" data-id="${review.id}">Düzenle</button>
                        <button class="delete-review-btn" data-id="${review.id}">Sil</button>
                    </div>
                    <form id="edit-form-${review.id}" class="edit-review-form" style="display:none;">
                        <textarea id="edit-text-${review.id}" required>${review.text}</textarea>
                        <button type="submit">Kaydet</button>
                        <button type="button" class="cancel-edit-btn" data-id="${review.id}">İptal</button>
                        <p id="edit-status-${review.id}" class="status-message"></p>
                    </form>
                ` : ''}
            </div>
        `;
    }).join('') || '<p>Bu içerik için henüz yorum yapılmamış.</p>';

    reviewListElement.innerHTML = formHtml + reviewHtml;
    
    setupReviewActions();
};

const setupReviewForm = (details, contentType) => { 
    document.getElementById('review-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = e.target.querySelector('#review-text').value;
        const statusElement = document.getElementById('review-status');

        try {
            await fetchData('reviews/', 'POST', { 
                text: text,
                content_type: contentType.toLowerCase(), 
                object_id: parseInt(details.id) 
            });
            statusElement.textContent = 'Yorumunuz başarıyla gönderildi!';
            statusElement.style.color = 'green';
            window.location.reload(); 
        } catch (error) {
            statusElement.textContent = `Yorum gönderme hatası: ${error.message}`;
            statusElement.style.color = 'red';
        }
    });
};


const setupReviewActions = () => {
    document.querySelectorAll('.delete-review-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const reviewId = e.target.dataset.id;
            if (confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
                try {
                    await fetchData(`reviews/${reviewId}/`, 'DELETE'); 
                    alert('Yorum başarıyla silindi.');
                    window.location.reload(); 
                } catch (error) {
                    alert(`Silme hatası: ${error.message}`);
                }
            }
        });
    });

    document.querySelectorAll('.edit-review-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const reviewId = e.target.dataset.id;
            const textElement = document.getElementById(`review-text-${reviewId}`);
            const editForm = document.getElementById(`edit-form-${reviewId}`);
            
            textElement.style.display = 'none';
            editForm.style.display = 'block';
        });
    });
    
    document.querySelectorAll('.cancel-edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const reviewId = e.target.dataset.id;
            const textElement = document.getElementById(`review-text-${reviewId}`);
            const editForm = document.getElementById(`edit-form-${reviewId}`);
            
            textElement.style.display = 'block';
            editForm.style.display = 'none';
        });
    });


    document.querySelectorAll('.edit-review-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reviewId = form.id.replace('edit-form-', '');
            const newText = document.getElementById(`edit-text-${reviewId}`).value;
            const statusElement = document.getElementById(`edit-status-${reviewId}`);

            try {
                await fetchData(`reviews/${reviewId}/`, 'PATCH', {
                    text: newText 
                });
                statusElement.textContent = 'Yorum başarıyla güncellendi!';
                statusElement.style.color = 'green';
                window.location.reload(); 
            } catch (error) {
                statusElement.textContent = `Güncelleme hatası: ${error.message}`;
                statusElement.style.color = 'red';
            }
        });
    });
};

/**
 * @param {object} currentFilters
 */
const renderFilterControls = (currentFilters = {}) => {
    const genres = [
        "Aksiyon", "Macera", "Bilim Kurgu", "Fantastik", "Romantik", 
        "Drama", "Korku", "Komedi", "Suç", "Gizem", "Gerilim", 
        "Tarih", "Biyografi", "Savaş", "Müzikal", "Animasyon", 
        "Belgesel", "Western", "Aile"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 20 }, (_, i) => currentYear - i);

    return `
        <div class="filter-controls-container">
            <h3>Filtreleme & Keşif</h3>
            <form id="discovery-filter-form">
                
                <label for="filter-type">Vitrin:</label>
                <select id="filter-type">
                    <option value="top_rated" ${currentFilters.type === 'top_rated' ? 'selected' : ''}>⭐ En Yüksek Puanlılar</option>
                    <option value="popular" ${currentFilters.type === 'popular' ? 'selected' : ''}>🔥 En Popülerler</option>
                </select>
                <button type="submit" data-action="discover">Göster</button>

                <h4>Gelişmiş Filtreler</h4>
                <div class="advanced-filters">
                    <label for="filter-genre">Tür:</label>
                    <select id="filter-genre">
                        <option value="" ${!currentFilters.genre ? 'selected' : ''}>Tüm Türler</option>
                        ${genres.map(g => `<option value="${g.toLowerCase()}" ${currentFilters.genre === g.toLowerCase() ? 'selected' : ''}>${g}</option>`).join('')}
                    </select>

                    <label for="filter-year">Yıl:</label>
                    <select id="filter-year">
                        <option value="" ${!currentFilters.year ? 'selected' : ''}>Tüm Yıllar</option>
                        ${years.map(y => `<option value="${y}" ${currentFilters.year == y ? 'selected' : ''}>${y}</option>`).join('')}
                    </select>
                    
                    <label for="filter-min-score">Min. Puan (0-10):</label>
                    <input type="number" id="filter-min-score" min="0" max="10" value="${currentFilters.min_score || ''}" placeholder="Min Puan">
                </div>
                <button type="submit" data-action="filter">Filtrele</button>
            </form>
        </div>
        <hr>
    `;
};


/**
 * @param {string} mode 
 * @param {object} filters
 */
export const renderDiscoverPage = async (mode = 'discover', filters = {}) => {
    mainContent.innerHTML = `
        <h2>İçerik Keşfet</h2>
        ${renderFilterControls(filters)}
        <div id="discovery-results" class="content-grid">
            <p id="discovery-status">İçerikler yükleniyor...</p>
        </div>
    `;

    const statusElement = document.getElementById('discovery-status');
    const resultsElement = document.getElementById('discovery-results');

    let apiUrl = '';
    
    if (mode === 'discover') {
        const type = filters.type || 'popular';
        apiUrl = `discover/?type=${type}`;
    } else if (mode === 'filter') {
        let queryParams = new URLSearchParams();
        if (filters.genre) queryParams.append('genre', filters.genre);
        if (filters.min_score) queryParams.append('min_score', filters.min_score);
        if (filters.year) queryParams.append('year', filters.year);
        
        if (queryParams.toString().length === 0) {
             statusElement.textContent = "Lütfen en az bir filtre seçin.";
             resultsElement.innerHTML = ''; 
             return;
        }

        apiUrl = `filter/?${queryParams.toString()}`;
    }
    
    try {
        const response = await fetchData(apiUrl);
        
        statusElement.style.display = 'none';

        if (response.length === 0) {
            resultsElement.innerHTML = '<p class="info-message">Filtrelerinizle eşleşen içerik bulunamadı.</p>';
            
        } else {
            const html = response.map(item => createContentCard(item, item.content_type)).join('');
            resultsElement.innerHTML = html;
        }


    } catch (error) {
        resultsElement.innerHTML = '<p class="error-message">İçerik yüklenemedi. Sunucu hatası oluştu.</p>';
        statusElement.textContent = `Hata: ${error.message}`;
        statusElement.style.display = 'block';
        console.error("Discovery Hata:", error);
    }
    
    document.getElementById('discovery-filter-form')?.addEventListener('submit', handleDiscoveryFormSubmit);
};


const handleDiscoveryFormSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const action = e.submitter.dataset.action; 

    let filters = {};
    
    if (action === 'discover') {
        filters.type = form.querySelector('#filter-type').value;
        window.location.hash = `#discover?type=${filters.type}`;
    } else if (action === 'filter') {
        filters = {
            genre: form.querySelector('#filter-genre').value,
            year: form.querySelector('#filter-year').value,
            min_score: form.querySelector('#filter-min-score').value,
        };
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });
        
        const queryParams = new URLSearchParams(filters).toString();
        
        if (queryParams.length > 0) {
             window.location.hash = `#discover?${queryParams}`;
        } else {
             window.location.hash = `#discover`; 
        }
    }
};