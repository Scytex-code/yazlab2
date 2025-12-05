import { fetchData } from './api.js';

const mainContent = document.getElementById('main-content');

/**
 * @param {number} userId 
 */
export const renderProfilePage = async (userId) => {
    mainContent.innerHTML = `
        <div class="profile-header">
            <img id="profile-avatar" src="" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%;"> <h2 id="profile-name">Profil Yükleniyor...</h2>
        </div>
        <div id="profile-stats"></div>
        <p id="profile-bio"></p> <div id="follow-container"></div>
        <div id="profile-content">
            <h3>Son Aktivite</h3>
            <div id="activities-list">Aktiviteler yükleniyor...</div> 
        </div>
        <p id="profile-status"></p>
    `;

    const profileName = document.getElementById('profile-name');
    const profileStats = document.getElementById('profile-stats');
    const profileStatus = document.getElementById('profile-status');
    const followContainer = document.getElementById('follow-container'); 
    const profileAvatar = document.getElementById('profile-avatar');
    const profileBio = document.getElementById('profile-bio');
    
    if (!profileStatus || !profileName || !profileStats || !followContainer || !profileAvatar || !profileBio) {
        console.error("HATA: Ana profil elementleri (status, name, stats) DOM'da bulunamadı.");
        return;
    }

    try {
        const response = await fetchData(`profile/user/${userId}/`); 
        
        const userDetails = response.user_details || {}; 
        const stats = response.stats || { followers: 0, following: 0 }; 
        const profileStatusData = response.profile_status || { is_owner: false, is_following: false };

        const firstName = userDetails.first_name || 'İsimsiz';
        const lastName = userDetails.last_name || '';
        const username = userDetails.username || 'Kullanıcı'; 
        const email = userDetails.email || 'bilgi@yok';
        
        const bio = userDetails.bio || 'Kullanıcının henüz bir biyografisi yok.';
        const defaultAvatar = 'https://i.pinimg.com/736x/2c/47/d5/2c47d5dd5b532f83bb55c4cd6f5bd1ef.jpg';
        const avatarUrl = userDetails.avatar_url || defaultAvatar;

        profileName.textContent = `${firstName} ${lastName} (@${username})`;
        
        profileStats.innerHTML = `
            <p><strong>Takipçi:</strong> ${stats.followers} | <strong>Takip Edilen:</strong> ${stats.following}</p>
            <p><strong>E-posta:</strong> ${email}</p>
        `;
        
        profileAvatar.src = avatarUrl;
        profileBio.textContent = bio;

        renderFollowButton(userId, username, profileStatusData.is_owner, profileStatusData.is_following);
        
        await renderUserActivities(userId);

    } catch (error) {
        profileStatus.textContent = `Profil yüklenemedi: API isteği başarısız: ${error.message}`;
    }
};

/**
 * @param {number} targetUserId 
 * @param {string} targetUsername
 * @param {boolean} isOwner 
 * @param {boolean} isFollowing
 */
function renderFollowButton(targetUserId, targetUsername, isOwner, isFollowing) {
    const followContainer = document.getElementById('follow-container');
    
    if (isOwner) {
        followContainer.innerHTML = '<button onclick="window.location.hash=\'#profile/me/update\'">Profili Düzenle</button>';
        return;
    }

    const buttonText = isFollowing ? 'Takipten Çık' : 'Takip Et';
    followContainer.innerHTML = `<button id="follow-btn" class="${isFollowing ? 'unfollow-btn' : 'follow-btn'}">${buttonText}</button>`;
    
    document.getElementById('follow-btn')?.addEventListener('click', async () => {
        const method = isFollowing ? 'DELETE' : 'POST';
        const endpoint = 'follows/'; 
        const data = { following: targetUserId }; 

        try {
            if (method === 'POST') {
                await fetchData(endpoint, 'POST', data);
                alert(`@${targetUsername} kullanıcısı takip edildi!`); 
            } else {
                const followsList = await fetchData(endpoint); 
                
                const followToDelete = followsList.results.find(follow => {
                    return parseInt(follow.following) === parseInt(targetUserId); 
                });

                if (!followToDelete) {
                    alert("Takip kaydı bulunamadı. Zaten takibi bırakmış olabilirsiniz."); 
                    return; 
                }
                
                const followId = followToDelete.id;
                await fetchData(`follows/${followId}/`, 'DELETE', null);
                
                alert(`@${targetUsername} kullanıcısı takipten çıkarıldı!`); 
            }
            
            window.location.reload(); 

        } catch (error) {
            console.error("Takip/Takipten Çıkma Hatası:", error);
            alert(`İşlem başarısız: ${error.message}`);
        }
    });
}

/**
 * @param {number} userId 
 */
async function renderUserActivities(userId) {
    const activitiesListDiv = document.getElementById('activities-list');
    
    if (!activitiesListDiv) {
        console.error("Kritik Hata: 'activities-list' elementi bulunamadı.");
        return;
    }
    
    try {
        const activitiesResponse = await fetchData(`profile/user/${userId}/activities/`);
        const activities = activitiesResponse.results || []; 
        
        if (activities.length === 0) {
            activitiesListDiv.innerHTML = '<p>Bu kullanıcının henüz bir aktivitesi yok.</p>';
            return;
        }

        let htmlContent = '<ul>';
        activities.forEach(activity => {
            const details = activity.content_object_details;
            
            if (!details) {
                 htmlContent += `<li><strong>${activity.activity_type_display || 'Aktivite'}</strong>: İçerik bilgisi alınamadı.</li>`;
                 return;
            }
            
            const contentData = details.content_data || {};
            const contentType = details.content_type || 'unknown';

            const typeDisplay = activity.activity_type_display || 'Aktivite';

            const contentTitle = contentData.title || contentData.name || 'İçerik Başlığı Yok';
 
            const contentId = contentData.id || activity.object_id;

            let linkUrl = '';

            if (contentType === 'User') {
                 linkUrl = `profile/${contentId}`; 
            } else {
                 linkUrl = `content/${contentType.toLowerCase()}/${contentId}`;
            }

            htmlContent += `
                <li>
                    <strong>${typeDisplay}</strong>: 
                    <a href="#${linkUrl}">${contentTitle}</a> 
                    <span class="activity-date">(${new Date(activity.created_at).toLocaleString()})</span>
                </li>
            `;
        });
        htmlContent += '</ul>';
        
        activitiesListDiv.innerHTML = htmlContent;

    } catch (error) {
        console.error("Aktiviteler yüklenirken hata:", error);
        activitiesListDiv.innerHTML = `<p style="color: red;">Aktiviteler yüklenemedi: ${error.message}</p>`;
    }
}


const handleProfileUpdate = async (e, userId) => {
    e.preventDefault();
    const statusDiv = document.getElementById('update-status');
    statusDiv.textContent = 'Güncelleniyor...';
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        await fetchData(`profile/user/${userId}/`, 'PATCH', data);
        
        statusDiv.style.color = 'green';
        statusDiv.textContent = 'Profil başarıyla güncellendi!';
        
        setTimeout(() => {
             window.location.hash = `#profile/${userId}`;
        }, 1500);

    } catch (error) {
        statusDiv.style.color = 'red';
        const errorMessage = error.message.includes('JSON') ? JSON.stringify(error.data) : error.message;
        statusDiv.textContent = `Güncelleme başarısız: ${errorMessage}`;
    }
};

export const renderProfileUpdatePage = async (userId) => {
    mainContent.innerHTML = `
        <h2 class="form-title">Profil Bilgilerini Düzenle</h2>
        <form id="profile-update-form" class="auth-form">
            <div id="update-status" style="color: red; margin-bottom: 15px;"></div>
            
            <label for="update-avatar-url">Avatar URL:</label>
            <input type="url" id="update-avatar-url" name="avatar_url"> 
            
            <label for="update-first-name">Adınız:</label>
            <input type="text" id="update-first-name" name="first_name" required>

            <label for="update-last-name">Soyadınız:</label>
            <input type="text" id="update-last-name" name="last_name" required>

            <label for="update-email">E-posta:</label>
            <input type="email" id="update-email" name="email" required>
            
            <label for="update-username">Kullanıcı Adı:</label>
            <input type="text" id="update-username" name="username" required>
            
            <label for="update-bio">Biyografi:</label>
            <textarea id="update-bio" name="bio" rows="4"></textarea> <button type="submit" id="update-submit-btn">Kaydet ve Güncelle</button>
            <button type="button" onclick="window.location.hash='#profile/${userId}'" class="back-btn">İptal</button>
        </form>
    `;

    const statusDiv = document.getElementById('update-status');
    const form = document.getElementById('profile-update-form');

    try {
        const response = await fetchData(`profile/user/${userId}/`);
        const userDetails = response.user_details || {};

        document.getElementById('update-first-name').value = userDetails.first_name || '';
        document.getElementById('update-last-name').value = userDetails.last_name || '';
        document.getElementById('update-email').value = userDetails.email || '';
        document.getElementById('update-username').value = userDetails.username || '';
        document.getElementById('update-bio').value = userDetails.bio || ''; 
        document.getElementById('update-avatar-url').value = userDetails.avatar_url || '';

        form.addEventListener('submit', (e) => handleProfileUpdate(e, userId));

    } catch (error) {
        statusDiv.textContent = `Mevcut profil bilgileri yüklenemedi: ${error.message}`;
    }
};